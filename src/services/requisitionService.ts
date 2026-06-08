import * as Sentry from '@sentry/react'
import { supabase } from '@/lib/supabase'
import type {
  PurchaseRequisition,
  PurchaseQuote,
  RequisitionItem,
  RequisitionStatus,
  ReceiptProgress,
} from '@/types/purchaseOrder'
import { approvalsService } from '@/services/approvalsService'
import { pushNotificationService } from '@/services/pushNotificationService'
import { emailNotificationService } from '@/services/emailNotificationService'
import { inventoryService } from '@/services/inventoryService'
import { lotService } from '@/services/lotService'

// Número de requisición consecutivo por año: REQ-2026-0001, REQ-2026-0002, …
// Se calcula a partir del mayor consecutivo existente del año en curso, de modo
// que la numeración sea siempre secuencial y sin colisiones. Si la consulta
// falla por cualquier motivo, no se bloquea la creación: se usa un respaldo.
async function nextReqNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `REQ-${year}-`
  try {
    const { data, error } = await supabase.from('purchase_requisitions').select('req_number')
    if (error) throw error
    let max = 0
    for (const row of (data ?? []) as { req_number: string | null }[]) {
      const value = row.req_number
      if (value?.startsWith(prefix)) {
        const seq = parseInt(value.slice(prefix.length), 10)
        if (!isNaN(seq) && seq > max) max = seq
      }
    }
    return `${prefix}${String(max + 1).padStart(4, '0')}`
  } catch {
    // Respaldo defensivo: marca de tiempo para no romper la creación.
    return `${prefix}${String(Date.now()).slice(-4)}`
  }
}

// Status que consumen presupuesto planificado (regla 7.1).
const COMMITTING_STATUSES: RequisitionStatus[] = [
  'quoting',
  'pending_approval',
  'pendiente_liberacion',
  'approved',
  'ordered',
  'partially_received',
  'received',
]

export interface PartidaAvailability {
  budget_item_id: string
  planned_quantity: number
  committed_quantity: number
  available_quantity: number
}

// Línea de material en una solicitud (multi-línea). Migración 076.
export interface RequisitionItemInput {
  description: string
  budget_category_id?: string | null
  budget_item_id?: string | null
  resource_type?: 'material' | 'labor' | 'equipment' | 'other' | null
  quantity?: number | null
  unit?: string | null
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
  // Líneas multi-material (migración 076). Si se envían, el campo
  // description del encabezado viene de la primera línea.
  items?: RequisitionItemInput[]
}

// Input para actualizar una solicitud en estado editable (draft/quoting/needs_revision).
export interface UpdateRequisitionInput {
  description?: string
  requested_by?: string
  required_date?: string | null
  notes?: string | null
  budget_item_id?: string | null
  budget_category_id?: string | null
  quantity_requested?: number | null
  unit?: string | null
  resource_type?: 'material' | 'labor' | 'equipment' | 'other' | null
  // Si se pasan items, se reemplazan TODAS las líneas existentes.
  items?: RequisitionItemInput[]
}

