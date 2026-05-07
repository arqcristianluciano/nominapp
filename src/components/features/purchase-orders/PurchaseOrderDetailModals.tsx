import { ApprovalModal } from '@/components/features/purchase-orders/ApprovalModal'
import { QuoteForm } from '@/components/features/purchase-orders/QuoteForm'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { quoteService } from '@/services/quoteService'
import type { Supplier } from '@/types/database'
import type { PurchaseQuote } from '@/types/purchaseOrder'

export function PurchaseOrderDetailModals({
  orderId,
  suppliers,
  quotes,
  reqStatus,
  addQuote,
  savingQuote,
  approvalModal,
  deleteQuoteId,
  confirmDeleteReq,
  onCloseAddQuote,
  onSubmitQuote,
  onCloseApproval,
  onApprove,
  onReturn,
  onReject,
  onConfirmDeleteQuote,
  onCancelDeleteQuote,
  onConfirmDeleteRequest,
  onCancelDeleteRequest,
}: {
  orderId: string
  suppliers: Supplier[]
  quotes: PurchaseQuote[]
  reqStatus: string
  addQuote: boolean
  savingQuote: boolean
  approvalModal: boolean
  deleteQuoteId: string | null
  confirmDeleteReq: boolean
  onCloseAddQuote: () => void
  onSubmitQuote: (payload: Parameters<typeof quoteService.create>[0]) => Promise<void>
  onCloseApproval: () => void
  onApprove: (quoteId: string, approvedBy: string, signature: string) => Promise<void>
  onReturn: (notes: string) => Promise<void>
  onReject: (reason: string) => Promise<void>
  onConfirmDeleteQuote: (quoteId: string) => Promise<void>
  onCancelDeleteQuote: () => void
  onConfirmDeleteRequest: () => Promise<void>
  onCancelDeleteRequest: () => void
}) {
  return (
    <>
      <Modal open={addQuote} onClose={onCloseAddQuote} title="Agregar cotización" width="max-w-2xl">
        <QuoteForm
          suppliers={suppliers}
          onSubmit={async (payload) => {
            await onSubmitQuote({ ...payload, requisition_id: orderId })
          }}
          onCancel={onCloseAddQuote}
          saving={savingQuote}
        />
      </Modal>

      {reqStatus === 'pending_approval' && (
        <ApprovalModal
          open={approvalModal}
          onClose={onCloseApproval}
          quotes={quotes}
          onApprove={onApprove}
          onReturn={onReturn}
          onReject={onReject}
        />
      )}

      <ConfirmModal
        open={!!deleteQuoteId}
        title="Eliminar cotización"
        message="¿Eliminar esta cotización? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteQuoteId && onConfirmDeleteQuote(deleteQuoteId)}
        onCancel={onCancelDeleteQuote}
      />

      <ConfirmModal
        open={confirmDeleteReq}
        title="Eliminar solicitud de compra"
        message="¿Eliminar esta solicitud y todas sus cotizaciones? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={onConfirmDeleteRequest}
        onCancel={onCancelDeleteRequest}
      />
    </>
  )
}
