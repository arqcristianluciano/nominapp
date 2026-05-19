import { supabase } from '@/lib/supabase'
import { COMMITTED_PAYROLL_STATUSES } from '@/services/payrollService'

export interface CompanyKPI {
  company_id: string
  company_name: string
  rnc: string | null
  projects_count: number
  active_projects: number
  total_budget: number
  total_actual: number
  variance: number
  variance_pct: number
}

export interface ProjectKPI {
  project_id: string
  project_name: string
  project_code: string
  company_id: string
  company_name: string
  status: string
  total_budget: number
  total_actual: number
  variance: number
  variance_pct: number
  cxp_pending: number
  pending_requisitions: number
  low_stock_items: number
}

export const directorService = {
  // KPIs consolidados por proyecto (vista del Director General).
  async getProjectKPIs(): Promise<ProjectKPI[]> {
    const [
      { data: projects },
      { data: categories },
      { data: payrolls },
      { data: transactions },
      { data: requisitions },
      { data: items },
    ] = await Promise.all([
      supabase.from('projects').select('*, company:companies(id, name, rnc)'),
      supabase.from('budget_categories').select('project_id, budgeted_amount'),
      supabase.from('payroll_periods').select('project_id, grand_total, status').in('status', COMMITTED_PAYROLL_STATUSES),
      supabase.from('transactions').select('project_id, total, payment_condition'),
      supabase.from('purchase_requisitions').select('project_id, status'),
      supabase.from('inventory_items').select('project_id, current_stock, min_stock'),
    ])

    const budgetByProject = new Map<string, number>()
    for (const cat of (categories ?? []) as Array<{ project_id: string; budgeted_amount: number | null }>) {
      budgetByProject.set(
        cat.project_id,
        (budgetByProject.get(cat.project_id) ?? 0) + Number(cat.budgeted_amount ?? 0),
      )
    }

    const actualByProject = new Map<string, number>()
    for (const p of (payrolls ?? []) as Array<{ project_id: string; grand_total: number | null }>) {
      actualByProject.set(
        p.project_id,
        (actualByProject.get(p.project_id) ?? 0) + Number(p.grand_total ?? 0),
      )
    }
    for (const t of (transactions ?? []) as Array<{ project_id: string; total: number | null }>) {
      actualByProject.set(
        t.project_id,
        (actualByProject.get(t.project_id) ?? 0) + Number(t.total ?? 0),
      )
    }

    const cxpByProject = new Map<string, number>()
    for (const t of (transactions ?? []) as Array<{
      project_id: string
      total: number | null
      payment_condition: string | null
    }>) {
      const isCredit = (t.payment_condition ?? '').toLowerCase().includes('credito')
      if (isCredit) cxpByProject.set(t.project_id, (cxpByProject.get(t.project_id) ?? 0) + Number(t.total ?? 0))
    }

    const pendingReqByProject = new Map<string, number>()
    for (const r of (requisitions ?? []) as Array<{ project_id: string; status: string }>) {
      if (['pendiente_validacion', 'pending_approval'].includes(r.status)) {
        pendingReqByProject.set(r.project_id, (pendingReqByProject.get(r.project_id) ?? 0) + 1)
      }
    }

    const lowStockByProject = new Map<string, number>()
    for (const it of (items ?? []) as Array<{
      project_id: string
      current_stock: number | null
      min_stock: number | null
    }>) {
      if (Number(it.current_stock ?? 0) <= Number(it.min_stock ?? 0)) {
        lowStockByProject.set(it.project_id, (lowStockByProject.get(it.project_id) ?? 0) + 1)
      }
    }

    return (projects ?? []).map((p: { id: string; name: string; code: string; status: string; company_id: string; company?: { name?: string } }) => {
      const total_budget = budgetByProject.get(p.id) ?? 0
      const total_actual = actualByProject.get(p.id) ?? 0
      const variance = total_actual - total_budget
      const variance_pct = total_budget > 0 ? (variance / total_budget) * 100 : 0
      return {
        project_id: p.id,
        project_name: p.name,
        project_code: p.code,
        company_id: p.company_id,
        company_name: p.company?.name ?? '',
        status: p.status,
        total_budget,
        total_actual,
        variance,
        variance_pct,
        cxp_pending: cxpByProject.get(p.id) ?? 0,
        pending_requisitions: pendingReqByProject.get(p.id) ?? 0,
        low_stock_items: lowStockByProject.get(p.id) ?? 0,
      }
    })
  },

  // KPIs agregados por empresa.
  async getCompanyKPIs(): Promise<CompanyKPI[]> {
    const projectKpis = await this.getProjectKPIs()
    const byCompany = new Map<string, CompanyKPI>()
    for (const pk of projectKpis) {
      let row = byCompany.get(pk.company_id)
      if (!row) {
        row = {
          company_id: pk.company_id,
          company_name: pk.company_name,
          rnc: null,
          projects_count: 0,
          active_projects: 0,
          total_budget: 0,
          total_actual: 0,
          variance: 0,
          variance_pct: 0,
        }
        byCompany.set(pk.company_id, row)
      }
      row.projects_count += 1
      if (pk.status === 'active') row.active_projects += 1
      row.total_budget += pk.total_budget
      row.total_actual += pk.total_actual
    }
    for (const row of byCompany.values()) {
      row.variance = row.total_actual - row.total_budget
      row.variance_pct = row.total_budget > 0 ? (row.variance / row.total_budget) * 100 : 0
    }
    return Array.from(byCompany.values()).sort((a, b) => a.company_name.localeCompare(b.company_name))
  },
}
