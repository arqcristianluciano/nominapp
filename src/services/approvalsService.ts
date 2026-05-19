import { supabase } from '@/lib/supabase'

export type ApprovalEntity =
  | 'payroll_period'
  | 'purchase_requisition'
  | 'purchase_order'
  | 'inventory_movement'
  | 'budget_category'
  | 'budget_item'
  | 'contract_corte'

export type ApprovalAction =
  | 'submit_for_approval'
  | 'approve'
  | 'reject'
  | 'return_for_revision'
  | 'release'                    // OC pendiente_liberacion → liberada (regla 7.2)
  | 'validate_excess'            // solicitud que excede plan (regla 7.1)
  | 'override_stock'             // override de stock negativo (regla 7.5)
  | 'budget_edit_post_approval'  // versionado de presupuesto (regla 7.7)
  | 'status_change'
  | 'receive'                    // OC recibida en almacén

export interface LogApprovalInput {
  entity_type: ApprovalEntity
  entity_id: string
  action: ApprovalAction
  actor_user_id?: string | null
  actor_display_name?: string | null
  payload_before?: unknown
  payload_after?: unknown
  motivo?: string | null
  metadata?: Record<string, unknown>
}

export interface ApprovalRecord {
  id: string
  entity_type: ApprovalEntity
  entity_id: string
  action: ApprovalAction
  actor_user_id: string | null
  actor_display_name: string | null
  payload_before: unknown
  payload_after: unknown
  motivo: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export const approvalsService = {
  async log(input: LogApprovalInput): Promise<void> {
    const { error } = await supabase.from('approvals').insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      action: input.action,
      actor_user_id: input.actor_user_id ?? null,
      actor_display_name: input.actor_display_name ?? null,
      payload_before: input.payload_before ?? null,
      payload_after: input.payload_after ?? null,
      motivo: input.motivo ?? null,
      metadata: input.metadata ?? {},
    })
    if (error) throw error
  },

  async getHistory(entityType: ApprovalEntity, entityId: string): Promise<ApprovalRecord[]> {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as ApprovalRecord[]
  },

  async getRecent(limit = 50): Promise<ApprovalRecord[]> {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as ApprovalRecord[]
  },
}
