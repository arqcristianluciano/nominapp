import { Send, ShieldCheck, Trash2, Truck } from 'lucide-react'

interface Props {
  canEdit: boolean
  canSubmit: boolean
  canApprove?: boolean
  canRelease?: boolean
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
  canRelease = false,
  status,
  placingOrder,
  onSubmitForApproval,
  onOpenApproval,
  onPlaceCash,
  onPlaceCredit,
  onDelete,
}: Props) {
  // Touch-friendly base classes: min-h-12 (~48px) on mobile — comfortably above
  // WCAG 2.5.5 / Apple HIG (44pt) — and full-width stacking on mobile. On sm+
  // buttons shrink to fit and become inline.
  const baseBtn =
    'min-h-12 sm:min-h-11 inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg text-sm font-medium w-full sm:w-auto transition-colors'

  // 'pendiente_liberacion' = aprobada por el Director, a la espera de la
  // liberación final del Administrador. Se acepta 'approved' por compatibilidad
  // con OC anteriores al paso de liberación.
  const awaitingRelease = status === 'pendiente_liberacion' || status === 'approved'

  const hasAnyAction = canSubmit || status === 'pending_approval' || awaitingRelease || canEdit

  if (!hasAnyAction) return null

  return (
    // Tighter vertical gap (gap-2 on mobile) makes the stack feel coherent
    // without sacrificing tap separation.
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 pt-2">
      {canSubmit && (
        <button onClick={onSubmitForApproval} className={`${baseBtn} bg-blue-600 text-white hover:bg-blue-700`}>
          <Send className="w-4 h-4" />
          {status === 'needs_revision' ? 'Reenviar a aprobación' : 'Enviar a aprobación'}
        </button>
      )}
      {status === 'pending_approval' && canApprove && (
        <button onClick={onOpenApproval} className={`${baseBtn} bg-green-600 text-white hover:bg-green-700`}>
          <ShieldCheck className="w-4 h-4" /> Revisar y aprobar (Director)
        </button>
      )}
      {status === 'pending_approval' && !canApprove && (
        <p className="text-sm text-app-muted italic">Pendiente de aprobación por el Director de Proyecto.</p>
      )}
      {awaitingRelease && canRelease && (
        <>
          <button
            onClick={onPlaceCash}
            disabled={placingOrder}
            className={`${baseBtn} bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50`}
          >
            <Truck className="w-4 h-4" /> Liberar y colocar — Contado
          </button>
          <button
            onClick={onPlaceCredit}
            disabled={placingOrder}
            className={`${baseBtn} border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50`}
          >
            <Truck className="w-4 h-4" /> Liberar y colocar — Crédito
          </button>
        </>
      )}
      {awaitingRelease && !canRelease && (
        <p className="text-sm text-app-muted italic">
          Aprobada por el Director. Pendiente de liberación final del Administrador (Director General).
        </p>
      )}
      {canEdit && (
        <button
          onClick={onDelete}
          className={`${baseBtn} text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50`}
        >
          <Trash2 className="w-4 h-4" /> Eliminar
        </button>
      )}
    </div>
  )
}
