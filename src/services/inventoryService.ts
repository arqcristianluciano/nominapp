import { supabase } from '@/lib/supabase'

export interface InventoryItem {
  id: string
  project_id: string
  name: string
  unit: string
  current_stock: number
  min_stock: number
  unit_cost: number
  created_at: string
}

export interface InventoryMovement {
  id: string
  item_id: string
  project_id: string
  type: 'in' | 'out'
  quantity: number
  date: string
  supplier_id: string | null
  notes: string | null
  created_at: string
  item?: { id: string; name: string; unit: string }
}

export const inventoryService = {
  async getItems(projectId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async createItem(item: Omit<InventoryItem, 'id' | 'created_at'>): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({ ...item, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateItem(id: string, item: Partial<InventoryItem>): Promise<void> {
    const { error } = await supabase.from('inventory_items').update(item).eq('id', id)
    if (error) throw error
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if (error) throw error
  },

  async getMovements(projectId: string): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, item:inventory_items(id,name,unit)')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async addMovement(
    movement: Omit<InventoryMovement, 'id' | 'created_at' | 'item'>
  ): Promise<void> {
    const now = new Date().toISOString()
    const { error: mvErr } = await supabase
      .from('inventory_movements')
      .insert({ ...movement, created_at: now })
    if (mvErr) throw mvErr

    const { data: item } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', movement.item_id)
      .single()

    const delta = movement.type === 'in' ? movement.quantity : -movement.quantity
    const newStock = (item?.current_stock ?? 0) + delta

    const { error: updateErr } = await supabase
      .from('inventory_items')
      .update({ current_stock: Math.max(0, newStock) })
      .eq('id', movement.item_id)
    if (updateErr) throw updateErr
  },

  getLowStockItems(items: InventoryItem[]): InventoryItem[] {
    return items.filter((i) => i.current_stock <= i.min_stock)
  },
}
