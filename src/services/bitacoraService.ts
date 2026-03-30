import { supabase } from '@/lib/supabase'

export interface BitacoraEntry {
  id: string
  project_id: string
  date: string
  weather: string
  temp_c: number | null
  work_summary: string
  workforce_count: number
  equipment: string | null
  visitors: string | null
  incidents: string | null
  notes: string | null
  created_by: string
  created_at: string
}

export type BitacoraFormData = Omit<BitacoraEntry, 'id' | 'created_at'>

export const bitacoraService = {
  async getByProject(projectId: string): Promise<BitacoraEntry[]> {
    const { data, error } = await supabase
      .from('bitacora_entries')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async create(entry: BitacoraFormData): Promise<BitacoraEntry> {
    const { data, error } = await supabase
      .from('bitacora_entries')
      .insert({ ...entry, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, entry: Partial<BitacoraFormData>): Promise<void> {
    const { error } = await supabase
      .from('bitacora_entries')
      .update(entry)
      .eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('bitacora_entries').delete().eq('id', id)
    if (error) throw error
  },
}
