import { supabase } from '@/lib/supabase'
import type { CustomIndirect, Project } from '@/types/database'
import { approvalsService } from '@/services/approvalsService'

const INDIRECT_FIELDS = [
  'dt_percent',
  'admin_percent',
  'transport_percent',
  'planning_fee',
  'custom_indirects',
] as const

type IndirectField = (typeof INDIRECT_FIELDS)[number]

function pickIndirects(source: Partial<Project>): Partial<Pick<Project, IndirectField>> {
  const result: Partial<Pick<Project, IndirectField>> = {}
  for (const key of INDIRECT_FIELDS) {
    if (key in source) {
      // @ts-expect-error indexed assignment by known keys
      result[key] = source[key]
    }
  }
  return result
}

export const projectService = {
  async getAll() {
    const { data, error } = await supabase.from('projects').select('*, company:companies(*)').order('name')
    if (error) throw error
    return data as Project[]
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('projects').select('*, company:companies(*)').eq('id', id).single()
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
    custom_indirects?: CustomIndirect[]
  }) {
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...project, custom_indirects: project.custom_indirects ?? [] })
      .select('*, company:companies(*)')
      .single()
    if (error) throw error
    return data as Project
  },

  async update(id: string, updates: Partial<Project>) {
    const touchesIndirects = INDIRECT_FIELDS.some((key) => key in updates)

    let before: Partial<Pick<Project, IndirectField>> | null = null
    if (touchesIndirects) {
      const { data: prev } = await supabase.from('projects').select(INDIRECT_FIELDS.join(',')).eq('id', id).single()
      before = prev ? pickIndirects(prev as unknown as Partial<Project>) : null
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, company:companies(*)')
      .single()
    if (error) throw error

    const updated = data as Project

    if (touchesIndirects) {
      await approvalsService
        .log({
          entity_type: 'project',
          entity_id: id,
          action: 'update_indirects',
          payload_before: before,
          payload_after: pickIndirects(updated),
        })
        .catch((err) => console.warn('[projectService.update] log de auditoria fallo', err))
    }

    return updated
  },
}
