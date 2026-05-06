import type { PurchaseRequisition } from '@/types/purchaseOrder'

export function PurchaseOrderMeta({ req }: { req: PurchaseRequisition }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      <div><span className="text-app-muted text-xs block">Proyecto</span><span className="font-medium">{req.project?.name}</span></div>
      <div><span className="text-app-muted text-xs block">Solicitado por</span><span className="font-medium">{req.requested_by}</span></div>
      {req.required_date && <div><span className="text-app-muted text-xs block">Fecha requerida</span><span className="font-medium">{req.required_date}</span></div>}
      {req.approved_by && <div><span className="text-app-muted text-xs block">Aprobado por</span><span className="font-medium text-green-700">{req.approved_by}</span></div>}
      {req.approved_at && <div><span className="text-app-muted text-xs block">Fecha aprobación</span><span className="font-medium">{new Date(req.approved_at).toLocaleDateString('es-DO')}</span></div>}
      {req.payment_type && <div><span className="text-app-muted text-xs block">Forma de pago</span><span className="font-medium">{req.payment_type === 'credit' ? 'Crédito' : 'Contado'}</span></div>}
      {req.rejection_reason && <div className="col-span-2"><span className="text-app-muted text-xs block">Motivo rechazo</span><span className="font-medium text-red-700">{req.rejection_reason}</span></div>}
      {req.notes && <div className="col-span-2"><span className="text-app-muted text-xs block">Notas</span><span>{req.notes}</span></div>}
    </div>
  )
}
