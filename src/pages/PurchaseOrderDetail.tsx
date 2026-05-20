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
import { ShieldCheck } from 'lucide-react'

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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PurchaseOrderHeader req={req} />
      <PurchaseOrderMeta req={req} />

      {req.status === 'pendiente_validacion' && roles.canApproveExcess && (
        <button
          onClick={() => setExcessModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <ShieldCheck className="w-4 h-4" /> Validar excedente (Planificación / Director)
        </button>
      )}

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
        canApprove={roles.canReleasePurchaseOrder}
        status={req.status}
        placingOrder={placingOrder}
        onSubmitForApproval={handleSubmitForApproval}
        onOpenApproval={() => setApprovalModal(true)}
        onPlaceCash={() => handlePlaceOrder('cash')}
        onPlaceCredit={() => handlePlaceOrder('credit')}
        onDelete={() => setConfirmDeleteReq(true)}
      />

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
  )
}
