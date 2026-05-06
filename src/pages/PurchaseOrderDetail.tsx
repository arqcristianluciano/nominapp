import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { requisitionService } from '@/services/requisitionService'
import { quoteService } from '@/services/quoteService'
import { supplierService } from '@/services/supplierService'
import type { PurchaseRequisition } from '@/types/purchaseOrder'
import type { Supplier } from '@/types/database'
import { ApprovalModal } from '@/components/features/purchase-orders/ApprovalModal'
import { QuoteForm } from '@/components/features/purchase-orders/QuoteForm'
import { PurchaseOrderHeader } from '@/components/features/purchase-orders/PurchaseOrderHeader'
import { PurchaseOrderMeta } from '@/components/features/purchase-orders/PurchaseOrderMeta'
import { PurchaseOrderActions } from '@/components/features/purchase-orders/PurchaseOrderActions'
import { PurchaseOrderQuotesSection } from '@/components/features/purchase-orders/PurchaseOrderQuotesSection'
import { PurchaseOrderSignatureCard } from '@/components/features/purchase-orders/PurchaseOrderSignatureCard'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const MIN_QUOTES = 3

export default function PurchaseOrderDetail() {
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
    setLoading(true)
    try {
      const [data, sups] = await Promise.all([
        requisitionService.getById(orderId!),
        supplierService.getAll(),
      ])
      setReq(data); setSuppliers(sups)
    } finally { setLoading(false) }
  }, [orderId])

  useEffect(() => { if (orderId) load() }, [orderId, load])

  async function handleAddQuote(payload: Parameters<typeof quoteService.create>[0]) {
    setSavingQuote(true)
    try {
      await quoteService.create({ ...payload, requisition_id: orderId! })
      setAddQuote(false); load()
    } finally { setSavingQuote(false) }
  }

  async function handleNegotiate(quoteId: string, total: number | null, notes: string | null) {
    await quoteService.updateNegotiatedPrice(quoteId, total, notes)
    load()
  }

  async function handleDeleteQuote(quoteId: string) {
    await quoteService.delete(quoteId)
    setDeleteQuoteId(null)
    load()
  }

  async function handleApprove(quoteId: string, approvedBy: string, signature: string) {
    await requisitionService.approve(orderId!, quoteId, approvedBy, signature)
    setApprovalModal(false); load()
  }

  async function handleReturn(notes: string) {
    await requisitionService.returnForRevision(orderId!, notes)
    setApprovalModal(false); load()
  }

  async function handleReject(reason: string) {
    await requisitionService.reject(orderId!, reason)
    setApprovalModal(false); load()
  }

  async function handleSubmitForApproval() {
    await requisitionService.submitForApproval(orderId!); load()
  }

  async function handlePlaceOrder(paymentType: 'credit' | 'cash') {
    setPlacingOrder(true)
    try { await requisitionService.placeOrder(orderId!, paymentType); load() }
    finally { setPlacingOrder(false) }
  }

  async function handleDelete() {
    await requisitionService.delete(orderId!)
    navigate('/ordenes-compra')
  }

  const quotes = req?.quotes || []
  const canEdit = ['draft', 'quoting', 'needs_revision'].includes(req?.status ?? '')
  const canNegotiate = ['quoting', 'needs_revision', 'pending_approval'].includes(req?.status ?? '')
  const missingQuotes = Math.max(0, MIN_QUOTES - quotes.length)
  const canSubmit = canEdit && quotes.length >= MIN_QUOTES

  if (loading) return <div className="p-8 text-center text-app-subtle">Cargando…</div>
  if (!req) return <div className="p-8 text-center text-app-muted">Solicitud no encontrada</div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PurchaseOrderHeader req={req} />
      <PurchaseOrderMeta req={req} />

      <PurchaseOrderQuotesSection
        quotes={quotes}
        approvedQuoteId={req.approved_quote_id ?? null}
        canEdit={canEdit}
        canNegotiate={canNegotiate}
        missingQuotes={missingQuotes}
        onOpenAdd={() => setAddQuote(true)}
        onDelete={setDeleteQuoteId}
        onNegotiate={handleNegotiate}
      />
      <PurchaseOrderSignatureCard signatureData={req.signature_data} approvedAt={req.approved_at} />

      <PurchaseOrderActions
        canEdit={canEdit}
        canSubmit={canSubmit}
        status={req.status}
        placingOrder={placingOrder}
        onSubmitForApproval={handleSubmitForApproval}
        onOpenApproval={() => setApprovalModal(true)}
        onPlaceCash={() => handlePlaceOrder('cash')}
        onPlaceCredit={() => handlePlaceOrder('credit')}
        onDelete={() => setConfirmDeleteReq(true)}
      />

      <Modal open={addQuote} onClose={() => setAddQuote(false)} title="Agregar cotización" width="max-w-2xl">
        <QuoteForm
          suppliers={suppliers}
          onSubmit={async (payload) => {
            await handleAddQuote({ ...payload, requisition_id: orderId! })
          }}
          onCancel={() => setAddQuote(false)}
          saving={savingQuote}
        />
      </Modal>

      {req.status === 'pending_approval' && (
        <ApprovalModal
          open={approvalModal}
          onClose={() => setApprovalModal(false)}
          quotes={quotes}
          onApprove={handleApprove}
          onReturn={handleReturn}
          onReject={handleReject}
        />
      )}

      <ConfirmModal
        open={!!deleteQuoteId}
        title="Eliminar cotización"
        message="¿Eliminar esta cotización? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteQuoteId && handleDeleteQuote(deleteQuoteId)}
        onCancel={() => setDeleteQuoteId(null)}
      />

      <ConfirmModal
        open={confirmDeleteReq}
        title="Eliminar solicitud de compra"
        message="¿Eliminar esta solicitud y todas sus cotizaciones? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteReq(false)}
      />
    </div>
  )
}
