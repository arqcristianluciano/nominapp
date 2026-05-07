import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { requisitionService } from '@/services/requisitionService'
import { quoteService } from '@/services/quoteService'
import { supplierService } from '@/services/supplierService'
import type { Supplier } from '@/types/database'
import type { PurchaseRequisition } from '@/types/purchaseOrder'

const MIN_QUOTES = 3

export function usePurchaseOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const [req, setReq] = useState<PurchaseRequisition | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [addQuote, setAddQuote] = useState(false)
  const [savingQuote, setSavingQuote] = useState(false)
  const [approvalModal, setApprovalModal] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null)
  const [confirmDeleteReq, setConfirmDeleteReq] = useState(false)

  const load = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const [data, sups] = await Promise.all([
        requisitionService.getById(orderId),
        supplierService.getAll(),
      ])
      setReq(data)
      setSuppliers(sups)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  async function handleAddQuote(payload: Parameters<typeof quoteService.create>[0]) {
    if (!orderId) return
    setSavingQuote(true)
    try {
      await quoteService.create({ ...payload, requisition_id: orderId })
      setAddQuote(false)
      await load()
    } finally {
      setSavingQuote(false)
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

  async function handleApprove(quoteId: string, approvedBy: string, signature: string) {
    if (!orderId) return
    await requisitionService.approve(orderId, quoteId, approvedBy, signature)
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

  async function handlePlaceOrder(paymentType: 'credit' | 'cash') {
    if (!orderId) return
    setPlacingOrder(true)
    try {
      await requisitionService.placeOrder(orderId, paymentType)
      await load()
    } finally {
      setPlacingOrder(false)
    }
  }

  async function handleDelete() {
    if (!orderId) return
    await requisitionService.delete(orderId)
    navigate('/ordenes-compra')
  }

  const quotes = req?.quotes || []
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
    quotes,
    canEdit,
    canNegotiate,
    missingQuotes,
    canSubmit,
    setAddQuote,
    setApprovalModal,
    setDeleteQuoteId,
    setConfirmDeleteReq,
    handleAddQuote,
    handleNegotiate,
    handleDeleteQuote,
    handleApprove,
    handleReturn,
    handleReject,
    handleSubmitForApproval,
    handlePlaceOrder,
    handleDelete,
  }
}
