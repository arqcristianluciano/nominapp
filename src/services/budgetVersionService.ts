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
  /** Lista las versiones de presupuesto de un proyecto, más recientes primero. */
  async listByProject(projectId: string): Promise<BudgetVersion[]> {
    const { data, error } = await supabase
      .from('budget_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
    if (error) throw error
    return (data ?? []) as BudgetVersion[]
  },

  /** Devuelve el siguiente número de versión disponible para el proyecto. */
  async getNextVersion(projectId: string): Promise<number> {
    const { data, error } = await supabase
      .from('budget_versions')
      .select('version')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)
    if (error) throw error
    return ((data?.[0] as { version: number } | undefined)?.version ?? 0) + 1
  },

  /** Persiste un snapshot del presupuesto actual con motivo y autor (llamar antes de aplicar el cambio post-aprobación). */
  async snapshot(projectId: string, motivo: string, actor?: string): Promise<BudgetVersion> {
    if (!motivo.trim()) throw new Error('Motivo obligatorio para versionar presupuesto')

    const [{ data: categories, error: categoriesError }, { data: items, error: itemsError }] = await Promise.all([
      supabase.from('budget_categories').select('*').eq('project_id', projectId),
      // budget_items por categoría
      (async () => {
        const { data: cats, error: catsError } = await supabase
          .from('budget_categories')
          .select('id')
          .eq('project_id', projectId)
        if (catsError) throw catsError
        const ids = (cats ?? []).map((c: { id: string }) => c.id)
        if (ids.length === 0) return { data: [] as BudgetItem[], error: null }
        return supabase.from('budget_items').select('*').in('budget_category_id', ids)
      })(),
    ])
    if (categoriesError) throw categoriesError
    if (itemsError) throw itemsError

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
