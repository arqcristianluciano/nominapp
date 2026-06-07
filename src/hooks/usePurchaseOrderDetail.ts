import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { requisitionService } from '@/services/requisitionService'
import type { UpdateRequisitionInput } from '@/services/requisitionService'
import { quoteService } from '@/services/quoteService'
import { supplierService } from '@/services/supplierService'
import { inventoryService } from '@/services/inventoryService'
import { useToast } from '@/components/ui/Toast'
import type { Supplier } from '@/types/database'
import type { PurchaseRequisition } from '@/types/purchaseOrder'

// Regla 7.2: ≥2 cotizaciones para flujo estándar de liberación del Director.
// Regla 7.3: 1 cotización es válida si el Director registra justificación escrita
// obligatoria al momento de aprobar (ver ApprovalModal).
const MIN_QUOTES = 2

export function usePurchaseOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { warning: toastWarning } = useToast()

  const [req, setReq] = useState<PurchaseRequisition | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [addQuote, setAddQuote] = useState(false)
  const [savingQuote, setSavingQuote] = useState(false)
  const [approvalModal, setApprovalModal] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null)
  const [confirmDeleteReq, setConfirmDeleteReq] = useState(false)
  const [excessModal, setExcessModal] = useState(false)
  const [confirmReceive, setConfirmReceive] = useState(false)
  const [receivingOrder, setReceivingOrder] = useState(false)
  const [confirmReverse, setConfirmReverse] = useState(false)
  const [reversingOrder, setReversingOrder] = useState(false)
  const [conduces, setConduces] = useState<string[]>([])
  // Estado para el modal de edición de la solicitud (botón Editar).
  const [editModal, setEditModal] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const [data, sups, movs] = await Promise.all([
        requisitionService.getById(orderId),
        supplierService.getAll(),
        inventoryService.getMovementsByPurchaseOrder(orderId).catch(() => []),
      ])
      setReq(data)
      setSuppliers(sups)
      setConduces(
        Array.from(
          new Set(movs.filter((m) => m.type === 'in' && m.attachment_path).map((m) => m.attachment_path as string)),
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  async function handleAddQuote(payload: Parameters<typeof quoteService.create>[0] & { attachmentFile?: File | null }) {
    if (!orderId || !req) return
    setSavingQuote(true)
    try {
      const { attachmentFile, ...quotePayload } = payload
      const quote = await quoteService.create({ ...quotePayload, requisition_id: orderId })
      // Subir el archivo de cotización si el usuario lo adjuntó (best-effort).
      if (attachmentFile) {
        try {
          const path = await quoteService.uploadAttachment(attachmentFile, req.project_id, orderId, quote.id)
          await quoteService.saveAttachmentPath(quote.id, path)
        } catch (err) {
          console.warn('[usePurchaseOrderDetail] subida de archivo cotización falló (no-bloqueante)', err)
          toastWarning('No se pudo adjuntar el archivo, pero la cotización se guardó.')
        }
      }
      setAddQuote(false)
      await load()
    } finally {
      setSavingQuote(false)
    }
  }

  // Edita la solicitud (solo en estados: draft / quoting / needs_revision).
  async function handleEditRequisition(payload: UpdateRequisitionInput, actor?: string) {
    if (!orderId) return
    setSavingEdit(true)
    try {
      await requisitionService.update(orderId, payload, actor)
      setEditModal(false)
      await load()
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleNegotiate(quoteId: string, total: number | null, notes: string | null) {
    await quoteService.updateNegotiatedPrice(quoteId, total, notes)
    await load()
  }

  async function handleDeleteQuote(quoteId: string) {
    await quoteService.delete(quoteId)
    setDeleteQuoteId(null)
    await load()
  }

  async function handleApprove(
    quoteId: string,
    approvedBy: string,
    signature: string,
    singleQuoteJustification?: string | null,
  ) {
    if (!orderId) return
    await requisitionService.approve(orderId, quoteId, approvedBy, signature, {
      singleQuoteJustification: singleQuoteJustification ?? null,
    })
    setApprovalModal(false)
    await load()
  }

  async function handleReturn(notes: string) {
    if (!orderId) return
    await requisitionService.returnForRevision(orderId, notes)
    setApprovalModal(false)
    await load()
  }

  async function handleReject(reason: string) {
    if (!orderId) return
    await requisitionService.reject(orderId, reason)
    setApprovalModal(false)
    await load()
  }

  async function handleSubmitForApproval() {
    if (!orderId) return
    await requisitionService.submitForApproval(orderId)
    await load()
  }

  async function handlePlaceOrder(paymentType: 'credit' | 'cash', actor?: string) {
    if (!orderId) return
    setPlacingOrder(true)
    try {
      await requisitionService.placeOrder(orderId, paymentType, actor)
      await load()
    } finally {
      setPlacingOrder(false)
    }
  }

  async function handleReceiveItems(
    receipts: { quote_item_id: string; quantity: number; lot_number?: string | null; expiry_date?: string | null }[],
    actor?: string,
    conduceFile?: File | null,
  ) {
    if (!orderId) return
    setReceivingOrder(true)
    try {
      // El conduce es opcional y best-effort: si la subida falla, la recepción
      // continúa sin adjunto.
      let attachmentPath: string | null = null
      if (conduceFile && req) {
        try {
          attachmentPath = await inventoryService.uploadReceiptAttachment(conduceFile, req.project_id, orderId)
        } catch (err) {
          console.warn('[usePurchaseOrderDetail] subida de conduce falló (no-bloqueante)', err)
          toastWarning('No se pudo adjuntar el conduce, pero la recepción continuó.')
        }
      }
      await requisitionService.receiveItems(orderId, actor ?? 'Almacenista', receipts, attachmentPath)
      setConfirmReceive(false)
      await load()
    } finally {
      setReceivingOrder(false)
    }
  }

  async function handleReverseReceipt(actor?: string) {
    if (!orderId) return
    setReversingOrder(true)
    try {
      await requisitionService.reverseReceipt(orderId, actor ?? 'Almacenista')
      setConfirmReverse(false)
      await load()
    } finally {
      setReversingOrder(false)
    }
  }

  async function handleValidateExcess(validatedBy: string, motivo: string) {
    if (!orderId) return
    await requisitionService.validateExcess(orderId, validatedBy, motivo)
    setExcessModal(false)
    await load()
  }

  async function handleDelete() {
    if (!orderId) return
    await requisitionService.delete(orderId)
    navigate('/ordenes-compra')
  }

  const quotes = req?.quotes || []
  const pendingReceiptLines = req ? requisitionService.getPendingReceiptLines(req) : []
  const canEdit = ['draft', 'quoting', 'needs_revision'].includes(req?.status ?? '')
  const canNegotiate = ['quoting', 'needs_revision', 'pending_approval'].includes(req?.status ?? '')
  const missingQuotes = Math.max(0, MIN_QUOTES - quotes.length)
  const canSubmit = canEdit && quotes.length >= MIN_QUOTES

  return {
    orderId,
    req,
    suppliers,
    loading,
    addQuote,
    savingQuote,
    approvalModal,
    placingOrder,
    deleteQuoteId,
    confirmDeleteReq,
    excessModal,
    confirmReceive,
    receivingOrder,
    confirmReverse,
    reversingOrder,
    quotes,
    pendingReceiptLines,
    conduces,
    canEdit,
    canNegotiate,
    missingQuotes,
    canSubmit,
    editModal,
    savingEdit,
    setAddQuote,
    setApprovalModal,
    setDeleteQuoteId,
    setConfirmDeleteReq,
    setExcessModal,
    setConfirmReceive,
    setConfirmReverse,
    setEditModal,
    handleAddQuote,
    handleNegotiate,
    handleDeleteQuote,
    handleApprove,
    handleReturn,
    handleReject,
    handleSubmitForApproval,
    handlePlaceOrder,
    handleReceiveItems,
    handleReverseReceipt,
    handleValidateExcess,
    handleDelete,
    handleEditRequisition,
  }
}
