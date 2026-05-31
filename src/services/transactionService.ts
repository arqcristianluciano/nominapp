import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/database'

export interface TransactionWithRelations extends Transaction {
  supplier?: { id: string; name: string } | null
  budget_category?: { id: string; code: string; name: string } | null
  budget_item?: { id: string; code: string | null; description: string } | null
}

const SELECT =
  '*, supplier:suppliers(id, name), budget_category:budget_categories(id, code, name), budget_item:budget_items(id, code, description)'

export const transactionService = {
  async getByProject(projectId: string, filters?: { dateFrom?: string; dateTo?: string }) {
    let query = supabase
      .from('transactions')
      .select(SELECT)
      .eq('project_id', projectId)
      .order('date', { ascending: false })

    if (filters?.dateFrom) {
      query = query.gte('date', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('date', filters.dateTo)
    }

    const { data, error } = await query
    if (error) throw error
    return data as TransactionWithRelations[]
  },

  async getByProjects(projectIds: string[]) {
    if (projectIds.length === 0) return []
    const { data, error } = await supabase
      .from('transactions')
      .select(SELECT)
      .in('project_id', projectIds)
      .order('date', { ascending: false })
    if (error) throw error
    return data as TransactionWithRelations[]
  },

  async create(transaction: Omit<Transaction, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('transactions').insert(transaction).select(SELECT).single()
    if (error) throw error
    return data as TransactionWithRelations
  },

  async update(id: string, updates: Partial<Transaction>) {
    const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select(SELECT).single()
    if (error) throw error
    return data as TransactionWithRelations
  },

  // Asigna una misma partida a varias transacciones de una sola vez (back-fill
  // del histórico). El trigger de la base fuerza el capítulo a partir de la
  // partida, así que no hace falta enviarlo aquí.
  async bulkSetPartida(ids: string[], budgetItemId: string) {
    if (ids.length === 0) return []
    const { data, error } = await supabase
      .from('transactions')
      .update({ budget_item_id: budgetItemId })
      .in('id', ids)
      .select(SELECT)
    if (error) throw error
    return data as TransactionWithRelations[]
  },

  async delete(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  },
}
