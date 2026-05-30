import { supabase } from '@/lib/supabase'
import type { Contractor, Project, LaborLineItem, PayrollPeriod } from '@/types/database'

interface LaborItemWithPeriod extends LaborLineItem {
  payroll_period?: PayrollPeriod & { project_id: string }
}

interface CubicationRow {
  id: string
  contractor_id: string
  [key: string]: unknown
}

export const contractorService = {
  async getAll() {
    const { data, error } = await supabase.from('contractors').select('*').order('name')
    if (error) throw error
    return data as Contractor[]
  },

  async create(contractor: {
    name: string
    specialty?: string
    cedula?: string
    phone?: string
    bank_account?: string
    bank_name?: string
    payment_method?: 'cash' | 'check' | 'transfer'
    notes?: string
  }) {
    const { data, error } = await supabase.from('contractors').insert(contractor).select().single()
    if (error) throw error
    return data as Contractor
  },

  async update(id: string, updates: Partial<Contractor>) {
    const { data, error } = await supabase
      .from('contractors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Contractor
  },

  async toggleActive(id: string, is_active: boolean) {
    return this.update(id, { is_active })
  },

  async getHistory(contractorId: string) {
    const [itemsRes, projectsRes, cubicationsRes] = await Promise.all([
      supabase
        .from('labor_line_items')
        .select('*, payroll_period:payroll_periods(id, period_number, report_date, status, project_id, grand_total)')
        .eq('contractor_id', contractorId),
      supabase.from('projects').select('id, name, code, location'),
      supabase.from('contract_cubications').select('*').eq('contractor_id', contractorId),
    ])

    if (itemsRes.error) throw itemsRes.error
    if (projectsRes.error) throw projectsRes.error
    if (cubicationsRes.error) throw cubicationsRes.error

    const items = (itemsRes.data || []) as LaborItemWithPeriod[]
    const projects = (projectsRes.data || []) as Project[]
    const cubications = (cubicationsRes.data || []) as CubicationRow[]

    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]))

    const enrichedItems = items.map((item) => ({
      ...item,
      project: item.payroll_period ? (projectMap[item.payroll_period.project_id] ?? null) : null,
    }))

    return { items: enrichedItems, cubications, projectMap }
  },
}
