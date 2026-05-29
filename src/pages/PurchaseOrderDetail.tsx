import { PurchaseOrderHeader } from '@/components/features/purchase-orders/PurchaseOrderHeader'
import { PurchaseOrderMeta } from '@/components/features/purchase-orders/PurchaseOrderMeta'
import { PurchaseOrderActions } from '@/components/features/purchase-orders/PurchaseOrderActions'
import { PurchaseOrderDetailModals } from '@/components/features/purchase-orders/PurchaseOrderDetailModals'
import { PurchaseOrderQuotesSection } from '@/components/features/purchase-orders/PurchaseOrderQuotesSection'
import { PurchaseOrderSignatureCard } from '@/components/features/purchase-orders/PurchaseOrderSignatureCard'
import { ExcessValidationModal } from '@/components/features/purchase-orders/ExcessValidationModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { usePurchaseOrderDetail } from '@/hooks/usePurchaseOrderDetail'
import { useProjectRoles } from '@/hooks/useProjectRoles'
import { useAuthStore } from '@/stores/authStore'
import { PackageCheck, RotateCcw, ShieldCheck, Send, Truck } from 'lucide-react'

export default function PurchaseOrderDetail() {
  const {
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
    canEdit,
    canNegotiate,
    missingQuotes,
    canSubmit,
    setAddQuote,
    setApprovalModal,
    setDeleteQuoteId,
    setConfirmDeleteReq,
    setExcessModal,
    setConfirmReceive,
    setConfirmReverse,
    handleAddQuote,
    handleNegotiate,
    handleDeleteQuote,
    handleApprove,
    handleReturn,
    handleReject,
    handleSubmitForApproval,
    handlePlaceOrder,
    handleMarkReceived,
    handleReverseReceipt,
    handleValidateExcess,
    handleDelete,
  } = usePurchaseOrderDetail()

  const roles = useProjectRoles(req?.project_id)
  const user = useAuthStore((s) => s.user)

  if (loading) return <div className="p-8 text-center text-app-subtle">Cargando…</div>
  if (!req) return <div className="p-8 text-center text-app-muted">Solicitud no encontrada</div>

  // El Almacenista (capability 'receive_order') da entrada a la mercancía una
  // vez la OC está colocada con el suplidor, y puede revertir la recepción si
  // se registró por error o se devuelve al suplidor.
  const canReceive = req.status === 'ordered' && roles.canReceiveOrder
  const canReverseReceipt = req.status === 'received' && roles.canReceiveOrder

  // Determine the primary mobile CTA for the sticky footer. Only ONE button is
  // duplicated in the footer (the most relevant action) to keep it compact.
  // The full action set still lives in <PurchaseOrderActions /> above the fold.
  const primaryCta = (() => {
    if (canSubmit) {
      return {
        label: req.status === 'needs_revision' ? 'Reenviar a aprobación' : 'Enviar a aprobación',
        onClick: handleSubmitForApproval,
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
        icon: <Send className="w-4 h-4" />,
      }
    }
    if (req.status === 'pending_approval' && roles.canReleasePurchaseOrder) {
      return {
        label: 'Revisar y aprobar',
        onClick: () => setApprovalModal(true),
        className: 'bg-green-600 hover:bg-green-700 text-white',
        icon: <ShieldCheck className="w-4 h-4" />,
      }
    }
    if ((req.status === 'pendiente_liberacion' || req.status === 'approved') && roles.isDirector) {
      return {
        label: placingOrder ? 'Liberando…' : 'Liberar y colocar — Contado',
        onClick: () => handlePlaceOrder('cash', user?.displayName),
        className: 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50',
        icon: <Truck className="w-4 h-4" />,
        disabled: placingOrder,
      }
    }
    if (req.status === 'pendiente_validacion' && roles.canApproveExcess) {
      return {
        label: 'Validar excedente',
        onClick: () => setExcessModal(true),
        className: 'bg-amber-600 hover:bg-amber-700 text-white',
        icon: <ShieldCheck className="w-4 h-4" />,
      }
    }
    if (canReceive) {
      return {
        label: receivingOrder ? 'Registrando entrada…' : 'Recibir mercancía',
        onClick: () => setConfirmReceive(true),
        className: 'bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50',
        icon: <PackageCheck className="w-4 h-4" />,
        disabled: receivingOrder,
      }
    }
    if (canReverseReceipt) {
      return {
        label: reversingOrder ? 'Revirtiendo…' : 'Revertir recepción',
        onClick: () => setConfirmReverse(true),
        className: 'bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50',
        icon: <RotateCcw className="w-4 h-4" />,
        disabled: reversingOrder,
      }
    }
    return null
  })()

  return (
    <>
      {/* Extra bottom padding on mobile so the sticky footer never covers content. */}
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-24 sm:pb-6">
        <PurchaseOrderHeader req={req} />
        <PurchaseOrderMeta req={req} />

        {req.status === 'pendiente_validacion' && roles.canApproveExcess && (
          <button
            onClick={() => setExcessModal(true)}
            className="w-full sm:w-auto min-h-11 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <ShieldCheck className="w-4 h-4" /> Validar excedente (Planificación / Director)
          </button>
        )}

        {/* Responsive 2-column layout on desktop:
              - main (2/3): quotes
              - side (1/3): signature + actions
            On mobile everything stacks in a single column in the original
            reading order: Quotes → Signature → Actions. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6 gap-6">
          <div className="lg:col-span-2 space-y-6">
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
          </div>
          <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-4 lg:self-start">
            <PurchaseOrderSignatureCard signatureData={req.signature_data} approvedAt={req.approved_at} />
            <PurchaseOrderActions
              canEdit={canEdit}
              canSubmit={canSubmit}
              canApprove={roles.canReleasePurchaseOrder}
              canRelease={roles.isDirector}
              canReceive={canReceive}
              canReverseReceipt={canReverseReceipt}
              status={req.status}
              placingOrder={placingOrder}
              receivingOrder={receivingOrder}
              reversingOrder={reversingOrder}
              onSubmitForApproval={handleSubmitForApproval}
              onOpenApproval={() => setApprovalModal(true)}
              onPlaceCash={() => handlePlaceOrder('cash', user?.displayName)}
              onPlaceCredit={() => handlePlaceOrder('credit', user?.displayName)}
              onReceive={() => setConfirmReceive(true)}
              onReverseReceipt={() => setConfirmReverse(true)}
              onDelete={() => setConfirmDeleteReq(true)}
            />
          </aside>
        </div>

        <PurchaseOrderDetailModals
          orderId={orderId!}
          suppliers={suppliers}
          quotes={quotes}
          reqStatus={req.status}
          addQuote={addQuote}
          savingQuote={savingQuote}
          approvalModal={approvalModal}
          deleteQuoteId={deleteQuoteId}
          confirmDeleteReq={confirmDeleteReq}
          onCloseAddQuote={() => setAddQuote(false)}
          onSubmitQuote={handleAddQuote}
          onCloseApproval={() => setApprovalModal(false)}
          onApprove={handleApprove}
          onReturn={handleReturn}
          onReject={handleReject}
          onConfirmDeleteQuote={handleDeleteQuote}
          onCancelDeleteQuote={() => setDeleteQuoteId(null)}
          onConfirmDeleteRequest={handleDelete}
          onCancelDeleteRequest={() => setConfirmDeleteReq(false)}
        />

        <ExcessValidationModal
          open={excessModal}
          onClose={() => setExcessModal(false)}
          onValidate={handleValidateExcess}
          defaultValidator={user?.displayName}
        />

        <ConfirmModal
          open={confirmReceive}
          variant="warning"
          title="Recibir mercancía"
          message="Se dará entrada al stock del proyecto con las cantidades y precios de la cotización aprobada, y la orden quedará marcada como Recibida. ¿Confirmar la recepción?"
          confirmLabel="Confirmar recepción"
          onConfirm={() => handleMarkReceived(user?.displayName)}
          onCancel={() => setConfirmReceive(false)}
        />

        <ConfirmModal
          open={confirmReverse}
          variant="warning"
          title="Revertir recepción"
          message="Se generará una salida de almacén que deshace el stock ingresado por esta orden y la orden volverá a 'Orden colocada'. Si parte del material ya fue consumido, la reversa no podrá completarse. ¿Continuar?"
          confirmLabel="Revertir recepción"
          onConfirm={() => handleReverseReceipt(user?.displayName)}
          onCancel={() => setConfirmReverse(false)}
        />
      </div>

      {/* Mobile sticky footer with the primary CTA. Hidden on sm+ where buttons
          are visible inline. Honors iOS safe-area inset. */}
      {primaryCta && (
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-app-surface/95 backdrop-blur supports-[backdrop-filter]:bg-app-surface/80 border-t border-app-border px-4 py-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={primaryCta.onClick}
            disabled={primaryCta.disabled}
            className={`w-full min-h-12 inline-flex items-center justify-center gap-2 px-4 rounded-lg text-sm font-semibold transition-colors ${primaryCta.className}`}
          >
            {primaryCta.icon}
            {primaryCta.label}
          </button>
        </div>
      )}
    </>
  )
}
