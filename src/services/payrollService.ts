import { supabase } from '@/lib/supabase'
import type {
  PayrollPeriod,
  LaborLineItem,
  MaterialInvoice,
  IndirectCost,
  PayrollStatus,
} from '@/types/database'

export const payrollService = {
  // === PAYROLL PERIODS ===

  async getPeriods(projectId: string) {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('project_id', projectId)
      .order('period_number', { ascending: false })
    if (error) throw error
    return data as PayrollPeriod[]
  },

  async getAllPeriods() {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*, project:projects(id, name, code)')
      .order('period_number', { ascending: false })
    if (error) throw error
    return data as PayrollPeriod[]
  },

  async getPeriodDetail(periodId: string) {
    const [periodRes, laborRes, materialsRes, indirectRes] = await Promise.all([
      supabase.from('payroll_periods').select('*, project:projects(*, company:companies(*))').eq('id', periodId).single(),
      supabase.from('labor_line_items').select('*, contractor:contractors(*)').eq('payroll_period_id', periodId).order('sort_order'),
      supabase.from('material_invoices').select('*, supplier:suppliers(*)').eq('payroll_period_id', periodId),
      supabase.from('indirect_costs').select('*').eq('payroll_period_id', periodId),
    ])
    if (periodRes.error) throw periodRes.error
    return {
      period: periodRes.data as PayrollPeriod,
      laborItems: (laborRes.data || []) as LaborLineItem[],
      materialInvoices: (materialsRes.data || []) as MaterialInvoice[],
      indirectCosts: (indirectRes.data || []) as IndirectCost[],
    }
  },

  async createPeriod(period: {
    project_id: string
    period_number: number
    report_date: string
    reported_by?: string
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('payroll_periods')
      .insert({ ...period, status: 'draft' })
      .select()
      .single()
    if (error) throw error
    return data as PayrollPeriod
  },

  async getNextPeriodNumber(projectId: string) {
    const { data } = await supabase
      .from('payroll_periods')
      .select('period_number')
      .eq('project_id', projectId)
      .order('period_number', { ascending: false })
      .limit(1)
    return (data?.[0]?.period_number || 0) + 1
  },

  async getDraftPeriod(projectId: string): Promise<PayrollPeriod | null> {
    const { data } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['draft', 'submitted'])
      .limit(1)
    return (data?.[0] as PayrollPeriod) ?? null
  },

  async updatePeriodStatus(id: string, status: PayrollStatus) {
    const updates: Record<string, unknown> = { status }
    if (status === 'approved') updates.approved_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('payroll_periods')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PayrollPeriod
  },

  async updatePeriodTotals(id: string, totals: {
    total_labor: number
    total_materials: number
    total_indirect: number
    grand_total: number
  }) {
    const { error } = await supabase
      .from('payroll_periods')
      .update(totals)
      .eq('id', id)
    if (error) throw error
  },

  async deletePeriod(id: string) {
    const { error } = await supabase
      .from('payroll_periods')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async duplicatePeriod(sourcePeriodId: string, projectId: string): Promise<PayrollPeriod> {
    const draft = await this.getDraftPeriod(projectId)
    if (draft) throw new Error(`Ya existe el Reporte No. ${draft.period_number} en borrador. Concluye ese reporte antes de duplicar.`)

    const { laborItems, materialInvoices } = await this.getPeriodDetail(sourcePeriodId)
    const nextNum = await this.getNextPeriodNumber(projectId)

    const newPeriod = await this.createPeriod({
      project_id: projectId,
      period_number: nextNum,
      report_date: new Date().toISOString().split('T')[0],
    })

    if (laborItems.length > 0) {
      const laborRows = laborItems.map((item, i) => ({
        payroll_period_id: newPeriod.id,
        contractor_id: item.contractor_id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        is_advance: item.is_advance,
        is_advance_deduction: item.is_advance_deduction,
        sort_order: i + 1,
        notes: item.notes,
      }))
      await supabase.from('labor_line_items').insert(laborRows)
    }

    if (materialInvoices.length > 0) {
      const matRows = materialInvoices.map((inv) => ({
        payroll_period_id: newPeriod.id,
        supplier_id: inv.supplier_id,
        description: inv.description,
        invoice_reference: inv.invoice_reference,
        amount: inv.amount,
        budget_category_id: inv.budget_category_id,
        notes: inv.notes,
      }))
      await supabase.from('material_invoices').insert(matRows)
    }

    return newPeriod
  },

  // === LABOR LINE ITEMS ===

  async addLaborItem(item: {
    payroll_period_id: string
    contractor_id: string
    description: string
    quantity: number
    unit: string
    unit_price: number
    is_advance?: boolean
    is_advance_deduction?: boolean
    sort_order?: number
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('labor_line_items')
      .insert(item)
      .select('*, contractor:contractors(*)')
      .single()
    if (error) throw error
    return data as LaborLineItem
  },

  async updateLaborItem(id: string, updates: {
    description?: string
    quantity?: number
    unit?: string
    unit_price?: number
    is_advance?: boolean
    is_advance_deduction?: boolean
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('labor_line_items')
      .update(updates)
      .eq('id', id)
      .select('*, contractor:contractors(*)')
      .single()
    if (error) throw error
    return data as LaborLineItem
  },

  async deleteLaborItem(id: string) {
    const { error } = await supabase
      .from('labor_line_items')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // === MATERIAL INVOICES ===

  async addMaterialInvoice(invoice: {
    payroll_period_id: string
    supplier_id: string
    description: string
    invoice_reference?: string
    amount: number
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('material_invoices')
      .insert(invoice)
      .select('*, supplier:suppliers(*)')
      .single()
    if (error) throw error
    return data as MaterialInvoice
  },

  async updateMaterialInvoice(id: string, updates: {
    description?: string
    supplier_id?: string
    invoice_reference?: string
    amount?: number
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('material_invoices')
      .update(updates)
      .eq('id', id)
      .select('*, supplier:suppliers(*)')
      .single()
    if (error) throw error
    return data as MaterialInvoice
  },

  async deleteMaterialInvoice(id: string) {
    const { error } = await supabase
      .from('material_invoices')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // === INDIRECT COSTS ===

  async saveIndirectCosts(periodId: string, costs: {
    type: string
    description: string
    percentage?: number
    base_amount?: number
    calculated_amount: number
    fixed_amount?: number
  }[]) {
    await supabase.from('indirect_costs').delete().eq('payroll_period_id', periodId)
    if (costs.length === 0) return []
    const rows = costs.map((c) => ({ ...c, payroll_period_id: periodId }))
    const { data, error } = await supabase
      .from('indirect_costs')
      .insert(rows)
      .select()
    if (error) throw error
    return data as IndirectCost[]
  },

  // === FILE ATTACHMENTS ===

  async uploadInvoiceFile(file: File, periodId: string) {
    const ext = file.name.split('.').pop()
    const path = `invoices/${periodId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('attachments')
      .upload(path, file)
    if (error) throw error
    return path
  },
}
