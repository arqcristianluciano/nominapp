import { supabase } from '@/lib/supabase'
import type { MercadoBudget, MercadoBudgetLine, ParsedMercadoLine } from '@/types/mercadoBudget'

export const mercadoBudgetService = {
  async getByProject(projectId: string): Promise<MercadoBudget | null> {
    const { data, error } = await supabase
      .from('mercado_budgets')
      .select('*')
      .eq('project_id', projectId)
      .order('imported_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data as MercadoBudget | null
  },

  async create(data: Omit<MercadoBudget, 'id'>): Promise<MercadoBudget> {
    const { data: row, error } = await supabase
      .from('mercado_budgets')
      .insert(data)
      .select()
      .single()
    if (error) throw error
    return row as MercadoBudget
  },

  async deleteByProject(projectId: string): Promise<void> {
    const budget = await this.getByProject(projectId)
    if (!budget) return
    await supabase.from('mercado_budget_lines').delete().eq('budget_id', budget.id)
    await supabase.from('mercado_budgets').delete().eq('id', budget.id)
  },
}

export const mercadoBudgetLineService = {
  async getByBudget(budgetId: string): Promise<MercadoBudgetLine[]> {
    const { data, error } = await supabase
      .from('mercado_budget_lines')
      .select('*')
      .eq('budget_id', budgetId)
      .order('sort_order')
    if (error) throw error
    return data as MercadoBudgetLine[]
  },

  async bulkInsert(budgetId: string, lines: ParsedMercadoLine[]): Promise<void> {
    const rows: Omit<MercadoBudgetLine, 'id'>[] = lines.map((l) => ({
      ...l,
      budget_id: budgetId,
      contract_id: null,
      agreed_quantity: null,
      agreed_unit_price: null,
    }))
    const { error } = await supabase.from('mercado_budget_lines').insert(rows)
    if (error) throw error
  },

  async linkContract(
    lineId: string,
    contractId: string,
    agreedQuantity: number,
    agreedUnitPrice: number
  ): Promise<void> {
    const { error } = await supabase
      .from('mercado_budget_lines')
      .update({ contract_id: contractId, agreed_quantity: agreedQuantity, agreed_unit_price: agreedUnitPrice })
      .eq('id', lineId)
    if (error) throw error
  },

  async unlinkContract(lineId: string): Promise<void> {
    const { error } = await supabase
      .from('mercado_budget_lines')
      .update({ contract_id: null, agreed_quantity: null, agreed_unit_price: null })
      .eq('id', lineId)
    if (error) throw error
  },
}
