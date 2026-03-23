import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Send, Truck, ShieldCheck, ImageIcon, Trash2, AlertTriangle } from 'lucide-react'
import { requisitionService } from '@/services/requisitionService'
import { quoteService } from '@/services/quoteService'
import { supplierService } from '@/services/supplierService'
import type { PurchaseRequisition } from '@/types/purchaseOrder'
import type { Supplier } from '@/types/database'
import { REQ_STATUS_LABEL, REQ_STATUS_COLOR } from '@/types/purchaseOrder'
import { ApprovalModal } from '@/components/features/purchase-orders/ApprovalModal'
import { QuoteForm } from '@/components/features/purchase-orders/QuoteForm'
import { QuotesPanel } from '@/components/features/purchase-orders/QuotesPanel'
import { Modal } from '@/components/ui/Modal'

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

  useEffect(() => { if (orderId) load() }, [orderId])

  async function load() {
    setLoading(true)
    try {
      const [data, sups] = await Promise.all([
        requisitionService.getById(orderId!),
        supplierService.getAll(),
      ])
      setReq(data); setSuppliers(sups)
    } finally { setLoading(false) }
  }

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
    if (!confirm('¿Eliminar esta cotización?')) return
    await quoteService.delete(quoteId); load()
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
    if (!confirm('¿Eliminar esta solicitud de compra?')) return
    await requisitionService.delete(orderId!)
    navigate('/ordenes-compra')
  }

  const quotes = req?.quotes || []
  const canEdit = ['draft', 'quoting', 'needs_revision'].includes(req?.status ?? '')
  const canNegotiate = ['quoting', 'needs_revision', 'pending_approval'].includes(req?.status ?? '')
  const missingQuotes = Math.max(0, MIN_QUOTES - quotes.length)
  const canSubmit = canEdit && quotes.length >= MIN_QUOTES

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando…</div>
  if (!req) return <div className="p-8 text-center text-gray-500">Solicitud no encontrada</div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/ordenes-compra" className="text-gray-400 hover:text-gray-600 mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{req.req_number}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${REQ_STATUS_COLOR[req.status]}`}>
              {REQ_STATUS_LABEL[req.status]}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{req.description}</p>
        </div>
      </div>

      {/* Banner de revisión */}
      {req.status === 'needs_revision' && req.revision_notes && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Devuelta para revisión</p>
            <p className="text-sm text-orange-700 mt-1">{req.revision_notes}</p>
            <p className="text-xs text-orange-500 mt-2">
              Corrija las cotizaciones y reenvíe a aprobación cuando esté listo.
            </p>
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><span className="text-gray-500 text-xs block">Proyecto</span><span className="font-medium">{req.project?.name}</span></div>
        <div><span className="text-gray-500 text-xs block">Solicitado por</span><span className="font-medium">{req.requested_by}</span></div>
        {req.required_date && <div><span className="text-gray-500 text-xs block">Fecha requerida</span><span className="font-medium">{req.required_date}</span></div>}
        {req.approved_by && <div><span className="text-gray-500 text-xs block">Aprobado por</span><span className="font-medium text-green-700">{req.approved_by}</span></div>}
        {req.approved_at && <div><span className="text-gray-500 text-xs block">Fecha aprobación</span><span className="font-medium">{new Date(req.approved_at).toLocaleDateString('es-DO')}</span></div>}
        {req.payment_type && <div><span className="text-gray-500 text-xs block">Forma de pago</span><span className="font-medium">{req.payment_type === 'credit' ? 'Crédito' : 'Contado'}</span></div>}
        {req.rejection_reason && <div className="col-span-2"><span className="text-gray-500 text-xs block">Motivo rechazo</span><span className="font-medium text-red-700">{req.rejection_reason}</span></div>}
        {req.notes && <div className="col-span-2"><span className="text-gray-500 text-xs block">Notas</span><span>{req.notes}</span></div>}
      </div>

      {/* Cotizaciones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Cotizaciones <span className="text-gray-400 font-normal text-sm">({quotes.length})</span>
            </h2>
            {canEdit && missingQuotes > 0 && (
              <p className="text-xs text-amber-600 mt-0.5">
                Faltan {missingQuotes} cotización{missingQuotes !== 1 ? 'es' : ''} para enviar a aprobación
              </p>
            )}
            {canNegotiate && quotes.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                Haz clic en <span className="font-medium">✏</span> en cada tarjeta para registrar un precio negociado
              </p>
            )}
          </div>
          {canEdit && (
            <button onClick={() => setAddQuote(true)}
              className="flex items-center gap-2 text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Agregar cotización
            </button>
          )}
        </div>

        <QuotesPanel
          quotes={quotes}
          approvedQuoteId={req.approved_quote_id}
          canDelete={canEdit}
          canNegotiate={canNegotiate}
          onDelete={handleDeleteQuote}
          onNegotiate={handleNegotiate}
        />
      </div>

      {/* Firma */}
      {req.signature_data && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Firma digital
            {req.approved_at && (
              <span className="text-xs text-gray-400 font-normal">
                — {new Date(req.approved_at).toLocaleString('es-DO')}
              </span>
            )}
          </p>
          <img src={req.signature_data} alt="Firma digital"
            className="max-h-32 border border-gray-200 rounded-lg bg-gray-50" />
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 pt-2">
        {canSubmit && (
          <button onClick={handleSubmitForApproval}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Send className="w-4 h-4" />
            {req.status === 'needs_revision' ? 'Reenviar a aprobación' : 'Enviar a aprobación'}
          </button>
        )}
        {req.status === 'pending_approval' && (
          <button onClick={() => setApprovalModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            <ShieldCheck className="w-4 h-4" /> Revisar y aprobar
          </button>
        )}
        {req.status === 'approved' && (
          <>
            <button onClick={() => handlePlaceOrder('cash')} disabled={placingOrder}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
              <Truck className="w-4 h-4" /> Colocar orden — Contado
            </button>
            <button onClick={() => handlePlaceOrder('credit')} disabled={placingOrder}
              className="flex items-center gap-2 border border-purple-300 text-purple-700 px-4 py-2 rounded-lg text-sm hover:bg-purple-50 disabled:opacity-50">
              <Truck className="w-4 h-4" /> Colocar orden — Crédito
            </button>
          </>
        )}
        {(canEdit) && (
          <button onClick={handleDelete}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200 hover:bg-red-50">
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        )}
      </div>

      <Modal open={addQuote} onClose={() => setAddQuote(false)} title="Agregar cotización" width="max-w-2xl">
        <QuoteForm
          suppliers={suppliers}
          onSubmit={handleAddQuote}
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
    </div>
  )
}
