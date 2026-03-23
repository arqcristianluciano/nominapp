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
