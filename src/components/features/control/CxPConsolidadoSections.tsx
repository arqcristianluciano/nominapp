import { CreditCard } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { CxPProjectGroup } from '@/hooks/useCxPConsolidadoTodos'

export function CxPConsolidadoSummary({
  projectFilter,
  displayedTotal,
  groupsCount,
  displayedCount,
}: {
  projectFilter: string
  displayedTotal: number
  groupsCount: number
  displayedCount: number
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="text-xs text-red-600">{projectFilter === 'all' ? 'Total CxP consolidado' : 'Total CxP (proyecto seleccionado)'}</p>
      <p className="text-2xl font-bold text-red-700">{formatRD(displayedTotal)}</p>
      <p className="text-xs text-app-muted mt-1">{projectFilter === 'all' ? `${groupsCount} proyecto(s) con CxP pendientes` : `${displayedCount} proyecto(s) en vista`}</p>
    </div>
  )
}

export function CxPConsolidadoEmpty({ filteredProjectName }: { filteredProjectName: string | null }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
      <CreditCard className="w-12 h-12 text-app-subtle mx-auto mb-3" />
      <p className="text-app-muted">No hay cuentas por pagar pendientes{filteredProjectName ? ` para «${filteredProjectName}»` : ''}.</p>
    </div>
  )
}

export function CxPConsolidadoGroups({ groups }: { groups: CxPProjectGroup[] }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.projectId} className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <div className="bg-app-bg px-4 py-3 border-b border-app-border flex items-center justify-between"><div><h3 className="text-sm font-semibold text-app-text">{group.projectName}</h3><p className="text-xs text-app-muted">{group.items.length} factura(s) pendiente(s)</p></div><span className="text-sm font-bold text-red-700">{formatRD(group.total)}</span></div>
          <table className="w-full">
            <thead><tr className="border-b border-app-border"><th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th><th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Factura</th><th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Proveedor</th><th className="px-4 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Pendiente</th><th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Condición</th></tr></thead>
            <tbody>{group.items.map((item, index) => <tr key={index} className="border-b border-app-border hover:bg-app-hover"><td className="px-4 py-2 text-xs text-app-muted">{new Date(item.date).toLocaleDateString('es-DO')}</td><td className="px-4 py-2 text-xs text-app-muted">{item.invoiceNumber || '—'}</td><td className="px-4 py-2 text-xs text-app-text font-medium">{item.supplierName}</td><td className="px-4 py-2 text-xs text-red-700 font-semibold text-right">{formatRD(item.pending)}</td><td className="px-4 py-2 text-xs text-app-muted">{item.paymentCondition}</td></tr>)}</tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
