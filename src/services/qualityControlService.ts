import { supabase } from '@/lib/supabase'
import type { QualityControl } from '@/types/database'

type QCInsert = Omit<QualityControl, 'id' | 'status'>
type QCUpdate = Partial<Omit<QualityControl, 'id'>>

function computeStatus(actual?: number | null, expected?: number | null): 'passed' | 'failed' | null {
  if (actual == null || expected == null) return null
  return actual >= expected ? 'passed' : 'failed'
}

export const qualityControlService = {
  async getByProject(projectId: string): Promise<QualityControl[]> {
    const { data, error } = await supabase
      .from('quality_control')
      .select('*')
      .eq('project_id', projectId)
      .order('pour_date', { ascending: false })
    if (error) throw error
    return data as QualityControl[]
  },

  async create(qc: QCInsert): Promise<QualityControl> {
    const status = computeStatus(qc.actual_resistance, qc.expected_resistance)
    const { data, error } = await supabase
      .from('quality_control')
      .insert({ ...qc, status })
      .select()
      .single()
    if (error) throw error
    return data as QualityControl
  },

  async update(id: string, updates: QCUpdate): Promise<QualityControl> {
    const status = computeStatus(updates.actual_resistance, updates.expected_resistance)
    const { data, error } = await supabase
      .from('quality_control')
      .update({ ...updates, status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as QualityControl
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('quality_control')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
