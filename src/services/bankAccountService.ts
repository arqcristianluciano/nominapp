import { supabase } from '@/lib/supabase'
import type { BankAccount } from '@/types/database'

export const bankAccountService = {
  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .or(`project_id.eq.${projectId},is_internal.eq.true`)
      .order('bank_name')
    if (error) throw error
    return data as BankAccount[]
  },

  async getAll() {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .order('bank_name')
    if (error) throw error
    return data as BankAccount[]
  },

  async create(account: Omit<BankAccount, 'id'>) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert(account)
      .select()
      .single()
    if (error) throw error
    return data as BankAccount
  },

  async update(id: string, updates: Partial<BankAccount>) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as BankAccount
  },
}
