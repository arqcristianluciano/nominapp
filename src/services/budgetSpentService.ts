import { supabase } from '@/lib/supabase'
import { COMMITTED_PAYROLL_STATUSES } from '@/services/payrollService'
import { round2 } from '@/utils/money'

export interface ImputedCostFilters {
  dateFrom?: string
  dateTo?: string
}

/**
 * Suma el costo real imputado a cada capítulo (budget_category_id) proveniente de:
 *  - líneas de mano de obra de reportes comprometidos (aprobados/pagados),
 *  - facturas de materiales de esos mismos reportes,
 *  - salidas de almacén (inventory_movements type='out') imputadas a partida.
 *
 * Devuelve un mapa `categoryId -> monto`. Cuando la imputación es a nivel de
 * partida (`budget_item_id`) se resuelve a su capítulo a través de budget_items.
 *
 * Sin esto, la columna GASTADO del Presupuesto sólo refleja la tabla
 * `transactions` y los gastos imputados desde los reportes/almacén aparecen
 * como 0. Coincide con el "costo real" usado en la cubicación mensual
 * (`partidaProgressService`).
 */
export const budgetSpentService = {
  async getImputedCostByCategory(projectId: string, filters?: ImputedCostFilters): Promise<Record<string, number>> {
    // Mapa partida -> capítulo, para resolver imputaciones a nivel de budget_item.
    const { data: categories, error: catError } = await supabase
      .from('budget_categories')
      .select('id')
      .eq('project_id', projectId)
    if (catError) throw catError
    const categoryIds = (categories ?? []).map((c: { id: string }) => c.id)

    const itemToCategory = new Map<string, string>()
    if (categoryIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('budget_items')
        .select('id, budget_category_id')
        .in('budget_category_id', categoryIds)
      if (itemsError) throw itemsError
      for (const it of (items ?? []) as Array<{ id: string; budget_category_id: string }>) {
        itemToCategory.set(it.id, it.budget_category_id)
      }
    }

    const totals: Record<string, number> = {}
    const add = (categoryId: string | null | undefined, itemId: string | null | undefined, amount: number): void => {
      const resolved = categoryId ?? (itemId ? itemToCategory.get(itemId) : undefined)
      if (!resolved || !amount) return
      totals[resolved] = (totals[resolved] ?? 0) + amount
    }

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

    // 2) Mano de obra y facturas de materiales imputadas a un capítulo/partida.
    if (periodIds.length > 0) {
      const [laborRes, materialRes] = await Promise.all([
        supabase
          .from('labor_line_items')
          .select('quantity, unit_price, budget_category_id, budget_item_id')
          .in('payroll_period_id', periodIds),
        supabase
          .from('material_invoices')
          .select('amount, budget_category_id, budget_item_id')
          .in('payroll_period_id', periodIds),
      ])
      if (laborRes.error) throw laborRes.error
      if (materialRes.error) throw materialRes.error

      for (const ll of (laborRes.data ?? []) as Array<{
        quantity: number | null
        unit_price: number | null
        budget_category_id: string | null
        budget_item_id: string | null
      }>) {
        add(ll.budget_category_id, ll.budget_item_id, Number(ll.quantity ?? 0) * Number(ll.unit_price ?? 0))
      }
      for (const inv of (materialRes.data ?? []) as Array<{
        amount: number | null
        budget_category_id: string | null
        budget_item_id: string | null
      }>) {
        add(inv.budget_category_id, inv.budget_item_id, Number(inv.amount ?? 0))
      }
    }

    // 3) Salidas de almacén imputadas a partida/capítulo (costo real consumido).
    let movementsQuery = supabase
      .from('inventory_movements')
      .select('quantity, unit_cost, date, budget_category_id, budget_item_id, type')
      .eq('project_id', projectId)
      .eq('type', 'out')
    if (filters?.dateFrom) movementsQuery = movementsQuery.gte('date', filters.dateFrom)
    if (filters?.dateTo) movementsQuery = movementsQuery.lte('date', filters.dateTo)
    const { data: movements, error: movementsError } = await movementsQuery
    if (movementsError) throw movementsError

    for (const mv of (movements ?? []) as Array<{
      quantity: number | null
      unit_cost: number | null
      budget_category_id: string | null
      budget_item_id: string | null
    }>) {
      add(mv.budget_category_id, mv.budget_item_id, Number(mv.quantity ?? 0) * Number(mv.unit_cost ?? 0))
    }

    for (const id of Object.keys(totals)) {
      totals[id] = round2(totals[id])
    }
    return totals
  },
}
