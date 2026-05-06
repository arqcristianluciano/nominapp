import { AlertTriangle } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import type { PurchaseRequisition } from '@/types/purchaseOrder'
import { REQ_STATUS_COLOR, REQ_STATUS_LABEL } from '@/types/purchaseOrder'

export function PurchaseOrderHeader({ req }: { req: PurchaseRequisition }) {
  return (
    <>
      <div>
        <Breadcrumb items={[{ label: 'Órdenes de compra', to: '/ordenes-compra' }, { label: req.req_number }]} />
        <div className="flex items-center gap-3 flex-wrap"><h1 className="text-xl font-bold text-app-text">{req.req_number}</h1><span className={`px-3 py-1 rounded-full text-xs font-medium ${REQ_STATUS_COLOR[req.status]}`}>{REQ_STATUS_LABEL[req.status]}</span></div>
        <p className="text-sm text-app-muted mt-0.5">{req.description}</p>
      </div>
      {req.status === 'needs_revision' && req.revision_notes && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div><p className="text-sm font-semibold text-orange-800">Devuelta para revisión</p><p className="text-sm text-orange-700 mt-1">{req.revision_notes}</p><p className="text-xs text-orange-500 mt-2">Corrija las cotizaciones y reenvíe a aprobación cuando esté listo.</p></div>
        </div>
      )}
    </>
  )
}
