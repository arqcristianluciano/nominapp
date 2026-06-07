import { supabase } from '@/lib/supabase'
import type { PriceListItem } from '@/types/database'

export const priceListService = {
  async getByProject(projectId: string): Promise<PriceListItem[]> {
    const { data, error } = await supabase
      .from('price_list_items')
      .select('*')
      .eq('project_id', projectId)
      .order('category')
    if (error) throw error
    return data as PriceListItem[]
  },

  async create(item: Omit<PriceListItem, 'id'>): Promise<PriceListItem> {
    const { data, error } = await supabase.from('price_list_items').insert(item).select().single()
    if (error) throw error
    return data as PriceListItem
  },

  async update(id: string, changes: Partial<Omit<PriceListItem, 'id'>>): Promise<PriceListItem> {
    const { data, error } = await supabase.from('price_list_items').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data as PriceListItem
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('price_list_items').delete().eq('id', id)
    if (error) throw error
  },

  async copyToProject(items: PriceListItem[], targetProjectId: string): Promise<number> {
    if (items.length === 0) return 0
    const rows = items.map((item) => {
      // Copiamos todos los campos pero soltamos el id (PK propia) y forzamos el proyecto destino.
      const row: Record<string, unknown> = { ...item, project_id: targetProjectId }
      delete row.id
      return row
    })
    const { error } = await supabase.from('price_list_items').insert(rows)
    if (error) throw error
    return items.length
  },
}
