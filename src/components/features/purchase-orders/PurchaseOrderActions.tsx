import { PackageCheck, RotateCcw, Send, ShieldCheck, Trash2, Truck } from 'lucide-react'

interface Props {
  canEdit: boolean
  canSubmit: boolean
  canApprove?: boolean
  canRelease?: boolean
  canReceive?: boolean
  canReverseReceipt?: boolean
  status: string
  placingOrder: boolean
  receivingOrder?: boolean
  reversingOrder?: boolean
  onSubmitForApproval: () => void
  onOpenApproval: () => void
  onPlaceCash: () => void
  onPlaceCredit: () => void
  onReceive?: () => void
  onReverseReceipt?: () => void
  onDelete: () => void
}

export function PurchaseOrderActions({
  canEdit,
  canSubmit,
  canApprove = true,
  canRelease = false,
  canReceive = false,
  canReverseReceipt = false,
  status,
  placingOrder,
  receivingOrder = false,
  reversingOrder = false,
  onSubmitForApproval,
  onOpenApproval,
  onPlaceCash,
  onPlaceCredit,
  onReceive,
  onReverseReceipt,
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

  // 'ordered' = OC colocada con el suplidor; 'partially_received' = recibida en
  // parte. En ambos el Almacenista (capability 'receive_order') puede dar entrada
  // (o continuar dándola) a la mercancía.
  const awaitingReceipt = status === 'ordered'
  const partiallyReceived = status === 'partially_received'
  const canShowReceive = awaitingReceipt || partiallyReceived

  // 'received' o 'partially_received' = se puede revertir la recepción
  // (corrección/devolución) mientras el stock siga disponible.
  const canShowReverse = status === 'received' || partiallyReceived

  const hasAnyAction =
    canSubmit ||
    status === 'pending_approval' ||
    awaitingRelease ||
    awaitingReceipt ||
    (canShowReceive && canReceive) ||
    (canShowReverse && canReverseReceipt) ||
    canEdit

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
      {canShowReceive && canReceive && (
        <button
          onClick={onReceive}
          disabled={receivingOrder}
          className={`${baseBtn} bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50`}
        >
          <PackageCheck className="w-4 h-4" />
          {receivingOrder
            ? 'Registrando entrada…'
            : partiallyReceived
              ? 'Recibir mercancía (continuar entrada)'
              : 'Recibir mercancía (dar entrada a almacén)'}
        </button>
      )}
      {awaitingReceipt && !canReceive && (
        <p className="text-sm text-app-muted italic">
          Orden colocada con el suplidor. Pendiente de recepción en almacén por el Almacenista.
        </p>
      )}
      {canShowReverse && canReverseReceipt && (
        <button
          onClick={onReverseReceipt}
          disabled={reversingOrder}
          className={`${baseBtn} border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50`}
        >
          <RotateCcw className="w-4 h-4" />
          {reversingOrder ? 'Revirtiendo…' : 'Revertir recepción (devolver de almacén)'}
        </button>
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
