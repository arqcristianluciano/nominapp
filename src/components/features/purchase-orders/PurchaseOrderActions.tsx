import { Send, ShieldCheck, Trash2, Truck } from 'lucide-react'

interface Props {
  canEdit: boolean
  canSubmit: boolean
  canApprove?: boolean
  status: string
  placingOrder: boolean
  onSubmitForApproval: () => void
  onOpenApproval: () => void
  onPlaceCash: () => void
  onPlaceCredit: () => void
  onDelete: () => void
}

export function PurchaseOrderActions({
  canEdit,
  canSubmit,
  canApprove = true,
  status,
  placingOrder,
  onSubmitForApproval,
  onOpenApproval,
  onPlaceCash,
  onPlaceCredit,
  onDelete,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {canSubmit && <button onClick={onSubmitForApproval} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"><Send className="w-4 h-4" />{status === 'needs_revision' ? 'Reenviar a aprobación' : 'Enviar a aprobación'}</button>}
      {status === 'pending_approval' && canApprove && <button onClick={onOpenApproval} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"><ShieldCheck className="w-4 h-4" /> Revisar y aprobar (Gerente)</button>}
      {status === 'pending_approval' && !canApprove && <p className="text-sm text-app-muted italic">Pendiente de aprobación por el Gerente de Proyecto.</p>}
      {status === 'approved' && (
        <>
          <button onClick={onPlaceCash} disabled={placingOrder} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"><Truck className="w-4 h-4" /> Colocar orden — Contado</button>
          <button onClick={onPlaceCredit} disabled={placingOrder} className="flex items-center gap-2 border border-purple-300 text-purple-700 px-4 py-2 rounded-lg text-sm hover:bg-purple-50 disabled:opacity-50"><Truck className="w-4 h-4" /> Colocar orden — Crédito</button>
        </>
      )}
      {canEdit && <button onClick={onDelete} className="flex items-center gap-2 text-red-500 hover:text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4" /> Eliminar</button>}
    </div>
  )
}
