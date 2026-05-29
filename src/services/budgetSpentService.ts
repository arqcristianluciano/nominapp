import { supabase } from '@/lib/supabase'
import { COMMITTED_PAYROLL_STATUSES } from '@/services/payrollService'
import { round2 } from '@/utils/money'

export interface ImputedCostFilters {
  dateFrom?: string
  dateTo?: string
}

/**
 * Suma el costo real imputado a cada capítulo (budget_category_id) proveniente
 * de los reportes de nómina comprometidos (aprobados/pagados): líneas de mano
 * de obra y facturas de materiales. Devuelve un mapa `categoryId -> monto`.
 *
 * Sin esto, la columna GASTADO del Presupuesto sólo refleja la tabla
 * `transactions` y los gastos imputados desde los reportes aparecen como 0.
 * Replica el criterio del desglose por capítulo del reporte mensual
 * (`buildBudgetBreakdown` en monthlyReportData) para que ambas vistas
 * coincidan: sólo periodos comprometidos, sumados por `budget_category_id`.
 */
export const budgetSpentService = {
  async getImputedCostByCategory(projectId: string, filters?: ImputedCostFilters): Promise<Record<string, number>> {
    // 1) Periodos comprometidos del proyecto dentro del rango de fechas.
    let periodsQuery = supabase
      .from('payroll_periods')
      .select('id, report_date, status')
      .eq('project_id', projectId)
      .in('status', COMMITTED_PAYROLL_STATUSES)
    if (filters?.dateFrom) periodsQuery = periodsQuery.gte('report_date', filters.dateFrom)
    if (filters?.dateTo) periodsQuery = periodsQuery.lte('report_date', filters.dateTo)

    const { data: periods, error: periodsError } = await periodsQuery
    if (periodsError) throw periodsError

    const periodIds = (periods ?? []).map((p: { id: string }) => p.id)
    if (periodIds.length === 0) return {}

    const totals: Record<string, number> = {}
    const add = (categoryId: string | null | undefined, amount: number): void => {
      if (!categoryId || !amount) return
      totals[categoryId] = (totals[categoryId] ?? 0) + amount
    }

    // 2) Mano de obra y facturas de materiales imputadas a un capítulo.
    const [laborRes, materialRes] = await Promise.all([
      supabase
        .from('labor_line_items')
        .select('quantity, unit_price, budget_category_id')
        .in('payroll_period_id', periodIds),
      supabase.from('material_invoices').select('amount, budget_category_id').in('payroll_period_id', periodIds),
    ])
    if (laborRes.error) throw laborRes.error
    if (materialRes.error) throw materialRes.error

    for (const ll of (laborRes.data ?? []) as Array<{
      quantity: number | null
      unit_price: number | null
      budget_category_id: string | null
    }>) {
      add(ll.budget_category_id, Number(ll.quantity ?? 0) * Number(ll.unit_price ?? 0))
    }
    for (const inv of (materialRes.data ?? []) as Array<{
      amount: number | null
      budget_category_id: string | null
    }>) {
      add(inv.budget_category_id, Number(inv.amount ?? 0))
    }

    for (const id of Object.keys(totals)) {
      totals[id] = round2(totals[id])
    }
    return totals
  },
}
