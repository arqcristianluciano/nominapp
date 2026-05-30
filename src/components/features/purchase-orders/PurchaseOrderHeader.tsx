import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import type { PurchaseRequisition } from '@/types/purchaseOrder'
import { REQ_STATUS_COLOR, REQ_STATUS_LABEL } from '@/types/purchaseOrder'
import { formatNumber } from '@/utils/currency'
import { requisitionService } from '@/services/requisitionService'
import { ReceiptProgressBadge } from './ReceiptProgressBadge'

export function PurchaseOrderHeader({ req }: { req: PurchaseRequisition }) {
  const showProgress = ['ordered', 'partially_received', 'received'].includes(req.status)
  const progress = showProgress ? requisitionService.getReceiptProgress(req) : null
  return (
    <>
      <div>
        <Breadcrumb items={[{ label: 'Órdenes de compra', to: '/ordenes-compra' }, { label: req.req_number }]} />
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-app-text">{req.req_number}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${REQ_STATUS_COLOR[req.status]}`}>
            {REQ_STATUS_LABEL[req.status]}
          </span>
          {progress && <ReceiptProgressBadge progress={progress} />}
        </div>
        <p className="text-sm text-app-muted mt-0.5">{req.description}</p>
        {req.quantity_requested != null && (
          <p className="text-xs text-app-subtle mt-1">
            Solicitado: <strong>{formatNumber(req.quantity_requested)}</strong> {req.unit ?? ''}
            {req.planned_quantity_at_request != null && (
              <>
                {' '}
                · Plan al momento:{' '}
                <strong>
                  {req.planned_quantity_at_request != null ? formatNumber(req.planned_quantity_at_request) : '—'}
                </strong>{' '}
                · Disponible:{' '}
                <strong>
                  {req.available_quantity_at_request != null ? formatNumber(req.available_quantity_at_request) : '—'}
                </strong>
              </>
            )}
          </p>
        )}
      </div>
      {req.status === 'pendiente_validacion' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Excede la cantidad planificada en la partida
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
              Planificación o el Director debe validar con motivo escrito antes de pasar a cotización (regla 7.1).
            </p>
          </div>
        </div>
      )}
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
      {req.status === 'pendiente_liberacion' && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 rounded-xl p-4 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
              Aprobada por el Director — pendiente de liberación
            </p>
            <p className="text-sm text-indigo-800 dark:text-indigo-300 mt-1">
              La liberación final corresponde al Administrador (Director General), quien emite la orden y define la
              condición de pago (regla 7.2).
            </p>
          </div>
        </div>
      )}
      {(req.status === 'pendiente_liberacion' || req.status === 'approved') && req.single_quote_justification && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
            Aprobación con 1 cotización — justificación
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300">{req.single_quote_justification}</p>
        </div>
      )}
    </>
  )
}
