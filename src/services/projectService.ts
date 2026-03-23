import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/database'

export const projectService = {
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select('*, company:companies(*)')
      .order('name')
    if (error) throw error
    return data as Project[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*, company:companies(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Project
  },

  async create(project: {
    company_id: string
    name: string
    code: string
    location?: string
    dt_percent?: number
    admin_percent?: number
    transport_percent?: number
    planning_fee?: number
  }) {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select('*, company:companies(*)')
      .single()
    if (error) throw error
    return data as Project
  },

  async update(id: string, updates: Partial<Project>) {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, company:companies(*)')
      .single()
    if (error) throw error
    return data as Project
  },
}
