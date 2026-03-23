import { supabase } from '@/lib/supabase'
import type { ContractCubication, Contractor } from '@/types/database'

export type CubicationWithContractor = ContractCubication & { contractor?: Contractor }

type CubicationInsert = {
  project_id: string
  contractor_id: string
  specialty: string
  original_budget?: number
  adjusted_budget?: number
  total_advanced?: number
}

type CubicationUpdate = Omit<CubicationInsert, 'project_id'>

function computeDerived(adjusted: number, advanced: number) {
  return {
    remaining: adjusted - advanced,
    completion_percent: adjusted > 0 ? Math.min((advanced / adjusted) * 100, 100) : 0,
  }
}

export const cubicationService = {
  async getByProject(projectId: string): Promise<CubicationWithContractor[]> {
    const { data, error } = await supabase
      .from('contract_cubications')
      .select('*, contractor:contractors(*)')
      .eq('project_id', projectId)
      .order('specialty')
    if (error) throw error
    return data as CubicationWithContractor[]
  },

  async create(item: CubicationInsert): Promise<CubicationWithContractor> {
    const original = item.original_budget ?? 0
    const adjusted = item.adjusted_budget ?? original
    const advanced = item.total_advanced ?? 0
    const { remaining, completion_percent } = computeDerived(adjusted, advanced)

    const { data, error } = await supabase
      .from('contract_cubications')
      .insert({ ...item, original_budget: original, adjusted_budget: adjusted, total_advanced: advanced, remaining, completion_percent })
      .select('*, contractor:contractors(*)')
      .single()
    if (error) throw error
    return data as CubicationWithContractor
  },

  async update(id: string, updates: CubicationUpdate): Promise<CubicationWithContractor> {
    const adjusted = updates.adjusted_budget ?? updates.original_budget ?? 0
    const advanced = updates.total_advanced ?? 0
    const { remaining, completion_percent } = computeDerived(adjusted, advanced)

    const { data, error } = await supabase
      .from('contract_cubications')
      .update({ ...updates, remaining, completion_percent })
      .eq('id', id)
      .select('*, contractor:contractors(*)')
      .single()
    if (error) throw error
    return data as CubicationWithContractor
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contract_cubications')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
