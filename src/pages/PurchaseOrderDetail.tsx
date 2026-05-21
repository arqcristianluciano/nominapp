import { PurchaseOrderHeader } from '@/components/features/purchase-orders/PurchaseOrderHeader'
import { PurchaseOrderMeta } from '@/components/features/purchase-orders/PurchaseOrderMeta'
import { PurchaseOrderActions } from '@/components/features/purchase-orders/PurchaseOrderActions'
import { PurchaseOrderDetailModals } from '@/components/features/purchase-orders/PurchaseOrderDetailModals'
import { PurchaseOrderQuotesSection } from '@/components/features/purchase-orders/PurchaseOrderQuotesSection'
import { PurchaseOrderSignatureCard } from '@/components/features/purchase-orders/PurchaseOrderSignatureCard'
import { ExcessValidationModal } from '@/components/features/purchase-orders/ExcessValidationModal'
import { usePurchaseOrderDetail } from '@/hooks/usePurchaseOrderDetail'
import { useProjectRoles } from '@/hooks/useProjectRoles'
import { useAuthStore } from '@/stores/authStore'
import { ShieldCheck, Send, Truck } from 'lucide-react'

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
    handleAddQuote,
    handleNegotiate,
    handleDeleteQuote,
    handleApprove,
    handleReturn,
    handleReject,
    handleSubmitForApproval,
    handlePlaceOrder,
    handleValidateExcess,
    handleDelete,
  } = usePurchaseOrderDetail()

  const roles = useProjectRoles(req?.project_id)
  const user = useAuthStore((s) => s.user)

  if (loading) return <div className="p-8 text-center text-app-subtle">Cargando…</div>
  if (!req) return <div className="p-8 text-center text-app-muted">Solicitud no encontrada</div>

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
    if (req.status === 'approved') {
      return {
        label: placingOrder ? 'Colocando…' : 'Colocar orden — Contado',
        onClick: () => handlePlaceOrder('cash'),
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
              status={req.status}
              placingOrder={placingOrder}
              onSubmitForApproval={handleSubmitForApproval}
              onOpenApproval={() => setApprovalModal(true)}
              onPlaceCash={() => handlePlaceOrder('cash')}
              onPlaceCredit={() => handlePlaceOrder('credit')}
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
