import { PurchaseOrderHeader } from '@/components/features/purchase-orders/PurchaseOrderHeader'
import { PurchaseOrderMeta } from '@/components/features/purchase-orders/PurchaseOrderMeta'
import { PurchaseOrderActions } from '@/components/features/purchase-orders/PurchaseOrderActions'
import { PurchaseOrderDetailModals } from '@/components/features/purchase-orders/PurchaseOrderDetailModals'
import { PurchaseOrderQuotesSection } from '@/components/features/purchase-orders/PurchaseOrderQuotesSection'
import { PurchaseOrderSignatureCard } from '@/components/features/purchase-orders/PurchaseOrderSignatureCard'
import { usePurchaseOrderDetail } from '@/hooks/usePurchaseOrderDetail'

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
  } = usePurchaseOrderDetail()

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
    </div>
  )
}
