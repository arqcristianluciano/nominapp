import { supabase } from '@/lib/supabase'

export interface InventoryLot {
  id: string
  item_id: string
  lot_number: string | null
  quantity: number
  unit_cost: number | null
  received_date: string | null
  expiry_date: string | null
  notes: string | null
  created_at: string
}

export type CreateInventoryLotInput = Omit<InventoryLot, 'id' | 'created_at'>

export interface InventoryLotWithItem extends InventoryLot {
  item_name: string
  item_unit: string
}

export const lotService = {
  // Lotes activos (cantidad > 0) de todos los materiales del proyecto, con el
  // nombre/unidad del material y ordenados por vencimiento (los que vencen antes
  // primero; los sin vencimiento al final).
  async listByProject(projectId: string): Promise<InventoryLotWithItem[]> {
    const { data: items } = await supabase.from('inventory_items').select('id, name, unit').eq('project_id', projectId)
    const list = (items ?? []) as { id: string; name: string; unit: string }[]
    if (list.length === 0) return []
    const byId = new Map(list.map((i) => [i.id, i]))
    const { data, error } = await supabase
      .from('inventory_lots')
      .select('*')
      .in(
        'item_id',
        list.map((i) => i.id),
      )
      .gt('quantity', 0)
    if (error) throw error
    const lots = (data ?? []) as InventoryLot[]
    return lots
      .map((l) => ({
        ...l,
        item_name: byId.get(l.item_id)?.name ?? '—',
        item_unit: byId.get(l.item_id)?.unit ?? '',
      }))
      .sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0
        if (!a.expiry_date) return 1
        if (!b.expiry_date) return -1
        return a.expiry_date.localeCompare(b.expiry_date)
      })
  },

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
    const { data, error } = await supabase.from('inventory_lots').update(updates).eq('id', id).select().single()
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
