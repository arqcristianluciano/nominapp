import { supabase } from '@/lib/supabase'
import { COMMITTED_PAYROLL_STATUSES } from '@/services/payrollService'
import {
  INVENTORY_OUT_TYPE,
  inventoryOutCost,
  isConsumptionOut,
  laborLineCost,
  materialInvoiceCost,
  resolveImputedCategory,
  transactionCost,
} from '@/utils/costoReal'

export interface PartidaProgress {
  id: string
  project_id: string
  budget_item_id: string | null
  budget_category_id: string | null
  cut_date: string
  executed_quantity: number | null
  executed_percent: number | null
  notes: string | null
  responsible: string | null
  created_at: string
}

export interface AddProgressInput {
  project_id: string
  budget_item_id?: string | null
  budget_category_id?: string | null
  cut_date: string
  executed_quantity?: number | null
  executed_percent?: number | null
  notes?: string | null
  responsible?: string | null
}

export interface MonthlyCubicationRow {
  month: string // YYYY-MM
  budget_category_id: string | null
  category_code: string | null
  category_name: string | null
  cubicado: number // Σ avance × precio presupuestado
  costo_real: number // Σ (salidas almacén + nómina aprobada + facturas) del mes imputadas al capítulo
  desviacion: number // costo_real - cubicado
}

export interface PartidaActualCostRow {
  budget_item_id: string
  category_code: string | null
  category_name: string | null
  item_code: string | null
  item_description: string
  presupuesto: number // cantidad presupuestada × precio unitario
  costo_real: number // Σ costos imputados directamente a la partida
  desviacion: number // costo_real - presupuesto
}

// Cobertura: qué parte del costo real está imputado a una partida y qué parte
// quedó sin partida (solo capítulo o sin imputar). Sirve para saber qué tan
// completo/confiable es el reporte por partida.
export interface PartidaCostCoverage {
  attributed: number // costo real con partida asignada
  unattributed: number // costo real sin partida
  total: number // attributed + unattributed
}

export interface PartidaActualCostResult {
  rows: PartidaActualCostRow[]
  coverage: PartidaCostCoverage
}

function monthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  return dateStr.slice(0, 7)
}

