import { supabase } from '@/lib/supabase'
import type { PurchaseRequisition, PurchaseQuote, RequisitionStatus } from '@/types/purchaseOrder'
import { approvalsService } from '@/services/approvalsService'

function generateReqNumber(): string {
  const year = new Date().getFullYear()
  const seq = Math.floor(Math.random() * 9000) + 1000
  return `REQ-${year}-${seq}`
}

// Status que consumen presupuesto planificado (regla 7.1).
const COMMITTING_STATUSES: RequisitionStatus[] = [
  'quoting',
  'pending_approval',
  'approved',
  'ordered',
  'received',
]

export interface PartidaAvailability {
  budget_item_id: string
  planned_quantity: number
  committed_quantity: number
  available_quantity: number
}

export interface CreateRequisitionInput {
  project_id: string
  description: string
  requested_by: string
  required_date?: string
  notes?: string
  budget_item_id?: string | null
  budget_category_id?: string | null
  quantity_requested?: number | null
  unit?: string | null
  resource_type?: 'material' | 'labor' | 'equipment' | 'other' | null
}

export const requisitionService = {
  async getAll() {
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .select('*, project:projects(id, name, code)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as PurchaseRequisition[]
  },

  async getById(id: string) {
    const { data: reqData, error } = await supabase
      .from('purchase_requisitions')
      .select('*, project:projects(id, name, code)')
      .eq('id', id)
      .single()
    if (error) throw error

    const { data: quotesData } = await supabase
      .from('purchase_quotes')
      .select('*, supplier:suppliers(id, name)')
      .eq('requisition_id', id)

    const quotes: PurchaseQuote[] = await Promise.all(
      (quotesData || []).map(async (q: PurchaseQuote) => {
        const { data: items } = await supabase
          .from('purchase_quote_items')
          .select('*')
          .eq('quote_id', q.id)
        return { ...q, items: items || [] }
      })
    )

    return { ...reqData, quotes } as PurchaseRequisition
  },

  // Calcula cuánto queda disponible en una partida para nuevas solicitudes (regla 7.1).
  async getAvailabilityForBudgetItem(budgetItemId: string): Promise<PartidaAvailability> {
    const { data: item, error: itemErr } = await supabase
      .from('budget_items')
      .select('id, quantity')
      .eq('id', budgetItemId)
      .single()
    if (itemErr) throw itemErr

    const { data: requisitions, error: reqErr } = await supabase
      .from('purchase_requisitions')
      .select('quantity_requested, status')
      .eq('budget_item_id', budgetItemId)
      .in('status', COMMITTING_STATUSES)
    if (reqErr) throw reqErr

    const planned = Number(item?.quantity ?? 0)
    const committed = (requisitions ?? []).reduce(
      (sum: number, r: { quantity_requested: number | null }) =>
        sum + Number(r.quantity_requested ?? 0),
      0,
    )

    return {
      budget_item_id: budgetItemId,
      planned_quantity: planned,
      committed_quantity: committed,
      available_quantity: Math.max(0, planned - committed),
    }
  },

  async create(payload: CreateRequisitionInput) {
    // Si viene imputada a una partida con cantidad, evaluamos excedente.
    let plannedSnapshot: number | null = null
    let availableSnapshot: number | null = null
    let initialStatus: RequisitionStatus = 'draft'

    if (payload.budget_item_id && payload.quantity_requested && payload.quantity_requested > 0) {
      const avail = await this.getAvailabilityForBudgetItem(payload.budget_item_id)
      plannedSnapshot = avail.planned_quantity
      availableSnapshot = avail.available_quantity
      if (payload.quantity_requested > avail.available_quantity) {
        initialStatus = 'pendiente_validacion'
      }
    }

    const { data, error } = await supabase
      .from('purchase_requisitions')
      .insert({
        project_id: payload.project_id,
        description: payload.description,
        requested_by: payload.requested_by,
        required_date: payload.required_date || null,
        notes: payload.notes || null,
        budget_item_id: payload.budget_item_id ?? null,
        budget_category_id: payload.budget_category_id ?? null,
        quantity_requested: payload.quantity_requested ?? null,
        unit: payload.unit ?? null,
        resource_type: payload.resource_type ?? null,
        planned_quantity_at_request: plannedSnapshot,
        available_quantity_at_request: availableSnapshot,
        req_number: generateReqNumber(),
        status: initialStatus,
        approved_quote_id: null,
        approved_by: null,
        approved_at: null,
        signature_data: null,
        rejection_reason: null,
        payment_type: null,
        ordered_at: null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    const row = data as PurchaseRequisition

    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: row.id,
      action: 'status_change',
      actor_display_name: payload.requested_by,
      payload_after: { status: row.status, quantity_requested: payload.quantity_requested ?? null },
      motivo: initialStatus === 'pendiente_validacion'
        ? `Solicitud excede plan: solicitado ${payload.quantity_requested} vs disponible ${availableSnapshot}`
        : null,
      metadata: { req_number: row.req_number, project_id: row.project_id },
    })

    return row
  },

  // Validación expresa de Planificación / Gerente cuando la solicitud excede el plan.
  async validateExcess(id: string, validatedBy: string, motivo: string) {
    const before = await this.getById(id)
    if (before.status !== 'pendiente_validacion') {
      throw new Error('Solo se puede validar una solicitud en pendiente_validacion')
    }
    if (!motivo.trim()) throw new Error('Motivo obligatorio para validar excedente')

    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'quoting',
        excess_motivo: motivo,
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error

    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'validate_excess',
      actor_display_name: validatedBy,
      payload_before: { status: before.status, available: before.available_quantity_at_request },
      payload_after: { status: 'quoting' },
      motivo,
      metadata: { req_number: before.req_number, project_id: before.project_id },
    })
  },

  async submitForApproval(id: string, actor?: string) {
    const before = await this.getById(id)
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({ status: 'pending_approval', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'submit_for_approval',
      actor_display_name: actor,
      payload_before: { status: before.status },
      payload_after: { status: 'pending_approval' },
      metadata: { req_number: before.req_number, project_id: before.project_id },
    })
  },

  async approve(
    id: string,
    quoteId: string,
    approvedBy: string,
    signatureData: string,
    options?: { singleQuoteJustification?: string | null },
  ) {
    const before = await this.getById(id)
    const quotes = before.quotes ?? []
    if (quotes.length === 0) {
      throw new Error('No se puede aprobar sin cotizaciones')
    }
    if (quotes.length === 1) {
      if (!options?.singleQuoteJustification?.trim()) {
        throw new Error(
          'Aprobación con 1 sola cotización requiere justificación escrita (regla 7.3).',
        )
      }
    }

    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'approved',
        approved_quote_id: quoteId,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        signature_data: signatureData,
        single_quote_justification: options?.singleQuoteJustification?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error

    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'approve',
      actor_display_name: approvedBy,
      payload_before: { status: before.status, quotes_count: quotes.length },
      payload_after: { status: 'approved', approved_quote_id: quoteId },
      motivo: options?.singleQuoteJustification?.trim() || null,
      metadata: {
        req_number: before.req_number,
        project_id: before.project_id,
        single_quote: quotes.length === 1,
      },
    })
  },

  // Liberación del Gerente para OC con >=2 cotizaciones (regla 7.2).
  // En la app actual approve() ya cumple este rol; release() queda como
  // alias semántico explícito para futuras divisiones de responsabilidad
  // (Comprador aprueba selección, Gerente libera para emisión).
  async release(id: string, releasedBy: string) {
    const before = await this.getById(id)
    if (before.status !== 'approved') {
      throw new Error('Solo se libera una OC ya aprobada')
    }
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        released_by: releasedBy,
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'release',
      actor_display_name: releasedBy,
      payload_before: { status: before.status },
      payload_after: { released: true },
      metadata: { req_number: before.req_number, project_id: before.project_id },
    })
  },

  async reject(id: string, reason: string, actor?: string) {
    const before = await this.getById(id)
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'reject',
      actor_display_name: actor,
      payload_before: { status: before.status },
      payload_after: { status: 'rejected' },
      motivo: reason,
      metadata: { req_number: before.req_number, project_id: before.project_id },
    })
  },

  async returnForRevision(id: string, revisionNotes: string, actor?: string) {
    const before = await this.getById(id)
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'needs_revision',
        revision_notes: revisionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'return_for_revision',
      actor_display_name: actor,
      payload_before: { status: before.status },
      payload_after: { status: 'needs_revision' },
      motivo: revisionNotes,
      metadata: { req_number: before.req_number, project_id: before.project_id },
    })
  },

  async placeOrder(id: string, paymentType: 'credit' | 'cash', actor?: string) {
    const before = await this.getById(id)
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'ordered',
        payment_type: paymentType,
        ordered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'status_change',
      actor_display_name: actor,
      payload_before: { status: before.status },
      payload_after: { status: 'ordered', payment_type: paymentType },
      metadata: { req_number: before.req_number, project_id: before.project_id },
    })
  },

  async markReceived(id: string, receivedBy: string) {
    const before = await this.getById(id)
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'received',
        received_at: new Date().toISOString(),
        received_by: receivedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'receive',
      actor_display_name: receivedBy,
      payload_before: { status: before.status },
      payload_after: { status: 'received' },
      metadata: { req_number: before.req_number, project_id: before.project_id },
    })
  },

  async delete(id: string) {
    const { data: quotes } = await supabase
      .from('purchase_quotes')
      .select('id')
      .eq('requisition_id', id)
    for (const q of quotes || []) {
      await supabase.from('purchase_quote_items').delete().eq('quote_id', q.id)
    }
    await supabase.from('purchase_quotes').delete().eq('requisition_id', id)
    const { error } = await supabase.from('purchase_requisitions').delete().eq('id', id)
    if (error) throw error
  },
}
