import { supabase } from '@/lib/supabase'
import type { BudgetItem } from '@/types/database'
import { approvalsService } from '@/services/approvalsService'

export const budgetItemService = {
  async getByCategoryId(categoryId: string): Promise<BudgetItem[]> {
    const { data, error } = await supabase
      .from('budget_items')
      .select('*')
      .eq('budget_category_id', categoryId)
      .order('sort_order')
    if (error) throw error
    return data as BudgetItem[]
  },

  async getByProjectCategories(categoryIds: string[]): Promise<BudgetItem[]> {
    if (categoryIds.length === 0) return []
    const { data, error } = await supabase
      .from('budget_items')
      .select('*')
      .in('budget_category_id', categoryIds)
      .order('sort_order')
    if (error) throw error
    return data as BudgetItem[]
  },

  async create(item: Omit<BudgetItem, 'id'>): Promise<BudgetItem> {
    const { data, error } = await supabase.from('budget_items').insert(item).select().single()
    if (error) throw error
    return data as BudgetItem
  },

  async update(id: string, changes: Partial<Omit<BudgetItem, 'id'>>): Promise<BudgetItem> {
    const { data, error } = await supabase.from('budget_items').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data as BudgetItem
  },

  /**
   * Cuenta el gasto y los avances asociados a una subpartida, para avisar antes
   * de borrarla. Al borrar, el gasto (transacciones, facturas, movimientos de
   * almacén, órdenes) queda sin partida (la columna GASTADO baja en silencio) y
   * los avances de obra se BORRAN en cascada. Devuelve el total y el desglose.
   */
  async countReferences(id: string): Promise<{ total: number; gastoLinks: number; progreso: number }> {
    const tablesGasto = [
      'transactions',
      'material_invoices',
      'inventory_movements',
      'labor_line_items',
      'purchase_requisitions',
      'purchase_requisition_items',
    ]
    const counts = await Promise.all(
      tablesGasto.map((t) =>
        supabase
          .from(t)
          .select('id', { count: 'exact', head: true })
          .eq('budget_item_id', id)
          .then(({ count }) => count ?? 0),
      ),
    )
    const { count: progresoCount } = await supabase
      .from('partida_progress')
      .select('id', { count: 'exact', head: true })
      .eq('budget_item_id', id)
    const gastoLinks = counts.reduce((a, b) => a + b, 0)
    const progreso = progresoCount ?? 0
    return { total: gastoLinks + progreso, gastoLinks, progreso }
  },

  async delete(id: string): Promise<void> {
    const { data: item } = await supabase.from('budget_items').select('*').eq('id', id).single()

    const { error } = await supabase.from('budget_items').delete().eq('id', id)
    if (error) throw error

    await approvalsService
      .log({
        entity_type: 'budget_item',
        entity_id: id,
        action: 'delete',
        payload_before: item,
      })
      .catch((err) => console.warn('[budgetItemService.delete] log de auditoria fallo', err))
  },

  async bulkCreate(items: Omit<BudgetItem, 'id'>[]): Promise<BudgetItem[]> {
    if (items.length === 0) return []
    const { data, error } = await supabase.from('budget_items').insert(items).select()
    if (error) throw error
    return data as BudgetItem[]
  },

  async deleteByCategory(categoryId: string): Promise<void> {
    const { data: items } = await supabase.from('budget_items').select('*').eq('budget_category_id', categoryId)

    const { error } = await supabase.from('budget_items').delete().eq('budget_category_id', categoryId)
    if (error) throw error

    await approvalsService
      .log({
        entity_type: 'budget_category_items',
        entity_id: categoryId,
        action: 'delete_cascade',
        payload_before: items,
        metadata: { count: items?.length ?? 0, budget_category_id: categoryId },
      })
      .catch((err) => console.warn('[budgetItemService.deleteByCategory] log de auditoria fallo', err))
  },
}
