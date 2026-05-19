import { supabase } from '@/lib/supabase'
import { approvalsService } from '@/services/approvalsService'
import type { BudgetCategory, BudgetItem } from '@/types/database'

export interface BudgetVersion {
  id: string
  project_id: string
  version: number
  motivo: string
  actor: string | null
  snapshot: {
    categories: BudgetCategory[]
    items: BudgetItem[]
  }
  created_at: string
}

export const budgetVersionService = {
  async listByProject(projectId: string): Promise<BudgetVersion[]> {
    const { data, error } = await supabase
      .from('budget_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
    if (error) throw error
    return (data ?? []) as BudgetVersion[]
  },

  async getNextVersion(projectId: string): Promise<number> {
    const { data } = await supabase
      .from('budget_versions')
      .select('version')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)
    return ((data?.[0] as { version: number } | undefined)?.version ?? 0) + 1
  },

  // Toma un snapshot del presupuesto actual y lo persiste con motivo + autor.
  // Llamar ANTES de aplicar el cambio post-aprobación al presupuesto.
  async snapshot(projectId: string, motivo: string, actor?: string): Promise<BudgetVersion> {
    if (!motivo.trim()) throw new Error('Motivo obligatorio para versionar presupuesto')

    const [{ data: categories }, { data: items }] = await Promise.all([
      supabase.from('budget_categories').select('*').eq('project_id', projectId),
      // budget_items por categoría
      (async () => {
        const { data: cats } = await supabase.from('budget_categories').select('id').eq('project_id', projectId)
        const ids = (cats ?? []).map((c: { id: string }) => c.id)
        if (ids.length === 0) return { data: [] as BudgetItem[] }
        return supabase.from('budget_items').select('*').in('budget_category_id', ids)
      })(),
    ])

    const version = await this.getNextVersion(projectId)
    const snapshot = {
      categories: (categories ?? []) as BudgetCategory[],
      items: (items ?? []) as BudgetItem[],
    }

    const { data, error } = await supabase
      .from('budget_versions')
      .insert({
        project_id: projectId,
        version,
        motivo,
        actor: actor ?? null,
        snapshot,
      })
      .select()
      .single()
    if (error) throw error

    await approvalsService.log({
      entity_type: 'budget_category',
      entity_id: projectId,
      action: 'budget_edit_post_approval',
      actor_display_name: actor,
      payload_after: { version, categories: snapshot.categories.length, items: snapshot.items.length },
      motivo,
      metadata: { project_id: projectId, version },
    })

    return data as BudgetVersion
  },
}
