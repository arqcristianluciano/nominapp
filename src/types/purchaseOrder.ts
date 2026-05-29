import type { Project, Supplier } from './database'

export type RequisitionStatus =
  | 'draft'
  | 'pendiente_validacion'
  | 'quoting'
  | 'pending_approval'
  | 'needs_revision'
  | 'pendiente_liberacion'
  | 'approved'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'rejected'

export type ResourceType = 'material' | 'labor' | 'equipment' | 'other'

export interface PurchaseRequisition {
  id: string
  project_id: string
  req_number: string
  description: string
  requested_by: string
  required_date: string | null
  status: RequisitionStatus
  notes: string | null
  approved_quote_id: string | null
  approved_by: string | null
  approved_at: string | null
  signature_data: string | null
  rejection_reason: string | null
  revision_notes: string | null
  payment_type: 'credit' | 'cash' | null
  ordered_at: string | null
  created_at: string
  updated_at: string
  // Imputación a partida (migración 006)
  budget_item_id: string | null
  budget_category_id: string | null
  quantity_requested: number | null
  unit: string | null
  resource_type: ResourceType | null
  excess_motivo: string | null
  validated_by: string | null
  validated_at: string | null
  planned_quantity_at_request: number | null
  available_quantity_at_request: number | null
  // Liberación / 1 cotización / recepción (migración 007)
  single_quote_justification: string | null
  released_by: string | null
  released_at: string | null
  received_at: string | null
  received_by: string | null
  project?: Project
  quotes?: PurchaseQuote[]
}

export interface PurchaseQuote {
  id: string
  requisition_id: string
  supplier_id: string
  quote_number: string | null
  valid_until: string | null
  subtotal: number
  tax_percent: number
  total: number
  negotiated_total: number | null
  negotiated_notes: string | null
  notes: string | null
  attachment_path: string | null
  supplier?: Supplier
  items?: PurchaseQuoteItem[]
}

export interface PurchaseQuoteItem {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
  received_quantity?: number
}

export const REQ_STATUS_LABEL: Record<RequisitionStatus, string> = {
  draft: 'Borrador',
  pendiente_validacion: 'Pendiente validación',
  quoting: 'En cotización',
  pending_approval: 'Pendiente aprobación',
  needs_revision: 'Requiere revisión',
  pendiente_liberacion: 'Pendiente liberación',
  approved: 'Aprobada',
  ordered: 'Orden colocada',
  partially_received: 'Recibida parcial',
  received: 'Recibida',
  rejected: 'Rechazada',
}

export const REQ_STATUS_COLOR: Record<RequisitionStatus, string> = {
  draft: 'bg-app-chip text-app-muted',
  pendiente_validacion: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  quoting: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  needs_revision: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  pendiente_liberacion: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  ordered: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  partially_received: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300',
  received: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
}
