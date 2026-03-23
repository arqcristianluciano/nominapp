import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/database'

export interface TransactionWithRelations extends Transaction {
  supplier?: { id: string; name: string } | null
  budget_category?: { id: string; code: string; name: string } | null
}

export const transactionService = {
  async getByProject(
    projectId: string,
    filters?: { dateFrom?: string; dateTo?: string }
  ) {
    let query = supabase
      .from('transactions')
      .select('*, supplier:suppliers(id, name), budget_category:budget_categories(id, code, name)')
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

  async create(transaction: Omit<Transaction, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select('*, supplier:suppliers(id, name), budget_category:budget_categories(id, code, name)')
      .single()
    if (error) throw error
    return data as TransactionWithRelations
  },

  async update(id: string, updates: Partial<Transaction>) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select('*, supplier:suppliers(id, name), budget_category:budget_categories(id, code, name)')
      .single()
    if (error) throw error
    return data as TransactionWithRelations
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
