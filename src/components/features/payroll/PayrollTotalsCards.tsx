import { formatRD } from '@/utils/currency'

export function PayrollTotalsCards({
  labor,
  materials,
  indirect,
  grandTotal,
}: {
  labor: number
  materials: number
  indirect: number
  grandTotal: number
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="rounded-lg px-3 py-2.5 bg-app-surface border border-app-border"><p className="text-xs text-app-muted">Mano de obra</p><p className="text-sm font-semibold mt-0.5">{formatRD(labor)}</p></div>
      <div className="rounded-lg px-3 py-2.5 bg-app-surface border border-app-border"><p className="text-xs text-app-muted">Materiales</p><p className="text-sm font-semibold mt-0.5">{formatRD(materials)}</p></div>
      <div className="rounded-lg px-3 py-2.5 bg-app-surface border border-app-border"><p className="text-xs text-app-muted">Indirectos</p><p className="text-sm font-semibold mt-0.5">{formatRD(indirect)}</p></div>
      <div className="rounded-lg px-3 py-2.5 bg-blue-600"><p className="text-xs text-blue-200">Total general</p><p className="text-sm font-semibold text-white mt-0.5">{formatRD(grandTotal)}</p></div>
    </div>
  )
}
