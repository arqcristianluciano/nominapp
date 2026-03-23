import { supabase } from '@/lib/supabase'
import type { BudgetItem } from '@/types/database'

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
    const { data, error } = await supabase
      .from('budget_items')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data as BudgetItem
  },

  async update(id: string, changes: Partial<Omit<BudgetItem, 'id'>>): Promise<BudgetItem> {
    const { data, error } = await supabase
      .from('budget_items')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as BudgetItem
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('budget_items')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async bulkCreate(items: Omit<BudgetItem, 'id'>[]): Promise<BudgetItem[]> {
    if (items.length === 0) return []
    const { data, error } = await supabase
      .from('budget_items')
      .insert(items)
      .select()
    if (error) throw error
    return data as BudgetItem[]
  },

  async deleteByCategory(categoryId: string): Promise<void> {
    const { error } = await supabase
      .from('budget_items')
      .delete()
      .eq('budget_category_id', categoryId)
    if (error) throw error
  },
}
