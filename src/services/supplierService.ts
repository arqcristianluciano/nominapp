import { supabase } from '@/lib/supabase'
import type { Supplier } from '@/types/database'

export const supplierService = {
  async getAll() {
    const { data, error } = await supabase.from('suppliers').select('*').order('name')
    if (error) throw error
    return data as Supplier[]
  },

  async create(supplier: {
    name: string
    rnc?: string | null
    contact_phone?: string | null
    bank_account?: string | null
    bank_name?: string | null
    tipo_cuenta?: 'ahorros' | 'corriente' | null
    payment_terms?: string | null
  }) {
    const { data, error } = await supabase.from('suppliers').insert(supplier).select().single()
    if (error) throw error
    return data as Supplier
  },

  async update(id: string, updates: Partial<Supplier>) {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Supplier
  },
}
