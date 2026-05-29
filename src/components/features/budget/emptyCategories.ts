import type { BudgetCategory, BudgetItem } from '@/types/database'

/**
 * Una partida se considera "vacía" cuando, tras cargar/importar el presupuesto,
 * quedó sin sincronizar con el Excel: no tiene subpartidas, su monto presupuestado
 * es 0 y no registra gasto alguno. Son las partidas predeterminadas que el proyecto
 * trae al crearse y que el usuario nunca llegó a usar.
 *
 * Excluimos explícitamente las que tienen gasto (`spent`) o monto presupuestado para
 * no romper la trazabilidad de transacciones ya imputadas a esa partida.
 */
export function findEmptyCategories(
  categories: BudgetCategory[],
  itemsByCategory: Record<string, BudgetItem[]>,
  spentByCategory: (categoryId: string) => number,
): BudgetCategory[] {
  return categories.filter((category) => {
    const items = itemsByCategory[category.id] ?? []
    if (items.length > 0) return false
    if (Number(category.budgeted_amount) !== 0) return false
    if (spentByCategory(category.id) !== 0) return false
    return true
  })
}
