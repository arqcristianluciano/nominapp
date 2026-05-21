import { supabase } from '@/lib/supabase'
import type { Company } from '@/types/database'

type CompanyInsert = Omit<Company, 'id' | 'created_at' | 'updated_at'>

export const companyService = {
  async getAll() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name')
    if (error) throw error
    return (data ?? []) as Company[]
  },

  async create(company: CompanyInsert) {
    const { data, error } = await supabase
      .from('companies')
      .insert(company)
      .select()
      .single()
    if (error) throw error
    return data as Company
  },

  async update(id: string, updates: Partial<Company>) {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Company
  },
}
