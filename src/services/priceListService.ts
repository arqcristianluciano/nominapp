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
    const { data, error } = await supabase
      .from('price_list_items')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data as PriceListItem
  },

  async update(id: string, changes: Partial<Omit<PriceListItem, 'id'>>): Promise<PriceListItem> {
    const { data, error } = await supabase
      .from('price_list_items')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PriceListItem
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('price_list_items')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
