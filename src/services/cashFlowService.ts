import { supabase } from '@/lib/supabase'
import { COMMITTED_PAYROLL_STATUSES } from '@/services/payrollService'

export interface ExpectedInflow {
  id: string
  project_id: string
  expected_date: string
  amount: number
  concept: string
  source: 'manual' | 'estatepro' | 'contract' | 'other'
  external_ref: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface MonthlyCashFlowRow {
  month: string // YYYY-MM
  planned_outflow: number  // egresos planificados (presupuesto en el mes)
  actual_outflow: number   // egresos ejecutados (nóminas approved + OC liberadas + transactions)
  planned_inflow: number   // ingresos esperados
  actual_inflow: number    // ingresos reales (cuando se registren — placeholder 0 por ahora)
  net_planned: number
  net_actual: number
}

function monthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  return dateStr.slice(0, 7)
}

function ensureRow(map: Map<string, MonthlyCashFlowRow>, month: string): MonthlyCashFlowRow {
  let row = map.get(month)
  if (!row) {
    row = {
      month,
      planned_outflow: 0,
      actual_outflow: 0,
      planned_inflow: 0,
      actual_inflow: 0,
      net_planned: 0,
      net_actual: 0,
    }
    map.set(month, row)
  }
  return row
}

export const cashFlowService = {
  async listExpectedInflows(projectId: string): Promise<ExpectedInflow[]> {
    const { data, error } = await supabase
      .from('expected_cash_inflows')
      .select('*')
      .eq('project_id', projectId)
      .order('expected_date', { ascending: true })
    if (error) throw error
    return (data ?? []) as ExpectedInflow[]
  },

  async addExpectedInflow(input: Omit<ExpectedInflow, 'id' | 'created_at'>): Promise<ExpectedInflow> {
    const { data, error } = await supabase
      .from('expected_cash_inflows')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as ExpectedInflow
  },

  async deleteExpectedInflow(id: string): Promise<void> {
    const { error } = await supabase.from('expected_cash_inflows').delete().eq('id', id)
    if (error) throw error
  },

  // Construye una proyección mensual plan-vs-ejecutado.
  // Egresos planificados: budget_items con start_date en el mes; si no hay
  // fecha, no se distribuyen (se reportan en una fila "sin_fecha").
  // Egresos reales: payroll_periods aprobadas + transactions del mes.
  // Ingresos planificados: expected_cash_inflows.
  async getMonthlyProjection(projectId: string): Promise<MonthlyCashFlowRow[]> {
    const map = new Map<string, MonthlyCashFlowRow>()

    // 1) Planificado: budget_items con start_date.
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('id')
      .eq('project_id', projectId)
    const categoryIds = (categories ?? []).map((c: { id: string }) => c.id)
    if (categoryIds.length > 0) {
      const { data: items } = await supabase
        .from('budget_items')
        .select('quantity, unit_price, start_date')
        .in('budget_category_id', categoryIds)
      for (const it of (items ?? []) as Array<{
        quantity: number | null
        unit_price: number | null
        start_date: string | null
      }>) {
        const key = monthKey(it.start_date)
        if (!key) continue
        const subtotal = Number(it.quantity ?? 0) * Number(it.unit_price ?? 0)
        ensureRow(map, key).planned_outflow += subtotal
      }
    }

    // 2) Real - nóminas aprobadas (usar report_date como mes).
    const { data: payrolls } = await supabase
      .from('payroll_periods')
      .select('grand_total, report_date, status')
      .eq('project_id', projectId)
      .in('status', COMMITTED_PAYROLL_STATUSES)
    for (const p of (payrolls ?? []) as Array<{ grand_total: number | null; report_date: string | null }>) {
      const key = monthKey(p.report_date)
      if (!key) continue
      ensureRow(map, key).actual_outflow += Number(p.grand_total ?? 0)
    }

    // 3) Real - transactions (libro diario).
    const { data: transactions } = await supabase
      .from('transactions')
      .select('total, date')
      .eq('project_id', projectId)
    for (const t of (transactions ?? []) as Array<{ total: number | null; date: string | null }>) {
      const key = monthKey(t.date)
      if (!key) continue
      ensureRow(map, key).actual_outflow += Number(t.total ?? 0)
    }

    // 4) Planificado - ingresos esperados.
    const inflows = await this.listExpectedInflows(projectId)
    for (const inf of inflows) {
      const key = monthKey(inf.expected_date)
      if (!key) continue
      ensureRow(map, key).planned_inflow += Number(inf.amount ?? 0)
    }

    // Net = inflow - outflow
    for (const row of map.values()) {
      row.net_planned = row.planned_inflow - row.planned_outflow
      row.net_actual = row.actual_inflow - row.actual_outflow
    }

    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
  },
}
