import { supabase } from '@/lib/supabase'

export interface InventoryLot {
  id: string
  item_id: string
  lot_number: string
  quantity: number
  unit_cost: number | null
  received_date: string | null
  expiration_date: string | null
  supplier_id: string | null
  notes: string | null
  created_at: string
}

export type CreateInventoryLotInput = Omit<InventoryLot, 'id' | 'created_at'>

export const lotService = {
  async list(itemId: string): Promise<InventoryLot[]> {
    const { data, error } = await supabase
      .from('inventory_lots')
      .select('*')
      .eq('item_id', itemId)
      .order('received_date', { ascending: true })
    if (error) throw error
    return (data ?? []) as InventoryLot[]
  },

  async create(input: CreateInventoryLotInput): Promise<InventoryLot> {
    const { data, error } = await supabase
      .from('inventory_lots')
      .insert({ ...input, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data as InventoryLot
  },

  async update(id: string, updates: Partial<InventoryLot>): Promise<InventoryLot> {
    const { data, error } = await supabase
      .from('inventory_lots')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as InventoryLot
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('inventory_lots').delete().eq('id', id)
    if (error) throw error
  },

  async getAvailable(itemId: string): Promise<InventoryLot[]> {
    const { data, error } = await supabase
      .from('inventory_lots')
      .select('*')
      .eq('item_id', itemId)
      .gt('quantity', 0)
      .order('received_date', { ascending: true })
    if (error) throw error
    return (data ?? []) as InventoryLot[]
  },
}
