import { supabase } from '@/lib/supabase'

export interface ClosedMonth {
  id: string
  project_id: string
  year_month: string // YYYY-MM
  closed_by: string | null
  note: string | null
  closed_at: string
}

/**
 * Cierre de mes: congela los movimientos de dinero (transacciones) de un
 * proyecto en un mes. El candado real está en el servidor (migración 094);
 * aquí solo se registra/quita el cierre y se listan los meses cerrados.
 */
export const monthCloseService = {
  async listByProjects(projectIds: string[]): Promise<ClosedMonth[]> {
    if (projectIds.length === 0) return []
    const { data, error } = await supabase.from('closed_months').select('*').in('project_id', projectIds)
    if (error) throw error
    return (data ?? []) as ClosedMonth[]
  },

  async close(projectId: string, yearMonth: string, closedBy?: string, note?: string): Promise<ClosedMonth> {
    const { data, error } = await supabase
      .from('closed_months')
      .insert({ project_id: projectId, year_month: yearMonth, closed_by: closedBy ?? null, note: note ?? null })
      .select()
      .single()
    if (error) throw error
    return data as ClosedMonth
  },

  async reopen(projectId: string, yearMonth: string): Promise<void> {
    const { error } = await supabase
      .from('closed_months')
      .delete()
      .eq('project_id', projectId)
      .eq('year_month', yearMonth)
    if (error) throw error
  },
}
