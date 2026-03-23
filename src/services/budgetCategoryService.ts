import { supabase } from '@/lib/supabase'
import type { BudgetCategory } from '@/types/database'
import { DEFAULT_BUDGET_CATEGORIES } from '@/constants/budgetCategories'

export const budgetCategoryService = {
  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
    if (error) throw error
    return data as BudgetCategory[]
  },

  async updateBudgetAmount(id: string, budgeted_amount: number) {
    const { data, error } = await supabase
      .from('budget_categories')
      .update({ budgeted_amount })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as BudgetCategory
  },

  async initializeForProject(projectId: string) {
    const existing = await this.getByProject(projectId)
    if (existing.length > 0) return existing

    const categories = DEFAULT_BUDGET_CATEGORIES.map((cat) => ({
      project_id: projectId,
      code: cat.code,
      name: cat.name,
      sort_order: cat.sort_order,
      budgeted_amount: 0,
    }))

    const { data, error } = await supabase
      .from('budget_categories')
      .insert(categories)
      .select()
    if (error) throw error
    return (data as BudgetCategory[]).sort((a, b) => a.sort_order - b.sort_order)
  },
}
