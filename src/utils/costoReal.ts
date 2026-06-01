/**
 * Fuente única de verdad para el "costo real" imputado a capítulos/partidas del
 * presupuesto. Antes esta lógica estaba triplicada en `budgetSpentService`
 * (columna GASTADO), `partidaProgressService` (cubicación mensual y costo por
 * partida) y `monthlyReportData` (desglose por capítulo del reporte mensual),
 * con riesgo de que se desincronizaran.
 *
 * El costo real de un capítulo/partida se compone de CUATRO fuentes, todas
 * imputadas mediante `budget_category_id` / `budget_item_id`:
 *
 *   1. Transacciones (control financiero / CxP / diario) → `total`
 *   2. Mano de obra de nóminas comprometidas (approved/paid) → `quantity × unit_price`
 *   3. Facturas de materiales de esas nóminas → `amount`
 *   4. Salidas de almacén (`inventory_movements` con `type='out'`) → `quantity × unit_cost`
 *
 * ⚠️ RIESGO DE DOBLE CONTEO
 * Las transacciones (1) y los ítems de reporte/almacén (2)-(4) son fuentes
 * INDEPENDIENTES. Si un mismo gasto se registra a la vez como transacción y como
 * ítem de reporte/almacén imputado al mismo capítulo, se contará dos veces.
 * Hoy NO hay deduplicación automática: se asume que cada gasto se captura en una
 * sola de las dos vías (control financiero manual vs. reportes/almacén). Cualquier
 * cambio a este criterio debe hacerse aquí, en un solo lugar.
 */

/** Tipo de movimiento de inventario que representa consumo (costo real). */
export const INVENTORY_OUT_TYPE = 'out' as const

/** Costo de una línea de mano de obra: cantidad × precio unitario. */
export function laborLineCost(row: { quantity: number | null; unit_price: number | null }): number {
  return Number(row.quantity ?? 0) * Number(row.unit_price ?? 0)
}

/** Costo de una factura de materiales: su monto. */
export function materialInvoiceCost(row: { amount: number | null }): number {
  return Number(row.amount ?? 0)
}

/** Costo de una salida de almacén: cantidad × costo unitario. */
export function inventoryOutCost(row: { quantity: number | null; unit_cost: number | null }): number {
  return Number(row.quantity ?? 0) * Number(row.unit_cost ?? 0)
}

/** Costo de una transacción (control financiero / CxP): su total. */
export function transactionCost(row: { total: number | null }): number {
  return Number(row.total ?? 0)
}

/**
 * Capítulo al que pertenece un costo imputado: el capítulo imputado
 * directamente o, si solo tiene partida, el capítulo de esa partida. Así un
 * costo imputado únicamente a una partida no cae en la fila "sin capítulo".
 */
export function resolveImputedCategory(
  budgetCategoryId: string | null | undefined,
  budgetItemId: string | null | undefined,
  itemToCategory: ReadonlyMap<string, string>,
): string | null {
  if (budgetCategoryId) return budgetCategoryId
  if (budgetItemId) return itemToCategory.get(budgetItemId) ?? null
  return null
}
