import { supabase } from '@/lib/supabase'
import type { Contractor } from '@/types/database'

export const contractorService = {
  async getAll() {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('name')
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
    payment_method?: string
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('contractors')
      .insert(contractor)
      .select()
      .single()
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

    const items = (itemsRes.data || []) as any[]
    const projects = (projectsRes.data || []) as any[]
    const cubications = (cubicationsRes.data || []) as any[]

    const projectMap = Object.fromEntries(projects.map((p: any) => [p.id, p]))

    const enrichedItems = items.map((item) => ({
      ...item,
      project: item.payroll_period ? projectMap[item.payroll_period.project_id] ?? null : null,
    }))

    return { items: enrichedItems, cubications, projectMap }
  },
}