export const partidaProgressService = {
  async addProgress(input: AddProgressInput): Promise<PartidaProgress> {
    if (!input.budget_item_id && !input.budget_category_id) {
      throw new Error('Debe especificar budget_item_id o budget_category_id')
    }
    if (input.executed_quantity == null && input.executed_percent == null) {
      throw new Error('Debe especificar executed_quantity o executed_percent')
    }
    const { data, error } = await supabase
      .from('partida_progress')
      .insert({
        project_id: input.project_id,
        budget_item_id: input.budget_item_id ?? null,
        budget_category_id: input.budget_category_id ?? null,
        cut_date: input.cut_date,
        executed_quantity: input.executed_quantity ?? null,
        executed_percent: input.executed_percent ?? null,
        notes: input.notes ?? null,
        responsible: input.responsible ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data as PartidaProgress
  },

  async listByProject(projectId: string): Promise<PartidaProgress[]> {
    const { data, error } = await supabase
      .from('partida_progress')
      .select('*')
      .eq('project_id', projectId)
      .order('cut_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as PartidaProgress[]
  },

  // Cubicación mensual del proyecto (estado deseado, sección 6.6).
  // Para cada capítulo y mes:
  //  - cubicado = Σ (avance ejecutado en el mes × precio presupuestado de la partida)
  //  - costo_real = Σ (salidas inventario imputadas al cap. + nóminas approved imputadas
  //    + material_invoices + transacciones CxP imputadas), consistente con la vista por partida.
  async getMonthlyCubication(projectId: string): Promise<MonthlyCubicationRow[]> {
    // 1) Capítulos del proyecto
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('id, code, name')
      .eq('project_id', projectId)
    const catById = new Map<string, { code: string; name: string }>(
      (categories ?? []).map((c: { id: string; code: string; name: string }) => [c.id, { code: c.code, name: c.name }]),
    )
    const categoryIds = (categories ?? []).map((c: { id: string }) => c.id)

    // 2) Partidas con su capítulo
    const { data: items } = await supabase
      .from('budget_items')
      .select('id, budget_category_id, quantity, unit_price')
      .in('budget_category_id', categoryIds.length > 0 ? categoryIds : ['__none__'])
    const itemById = new Map<string, { budget_category_id: string; quantity: number; unit_price: number }>()
    const itemToCategory = new Map<string, string>()
    for (const it of (items ?? []) as Array<{
      id: string
      budget_category_id: string
      quantity: number | null
      unit_price: number | null
    }>) {
      itemById.set(it.id, {
        budget_category_id: it.budget_category_id,
        quantity: Number(it.quantity ?? 0),
        unit_price: Number(it.unit_price ?? 0),
      })
      itemToCategory.set(it.id, it.budget_category_id)
    }

    const map = new Map<string, MonthlyCubicationRow>()
    function getRow(month: string, categoryId: string | null): MonthlyCubicationRow {
      const key = `${month}|${categoryId ?? '_none_'}`
      let row = map.get(key)
      if (!row) {
        const cat = categoryId ? catById.get(categoryId) : null
        row = {
          month,
          budget_category_id: categoryId,
          category_code: cat?.code ?? null,
          category_name: cat?.name ?? null,
          cubicado: 0,
          costo_real: 0,
          desviacion: 0,
        }
        map.set(key, row)
      }
      return row
    }

    // Capítulo de un costo: el imputado directamente o, si solo tiene partida,
    // el capítulo de esa partida (regla compartida en `@/utils/costoReal`).
    const resolveCategory = (categoryId: string | null, itemId: string | null): string | null =>
      resolveImputedCategory(categoryId, itemId, itemToCategory)

    // 3) Cubicado: partida_progress × precio presupuestado de la partida
    const progresses = await this.listByProject(projectId)
    for (const prog of progresses) {
      const month = monthKey(prog.cut_date)
      if (!month) continue

      let categoryId = prog.budget_category_id
      let valor = 0
      if (prog.budget_item_id) {
        const item = itemById.get(prog.budget_item_id)
        if (!item) continue
        categoryId = item.budget_category_id
        const qty =
          prog.executed_quantity != null
            ? Number(prog.executed_quantity)
            : (Number(prog.executed_percent ?? 0) / 100) * item.quantity
        valor = qty * item.unit_price
      } else if (prog.budget_category_id) {
        // Avance a nivel de capítulo: usar % sobre presupuesto del capítulo.
        if (prog.executed_percent != null) {
          // budgeted_amount no viene aquí; aproximación: sum(qty*unit_price de items del cap).
          const cap = (items ?? [])
            .filter((it: { budget_category_id: string }) => it.budget_category_id === prog.budget_category_id)
            .reduce(
              (s: number, it: { quantity: number | null; unit_price: number | null }) =>
                s + Number(it.quantity ?? 0) * Number(it.unit_price ?? 0),
              0,
            )
          valor = (Number(prog.executed_percent) / 100) * cap
        }
      }
      getRow(month, categoryId).cubicado += valor
    }

    // 4) Costo real - salidas de almacén imputadas a partida/capítulo
    // (solo despachos de consumo; las reversas de recepción se excluyen)
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('quantity, unit_cost, date, budget_category_id, budget_item_id, type, purchase_order_id')
      .eq('project_id', projectId)
      .eq('type', INVENTORY_OUT_TYPE)
    for (const mv of (movements ?? []) as Array<{
      quantity: number | null
      unit_cost: number | null
      date: string | null
      budget_category_id: string | null
      budget_item_id: string | null
      type: string
      purchase_order_id: string | null
    }>) {
      if (!isConsumptionOut(mv)) continue
      const month = monthKey(mv.date)
      if (!month) continue
      getRow(month, resolveCategory(mv.budget_category_id, mv.budget_item_id)).costo_real += inventoryOutCost(mv)
    }

    // 5) Costo real - nóminas aprobadas
    const { data: payrolls } = await supabase
      .from('payroll_periods')
      .select('id, grand_total, report_date, status')
      .eq('project_id', projectId)
      .in('status', COMMITTED_PAYROLL_STATUSES)
    const payrollIds = (payrolls ?? []).map((p: { id: string }) => p.id)
    const payrollMonthById = new Map<string, string | null>(
      (payrolls ?? []).map((p: { id: string; report_date: string | null }) => [p.id, monthKey(p.report_date)]),
    )

    if (payrollIds.length > 0) {
      const { data: laborItems } = await supabase
        .from('labor_line_items')
        .select('payroll_period_id, quantity, unit_price, budget_category_id, budget_item_id')
        .in('payroll_period_id', payrollIds)
      for (const ll of (laborItems ?? []) as Array<{
        payroll_period_id: string
        quantity: number | null
        unit_price: number | null
        budget_category_id: string | null
        budget_item_id: string | null
      }>) {
        const month = payrollMonthById.get(ll.payroll_period_id)
        if (!month) continue
        getRow(month, resolveCategory(ll.budget_category_id, ll.budget_item_id)).costo_real += laborLineCost(ll)
      }

      const { data: invoices } = await supabase
        .from('material_invoices')
        .select('payroll_period_id, amount, budget_category_id, budget_item_id')
        .in('payroll_period_id', payrollIds)
      for (const inv of (invoices ?? []) as Array<{
        payroll_period_id: string
        amount: number | null
        budget_category_id: string | null
        budget_item_id: string | null
      }>) {
        const month = payrollMonthById.get(inv.payroll_period_id)
        if (!month) continue
        getRow(month, resolveCategory(inv.budget_category_id, inv.budget_item_id)).costo_real +=
          materialInvoiceCost(inv)
      }
    }

    // 5b) Costo real - transacciones (CxP / diario) imputadas a capítulo/partida.
    // Consistente con getActualCostByPartida, que ya las incluye. El mes sale de
    // la fecha de la transacción; el capítulo, de su capítulo o el de su partida.
    const { data: txns } = await supabase
      .from('transactions')
      .select('total, date, budget_category_id, budget_item_id')
      .eq('project_id', projectId)
    for (const tx of (txns ?? []) as Array<{
      total: number | null
      date: string | null
      budget_category_id: string | null
      budget_item_id: string | null
    }>) {
      const month = monthKey(tx.date)
      if (!month) continue
      getRow(month, resolveCategory(tx.budget_category_id, tx.budget_item_id)).costo_real += transactionCost(tx)
    }

    // 6) Desviación
    for (const row of map.values()) {
      row.desviacion = row.costo_real - row.cubicado
    }

    return Array.from(map.values()).sort((a, b) =>
      a.month === b.month
        ? (a.category_code ?? '').localeCompare(b.category_code ?? '')
        : a.month.localeCompare(b.month),
    )
  },

  // Costo real acumulado por partida (sección 6.6, vista de detalle).
  // A diferencia de getMonthlyCubication (que agrega por capítulo), aquí solo
  // se suman los costos imputados DIRECTAMENTE a una partida (budget_item_id):
  //  - salidas de almacén imputadas a la partida
  //  - mano de obra de nóminas aprobadas imputada a la partida
  //  - facturas de materiales de nóminas aprobadas imputadas a la partida
  //  - transacciones (CxP / diario) imputadas a la partida
  // El presupuesto sale de cantidad × precio unitario de la partida. Además
  // devuelve la cobertura: cuánto costo real quedó con/sin partida.
  async getActualCostByPartida(projectId: string): Promise<PartidaActualCostResult> {
    // 1) Capítulos del proyecto
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('id, code, name')
      .eq('project_id', projectId)
    const catById = new Map<string, { code: string; name: string }>(
      (categories ?? []).map((c: { id: string; code: string; name: string }) => [c.id, { code: c.code, name: c.name }]),
    )
    const categoryIds = (categories ?? []).map((c: { id: string }) => c.id)

    // 2) Partidas del proyecto, con su presupuesto
    const { data: items } = await supabase
      .from('budget_items')
      .select('id, budget_category_id, code, description, quantity, unit_price')
      .in('budget_category_id', categoryIds.length > 0 ? categoryIds : ['__none__'])

    const rowById = new Map<string, PartidaActualCostRow>()
    for (const it of (items ?? []) as Array<{
      id: string
      budget_category_id: string
      code: string | null
      description: string | null
      quantity: number | null
      unit_price: number | null
    }>) {
      const cat = catById.get(it.budget_category_id)
      rowById.set(it.id, {
        budget_item_id: it.id,
        category_code: cat?.code ?? null,
        category_name: cat?.name ?? null,
        item_code: it.code ?? null,
        item_description: it.description ?? '—',
        presupuesto: Number(it.quantity ?? 0) * Number(it.unit_price ?? 0),
        costo_real: 0,
        desviacion: 0,
      })
    }

    const coverage: PartidaCostCoverage = { attributed: 0, unattributed: 0, total: 0 }
    // Suma un costo real. Si tiene partida válida lo acumula en la partida y en
    // `attributed`; si no, va a `unattributed` (cobertura del reporte).
    function addCost(budgetItemId: string | null, value: number): void {
      if (!value) return
      coverage.total += value
      const row = budgetItemId ? rowById.get(budgetItemId) : undefined
      if (row) {
        row.costo_real += value
        coverage.attributed += value
      } else {
        coverage.unattributed += value
      }
    }

    // 3) Salidas de almacén imputadas a partida
    // (solo despachos de consumo; las reversas de recepción se excluyen)
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('quantity, unit_cost, budget_item_id, type, purchase_order_id')
      .eq('project_id', projectId)
      .eq('type', INVENTORY_OUT_TYPE)
    for (const mv of (movements ?? []) as Array<{
      quantity: number | null
      unit_cost: number | null
      budget_item_id: string | null
      type: string
      purchase_order_id: string | null
    }>) {
      if (!isConsumptionOut(mv)) continue
      addCost(mv.budget_item_id, inventoryOutCost(mv))
    }

    // 4) Mano de obra y facturas de nóminas comprometidas (aprobadas/pagadas)
    const { data: payrolls } = await supabase
      .from('payroll_periods')
      .select('id, status')
      .eq('project_id', projectId)
      .in('status', COMMITTED_PAYROLL_STATUSES)
    const payrollIds = (payrolls ?? []).map((p: { id: string }) => p.id)

    if (payrollIds.length > 0) {
      const { data: laborItems } = await supabase
        .from('labor_line_items')
        .select('quantity, unit_price, budget_item_id')
        .in('payroll_period_id', payrollIds)
      for (const ll of (laborItems ?? []) as Array<{
        quantity: number | null
        unit_price: number | null
        budget_item_id: string | null
      }>) {
        addCost(ll.budget_item_id, laborLineCost(ll))
      }

      const { data: invoices } = await supabase
        .from('material_invoices')
        .select('amount, budget_item_id')
        .in('payroll_period_id', payrollIds)
      for (const inv of (invoices ?? []) as Array<{
        amount: number | null
        budget_item_id: string | null
      }>) {
        addCost(inv.budget_item_id, materialInvoiceCost(inv))
      }
    }

    // 5) Transacciones (CxP / diario) imputadas a partida
    const { data: transactions } = await supabase
      .from('transactions')
      .select('total, budget_item_id')
      .eq('project_id', projectId)
    for (const tx of (transactions ?? []) as Array<{
      total: number | null
      budget_item_id: string | null
    }>) {
      addCost(tx.budget_item_id, transactionCost(tx))
    }

    // 6) Desviación y orden
    for (const row of rowById.values()) {
      row.desviacion = row.costo_real - row.presupuesto
    }

    const rows = Array.from(rowById.values()).sort((a, b) => {
      const cat = (a.category_code ?? '').localeCompare(b.category_code ?? '')
      return cat !== 0 ? cat : (a.item_code ?? '').localeCompare(b.item_code ?? '')
    })

    return { rows, coverage }
  },
}