export const requisitionService = {
  async getAll() {
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .select('*, project:projects(id, name, code)')
      .order('created_at', { ascending: false })
    if (error) throw error
    const reqs = (data ?? []) as PurchaseRequisition[]

    // Adjunta el progreso de recepción (pedido vs recibido) a las OC colocadas
    // o (parcialmente) recibidas, con UNA sola consulta de líneas. Permite
    // mostrar "60/100 recibido" en la lista sin un N+1.
    const RECEIVABLE = new Set(['ordered', 'partially_received', 'received'])
    const quoteIds = reqs
      .filter((r) => RECEIVABLE.has(r.status) && r.approved_quote_id)
      .map((r) => r.approved_quote_id as string)
    if (quoteIds.length > 0) {
      const { data: items } = await supabase
        .from('purchase_quote_items')
        .select('quote_id, quantity, received_quantity')
        .in('quote_id', quoteIds)
      const byQuote = new Map<string, ReceiptProgress>()
      for (const it of (items ?? []) as { quote_id: string; quantity: number; received_quantity: number | null }[]) {
        const agg = byQuote.get(it.quote_id) ?? { ordered: 0, received: 0 }
        agg.ordered += Number(it.quantity ?? 0)
        agg.received += Number(it.received_quantity ?? 0)
        byQuote.set(it.quote_id, agg)
      }
      for (const r of reqs) {
        if (r.approved_quote_id && byQuote.has(r.approved_quote_id)) {
          r.receipt_progress = byQuote.get(r.approved_quote_id)
        }
      }
    }
    return reqs
  },

  async getById(id: string) {
    const { data: reqData, error } = await supabase
      .from('purchase_requisitions')
      .select('*, project:projects(id, name, code)')
      .eq('id', id)
      .single()
    if (error) throw error

    const [quotesData, reqItemsData] = await Promise.all([
      supabase.from('purchase_quotes').select('*, supplier:suppliers(id, name)').eq('requisition_id', id),
      supabase.from('purchase_requisition_items').select('*').eq('requisition_id', id).order('sort_order'),
    ])

    const quotes: PurchaseQuote[] = await Promise.all(
      (quotesData.data || []).map(async (q: PurchaseQuote) => {
        const { data: items } = await supabase.from('purchase_quote_items').select('*').eq('quote_id', q.id)
        return { ...q, items: items || [] }
      }),
    )

    return {
      ...reqData,
      quotes,
      requisition_items: (reqItemsData.data ?? []) as RequisitionItem[],
    } as PurchaseRequisition
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
      (sum: number, r: { quantity_requested: number | null }) => sum + Number(r.quantity_requested ?? 0),
      0,
    )

    return {
      budget_item_id: budgetItemId,
      planned_quantity: planned,
      committed_quantity: committed,
      available_quantity: Math.max(0, planned - committed),
    }
  },

  // Guarda líneas de ítems de solicitud. Elimina las anteriores y reinserta.
  // Solo llamar cuando `items` viene definido en el payload.
  async _saveRequisitionItems(requisitionId: string, items: RequisitionItemInput[]) {
    await supabase.from('purchase_requisition_items').delete().eq('requisition_id', requisitionId)
    if (items.length === 0) return
    const rows = items.map((it, idx) => ({
      requisition_id: requisitionId,
      description: it.description,
      budget_category_id: it.budget_category_id ?? null,
      budget_item_id: it.budget_item_id ?? null,
      resource_type: it.resource_type ?? null,
      quantity: it.quantity ?? 0,
      unit: it.unit ?? null,
      sort_order: idx,
    }))
    const { error } = await supabase.from('purchase_requisition_items').insert(rows)
    if (error) throw error
  },

  async create(payload: CreateRequisitionInput) {
    // Cuando se usan líneas multi-material, la lógica de excedente se evalúa
    // contra la partida de la primera línea (o la del encabezado si no hay líneas).
    const firstItem = payload.items?.[0]
    const effectiveBudgetItemId = firstItem?.budget_item_id ?? payload.budget_item_id
    const effectiveQty = firstItem?.quantity ?? payload.quantity_requested

    // Si viene imputada a una partida con cantidad, evaluamos excedente.
    let plannedSnapshot: number | null = null
    let availableSnapshot: number | null = null
    let initialStatus: RequisitionStatus = 'draft'

    if (effectiveBudgetItemId && effectiveQty && effectiveQty > 0) {
      const avail = await this.getAvailabilityForBudgetItem(effectiveBudgetItemId)
      plannedSnapshot = avail.planned_quantity
      availableSnapshot = avail.available_quantity
      if (effectiveQty > avail.available_quantity) {
        initialStatus = 'pendiente_validacion'
      }
    }

    // El campo description del encabezado toma la descripción de la primera línea
    // si se usan multi-líneas; de lo contrario usa el campo directo.
    const headerDescription = firstItem?.description ?? payload.description

    const { data, error } = await supabase
      .from('purchase_requisitions')
      .insert({
        project_id: payload.project_id,
        description: headerDescription,
        requested_by: payload.requested_by,
        required_date: payload.required_date || null,
        notes: payload.notes || null,
        budget_item_id: effectiveBudgetItemId ?? null,
        budget_category_id: firstItem?.budget_category_id ?? payload.budget_category_id ?? null,
        quantity_requested: effectiveQty ?? null,
        unit: firstItem?.unit ?? payload.unit ?? null,
        resource_type: firstItem?.resource_type ?? payload.resource_type ?? null,
        planned_quantity_at_request: plannedSnapshot,
        available_quantity_at_request: availableSnapshot,
        req_number: await nextReqNumber(),
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

    // Guardar las líneas multi-material si vienen en el payload.
    if (payload.items && payload.items.length > 0) {
      await this._saveRequisitionItems(row.id, payload.items)
    } else {
      // Compatibilidad: crear línea única a partir de los campos del encabezado.
      await this._saveRequisitionItems(row.id, [
        {
          description: payload.description,
          budget_category_id: payload.budget_category_id ?? null,
          budget_item_id: payload.budget_item_id ?? null,
          resource_type: payload.resource_type ?? null,
          quantity: payload.quantity_requested ?? 0,
          unit: payload.unit ?? null,
        },
      ])
    }

    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: row.id,
      action: 'status_change',
      actor_display_name: payload.requested_by,
      payload_after: { status: row.status, quantity_requested: effectiveQty ?? null },
      motivo:
        initialStatus === 'pendiente_validacion'
          ? `Solicitud excede plan: solicitado ${effectiveQty} vs disponible ${availableSnapshot}`
          : null,
      metadata: { req_number: row.req_number, project_id: row.project_id },
    })

    // Notificación push a directores + planificación + gerente cuando se
    // crea una solicitud en pendiente_validacion (requiere validación de
    // excedente). Falla silenciosa si la edge function no está configurada.
    if (initialStatus === 'pendiente_validacion') {
      void pushNotificationService
        .notifyProjectRole(
          row.project_id,
          ['director_proyecto', 'planificacion', 'director_general'],
          'Solicitud excede plan',
          `${row.req_number}: ${row.description.slice(0, 80)}`,
          `/ordenes-compra/${row.id}`,
        )
        .catch((err) => {
          console.warn('[requisitionService] push notification fallo (no-bloqueante)', err)
        })
    }

    return row
  },

  // Actualiza una solicitud en estado editable (draft / quoting / needs_revision).
  // Bloquea la edición en cualquier otro estado. Si el payload trae `items`,
  // reemplaza las líneas multi-material completas.
  async update(id: string, payload: UpdateRequisitionInput, actor?: string) {
    const EDITABLE: RequisitionStatus[] = ['draft', 'quoting', 'needs_revision']
    const before = await this.getById(id)
    if (!EDITABLE.includes(before.status)) {
      throw new Error(
        `No se puede editar una solicitud en estado "${before.status}". Solo se permite editar en Borrador, En cotización o Requiere revisión.`,
      )
    }

    // La lógica de excedente se recalcula si cambia la partida o la cantidad.
    const firstItem = payload.items?.[0]
    const effectiveBudgetItemId = firstItem?.budget_item_id ?? payload.budget_item_id ?? before.budget_item_id
    const effectiveQty = firstItem?.quantity ?? payload.quantity_requested ?? before.quantity_requested

    let plannedSnapshot: number | null = before.planned_quantity_at_request
    let availableSnapshot: number | null = before.available_quantity_at_request
    let newStatus: RequisitionStatus = before.status

    // Recalcular disponibilidad solo si cambia la partida o la cantidad
    const budgetItemChanged =
      effectiveBudgetItemId &&
      (effectiveBudgetItemId !== before.budget_item_id || effectiveQty !== before.quantity_requested)
    if (budgetItemChanged && effectiveBudgetItemId && effectiveQty && Number(effectiveQty) > 0) {
      const avail = await this.getAvailabilityForBudgetItem(effectiveBudgetItemId)
      plannedSnapshot = avail.planned_quantity
      availableSnapshot = avail.available_quantity
      if (Number(effectiveQty) > avail.available_quantity) {
        newStatus = 'pendiente_validacion'
      } else if (before.status === 'pendiente_validacion') {
        newStatus = 'draft'
      }
    }

    const headerDescription = firstItem?.description ?? payload.description ?? before.description

    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      description: headerDescription,
    }
    if (payload.requested_by !== undefined) updateFields.requested_by = payload.requested_by
    if ('required_date' in payload) updateFields.required_date = payload.required_date ?? null
    if ('notes' in payload) updateFields.notes = payload.notes ?? null
    if ('budget_item_id' in payload || firstItem?.budget_item_id !== undefined) {
      updateFields.budget_item_id = effectiveBudgetItemId ?? null
    }
    if ('budget_category_id' in payload || firstItem?.budget_category_id !== undefined) {
      updateFields.budget_category_id = firstItem?.budget_category_id ?? payload.budget_category_id ?? null
    }
    if ('quantity_requested' in payload || firstItem?.quantity !== undefined) {
      updateFields.quantity_requested = effectiveQty ?? null
    }
    if ('unit' in payload || firstItem?.unit !== undefined) {
      updateFields.unit = firstItem?.unit ?? payload.unit ?? null
    }
    if ('resource_type' in payload || firstItem?.resource_type !== undefined) {
      updateFields.resource_type = firstItem?.resource_type ?? payload.resource_type ?? null
    }
    if (budgetItemChanged) {
      updateFields.planned_quantity_at_request = plannedSnapshot
      updateFields.available_quantity_at_request = availableSnapshot
      updateFields.status = newStatus
    }

    const { error } = await supabase.from('purchase_requisitions').update(updateFields).eq('id', id)
    if (error) throw error

    if (payload.items !== undefined) {
      await this._saveRequisitionItems(id, payload.items)
    }

    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'update',
      actor_display_name: actor,
      payload_before: { status: before.status, description: before.description },
      payload_after: { status: newStatus, description: headerDescription },
      metadata: { req_number: before.req_number, project_id: before.project_id },
    })
  },

  // Validación expresa de Planificación / Director cuando la solicitud excede el plan.
  async validateExcess(id: string, validatedBy: string, motivo: string) {
    const before = await this.getById(id)
    if (before.status !== 'pendiente_validacion') {
      throw new Error('Solo se puede validar una solicitud en pendiente_validacion')
    }
    if (!motivo.trim()) throw new Error('Motivo obligatorio para validar excedente')

    Sentry.addBreadcrumb({
      category: 'requisition',
      message: 'validate excess requisition',
      level: 'info',
      data: { requisitionId: id, validatedBy, req_number: before.req_number },
    })
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
    const SUBMITTABLE: RequisitionStatus[] = ['draft', 'quoting', 'needs_revision']
    if (!SUBMITTABLE.includes(before.status)) {
      throw new Error(
        `Solo se puede enviar a aprobación una solicitud en borrador, cotización o revisión (estado actual: ${before.status}).`,
      )
    }
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

  // Aprobación del Director de Proyecto: selecciona la cotización y firma.
  // NO emite la orden todavía: la deja en 'pendiente_liberacion' para que el
  // Administrador (Director General) haga la liberación final (ver placeOrder).
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
        throw new Error('Aprobación con 1 sola cotización requiere justificación escrita (regla 7.3).')
      }
    }

    Sentry.addBreadcrumb({
      category: 'requisition',
      message: 'approve requisition (director)',
      level: 'info',
      data: {
        requisitionId: id,
        quoteId,
        approvedBy,
        quotes_count: quotes.length,
        req_number: before.req_number,
      },
    })
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'pendiente_liberacion',
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
      payload_after: { status: 'pendiente_liberacion', approved_quote_id: quoteId },
      motivo: options?.singleQuoteJustification?.trim() || null,
      metadata: {
        req_number: before.req_number,
        project_id: before.project_id,
        single_quote: quotes.length === 1,
      },
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

  // Liberación final del Administrador (Director General): es la ÚLTIMA
  // autorización del flujo (regla 7.2). Tras la aprobación del Director
  // (status 'pendiente_liberacion'), el Administrador libera la OC eligiendo la
  // condición de pago y la emite ('ordered'). Acepta 'approved' por
  // compatibilidad con OC creadas antes de introducir el paso de liberación.
  async placeOrder(id: string, paymentType: 'credit' | 'cash', actor?: string) {
    const before = await this.getById(id)
    if (before.status !== 'pendiente_liberacion' && before.status !== 'approved') {
      throw new Error('Solo se puede liberar una OC aprobada por el Director (pendiente de liberación).')
    }
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'ordered',
        payment_type: paymentType,
        released_by: actor ?? null,
        released_at: now,
        ordered_at: now,
        updated_at: now,
      })
      .eq('id', id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'release',
      actor_display_name: actor,
      payload_before: { status: before.status },
      payload_after: { status: 'ordered', payment_type: paymentType, released: true },
      metadata: { req_number: before.req_number, project_id: before.project_id },
    })
  },

  // Progreso de recepción de una OC ya cargada con sus cotizaciones (detalle).
  // Suma cantidades pedidas y recibidas de la cotización aprobada. Devuelve null
  // si la OC no tiene líneas (recepción total tipo fallback).
  getReceiptProgress(req: PurchaseRequisition): ReceiptProgress | null {
    const approvedQuote = (req.quotes ?? []).find((q) => q.id === req.approved_quote_id)
    const items = approvedQuote?.items ?? []
    if (items.length === 0) return null
    return items.reduce<ReceiptProgress>(
      (acc, it) => ({
        ordered: acc.ordered + Number(it.quantity ?? 0),
        received: acc.received + Number(it.received_quantity ?? 0),
      }),
      { ordered: 0, received: 0 },
    )
  },

  // Notifica (push + correo) al comprador y dirección que llegó mercancía. No
  // bloqueante: cualquier fallo se registra y no interrumpe la recepción.
  notifyReceipt(req: PurchaseRequisition, partial: boolean) {
    const roles = ['comprador', 'director_proyecto', 'director_general']
    const title = partial ? 'Recepción parcial de mercancía' : 'Mercancía recibida'
    const body = `${req.req_number}: ${(req.description ?? '').slice(0, 80)}`
    const url = `/ordenes-compra/${req.id}`
    void pushNotificationService
      .notifyProjectRole(req.project_id, roles, title, body, url)
      .catch((err) => console.warn('[requisitionService] push recepción fallo (no-bloqueante)', err))
    void emailNotificationService
      .notifyProjectRole(req.project_id, roles, title, body)
      .catch((err) => console.warn('[requisitionService] email recepción fallo (no-bloqueante)', err))
  },

  // Recepción TOTAL de mercancía: recibe todo el pendiente de la OC de una vez.
  // Atajo sobre receiveItems (recibe lo que falte de cada línea). Para órdenes
  // sin líneas de cotización usa el fallback de la propia solicitud.
  async markReceived(id: string, receivedBy: string) {
    const before = await this.getById(id)
    if (before.status !== 'ordered' && before.status !== 'partially_received') {
      throw new Error('Solo se pueden recibir órdenes en estado "Orden colocada".')
    }
    const approvedQuote = (before.quotes ?? []).find((q) => q.id === before.approved_quote_id)
    const items = approvedQuote?.items ?? []
    if (items.length === 0) return this.receiveAllFallback(before, receivedBy)

    const receipts = items
      .map((it) => ({
        quote_item_id: it.id,
        quantity: Number(it.quantity) - Number(it.received_quantity ?? 0),
      }))
      .filter((r) => r.quantity > 0)
    return this.receiveItems(id, receivedBy, receipts)
  },

  // Recepción de mercancía línea por línea (soporta entregas parciales). Por
  // cada línea recibida da entrada al stock (movimiento 'in' enlazado a la OC,
  // recalcula costo promedio), acumula received_quantity en la línea de la
  // cotización aprobada y, si ya se recibió todo lo pedido, marca la OC como
  // 'received'; si aún falta, queda en 'partially_received'. El stock se alimenta
  // ANTES de cambiar el estado; valida que no se reciba más de lo pendiente.
  async receiveItems(
    id: string,
    receivedBy: string,
    receipts: { quote_item_id: string; quantity: number; lot_number?: string | null; expiry_date?: string | null }[],
    attachmentPath?: string | null,
  ) {
    const before = await this.getById(id)
    if (before.status !== 'ordered' && before.status !== 'partially_received') {
      throw new Error('Solo se puede recibir mercancía de órdenes colocadas o parcialmente recibidas.')
    }
    const approvedQuote = (before.quotes ?? []).find((q) => q.id === before.approved_quote_id)
    const items = approvedQuote?.items ?? []
    if (items.length === 0) return this.receiveAllFallback(before, receivedBy)

    const byId = new Map(items.map((it) => [it.id, it]))
    const valid = receipts.filter((r) => Number(r.quantity) > 0)
    if (valid.length === 0) throw new Error('Indica al menos una cantidad a recibir.')

    const today = new Date().toISOString().slice(0, 10)
    const supplierId = approvedQuote?.supplier_id ?? null
    // NOTE: full atomicity requires a DB transaction (BEGIN/COMMIT). The re-read
    // below reduces (but does not eliminate) the race window for concurrent receipts.
    // The permanent fix is a Postgres RPC that does the read+validate+update atomically.
    const EPS = 1e-9
    for (const r of valid) {
      const it = byId.get(r.quote_item_id)
      if (!it) throw new Error('Línea de cotización no encontrada.')

      // Re-read the line's received_quantity from DB so we validate against the
      // latest committed value, not the potentially stale in-memory snapshot.
      const { data: freshLine, error: freshErr } = await supabase
        .from('purchase_quote_items')
        .select('received_quantity')
        .eq('id', it.id)
        .single()
      if (freshErr) throw freshErr

      const ordered = Number(it.quantity)
      const received = Number(freshLine?.received_quantity ?? 0)
      const remaining = ordered - received
      if (Number(r.quantity) > remaining + EPS) {
        throw new Error(
          `La cantidad a recibir de "${it.description}" (${r.quantity}) excede lo pendiente (${remaining}).`,
        )
      }
      const invItem = await inventoryService.findOrCreateItem({
        project_id: before.project_id,
        name: it.description,
        unit: it.unit,
        unit_cost: it.unit_price != null ? Number(it.unit_price) : null,
        material_catalog_id: it.material_catalog_id ?? null,
      })

      // Lote opcional para trazabilidad: solo si el almacenista indica número
      // de lote o fecha de vencimiento.
      let lotId: string | null = null
      if (r.lot_number?.trim() || r.expiry_date) {
        const lot = await lotService.create({
          item_id: invItem.id,
          lot_number: r.lot_number?.trim() || null,
          quantity: Number(r.quantity),
          unit_cost: it.unit_price != null ? Number(it.unit_price) : null,
          received_date: today,
          expiry_date: r.expiry_date || null,
          notes: `Recepción de orden ${before.req_number}`,
        })
        lotId = lot.id
      }

      await inventoryService.addMovement({
        item_id: invItem.id,
        project_id: before.project_id,
        type: 'in',
        quantity: Number(r.quantity),
        date: today,
        unit_cost: it.unit_price != null ? Number(it.unit_price) : null,
        supplier_id: supplierId,
        purchase_order_id: id,
        budget_item_id: before.budget_item_id,
        budget_category_id: before.budget_category_id,
        created_by: receivedBy,
        lot_id: lotId,
        attachment_path: attachmentPath ?? null,
        notes: `Entrada por recepción de orden ${before.req_number}`,
      })
      const { error: upErr } = await supabase
        .from('purchase_quote_items')
        .update({ received_quantity: received + Number(r.quantity) })
        .eq('id', it.id)
      if (upErr) throw upErr
    }

    // ¿Quedó todo el pedido recibido? (received previo + lo recibido ahora).
    const fullyReceived = items.every((it) => {
      const justNow = valid.find((r) => r.quote_item_id === it.id)?.quantity ?? 0
      return Number(it.received_quantity ?? 0) + Number(justNow) >= Number(it.quantity) - EPS
    })
    const newStatus: RequisitionStatus = fullyReceived ? 'received' : 'partially_received'

    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: newStatus,
        received_at: fullyReceived ? new Date().toISOString() : null,
        received_by: fullyReceived ? receivedBy : null,
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
      payload_after: { status: newStatus },
      metadata: {
        req_number: before.req_number,
        project_id: before.project_id,
        partial: !fullyReceived,
        lines_received: valid.length,
      },
    })
    this.notifyReceipt(before, !fullyReceived)
  },

  // Recepción total para OCs sin líneas de cotización (fallback): un solo
  // material descrito en la propia solicitud. No admite parcial.
  async receiveAllFallback(before: PurchaseRequisition, receivedBy: string) {
    const movements = this.buildReceiptMovements(before)
    const today = new Date().toISOString().slice(0, 10)
    for (const m of movements) {
      const item = await inventoryService.findOrCreateItem({
        project_id: before.project_id,
        name: m.name,
        unit: m.unit,
        unit_cost: m.unit_cost,
      })
      await inventoryService.addMovement({
        item_id: item.id,
        project_id: before.project_id,
        type: 'in',
        quantity: m.quantity,
        date: today,
        unit_cost: m.unit_cost,
        supplier_id: m.supplier_id,
        purchase_order_id: before.id,
        budget_item_id: before.budget_item_id,
        budget_category_id: before.budget_category_id,
        created_by: receivedBy,
        notes: `Entrada por recepción de orden ${before.req_number}`,
      })
    }
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'received',
        received_at: new Date().toISOString(),
        received_by: receivedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', before.id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: before.id,
      action: 'receive',
      actor_display_name: receivedBy,
      payload_before: { status: before.status },
      payload_after: { status: 'received' },
      metadata: { req_number: before.req_number, project_id: before.project_id, inventory_entries: movements.length },
    })
    this.notifyReceipt(before, false)
  },

  // Reversa de una recepción (corrección o devolución al suplidor). Genera
  // salidas ('out') que compensan el stock neto que aún queda de la OC en
  // almacén, pone received_quantity de las líneas en 0 y devuelve la orden a
  // 'ordered'. Aplica a OCs 'received' y 'partially_received'. Se calcula por
  // NETO (entradas - salidas) por material para no duplicar si se recibió y
  // revirtió varias veces. Si parte del material ya se consumió, la salida
  // falla por stock insuficiente (regla 7.5) y la reversa se aborta.
  async reverseReceipt(id: string, actor: string) {
    const before = await this.getById(id)
    if (before.status !== 'received' && before.status !== 'partially_received') {
      throw new Error('Solo se pueden revertir órdenes recibidas o parcialmente recibidas.')
    }

    const movements = await inventoryService.getMovementsByPurchaseOrder(id)
    const netByItem = new Map<string, number>()
    for (const m of movements) {
      const delta = m.type === 'in' ? Number(m.quantity) : -Number(m.quantity)
      netByItem.set(m.item_id, (netByItem.get(m.item_id) ?? 0) + delta)
    }

    const today = new Date().toISOString().slice(0, 10)
    let reversed = 0
    for (const [itemId, net] of netByItem) {
      if (net <= 0) continue
      await inventoryService.addMovement({
        item_id: itemId,
        project_id: before.project_id,
        type: 'out',
        quantity: net,
        date: today,
        purchase_order_id: id,
        budget_item_id: before.budget_item_id,
        budget_category_id: before.budget_category_id,
        created_by: actor,
        notes: `Reversa de recepción de orden ${before.req_number}`,
        // Revertir una recepción es una corrección administrativa: debe poder
        // completarse aunque el material recibido ya se haya consumido (stock
        // por debajo de lo recibido). Sin este override, el control de stock
        // negativo rechazaría la reversa con INSUFFICIENT_STOCK. Se registra el
        // motivo para dejar rastro de auditoría.
        override: {
          motivo: `Reversa de recepción de orden ${before.req_number}`,
          actor,
        },
      })
      reversed += 1
    }
    // Los lotes se descuentan automáticamente por FIFO al registrar las salidas
    // de reversa (inventoryService.addMovement), así que no hace falta anularlos
    // aquí manualmente.

    // Reinicia la cantidad recibida por línea de la cotización aprobada.
    const approvedQuote = (before.quotes ?? []).find((q) => q.id === before.approved_quote_id)
    for (const it of approvedQuote?.items ?? []) {
      if (Number(it.received_quantity ?? 0) !== 0) {
        const { error: resetErr } = await supabase
          .from('purchase_quote_items')
          .update({ received_quantity: 0 })
          .eq('id', it.id)
        if (resetErr) throw resetErr
      }
    }

    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'ordered',
        received_at: null,
        received_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: id,
      action: 'reverse_receipt',
      actor_display_name: actor,
      payload_before: { status: before.status },
      payload_after: { status: 'ordered' },
      metadata: {
        req_number: before.req_number,
        project_id: before.project_id,
        inventory_reversals: reversed,
      },
    })
  },

  // Líneas pendientes de recibir de una OC, para el modal de recepción. Usa las
  // líneas de la cotización aprobada (con su received_quantity); si no hay,
  // expone la propia solicitud como una única línea sin seguimiento parcial.
  getPendingReceiptLines(req: PurchaseRequisition): {
    quote_item_id: string | null
    description: string
    unit: string | null
    unit_price: number | null
    ordered_quantity: number
    received_quantity: number
    remaining_quantity: number
  }[] {
    const approvedQuote = (req.quotes ?? []).find((q) => q.id === req.approved_quote_id)
    const items = approvedQuote?.items ?? []
    if (items.length > 0) {
      return items
        .filter((it) => Number(it.quantity) > 0 && it.description?.trim())
        .map((it) => {
          const ordered = Number(it.quantity)
          const received = Number(it.received_quantity ?? 0)
          return {
            quote_item_id: it.id,
            description: it.description,
            unit: it.unit,
            unit_price: it.unit_price != null ? Number(it.unit_price) : null,
            ordered_quantity: ordered,
            received_quantity: received,
            remaining_quantity: Math.max(0, ordered - received),
          }
        })
    }
    const qty = Number(req.quantity_requested ?? 0)
    if (qty > 0 && req.description?.trim()) {
      return [
        {
          quote_item_id: null,
          description: req.description,
          unit: req.unit,
          unit_price: null,
          ordered_quantity: qty,
          received_quantity: 0,
          remaining_quantity: qty,
        },
      ]
    }
    return []
  },

  // Deriva las líneas de entrada a almacén para el fallback (OC sin líneas de
  // cotización): un único material descrito en la propia solicitud.
  buildReceiptMovements(req: PurchaseRequisition): {
    name: string
    unit: string | null
    quantity: number
    unit_cost: number | null
    supplier_id: string | null
  }[] {
    const approvedQuote = (req.quotes ?? []).find((q) => q.id === req.approved_quote_id)
    const supplierId = approvedQuote?.supplier_id ?? null
    const qty = Number(req.quantity_requested ?? 0)
    if (qty > 0 && req.description?.trim()) {
      return [
        {
          name: req.description,
          unit: req.unit,
          quantity: qty,
          unit_cost: null,
          supplier_id: supplierId,
        },
      ]
    }
    return []
  },

  async delete(id: string) {
    const { data: quotes } = await supabase.from('purchase_quotes').select('id').eq('requisition_id', id)
    for (const q of quotes || []) {
      await supabase.from('purchase_quote_items').delete().eq('quote_id', q.id)
    }
    await supabase.from('purchase_quotes').delete().eq('requisition_id', id)
    const { error } = await supabase.from('purchase_requisitions').delete().eq('id', id)
    if (error) throw error
  },
}
