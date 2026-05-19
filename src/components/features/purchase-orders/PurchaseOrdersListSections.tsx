import { Eye, Package, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PurchaseRequisition } from '@/types/purchaseOrder'
import { REQ_STATUS_COLOR, REQ_STATUS_LABEL } from '@/types/purchaseOrder'

export function PurchaseOrdersHeader({
  filteredCount,
  totalCount,
  onNew,
}: {
  filteredCount: number
  totalCount: number
  onNew: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-app-text">Órdenes de Compra</h1><p className="text-sm text-app-muted mt-0.5">{filteredCount} de {totalCount} solicitud{totalCount !== 1 ? 'es' : ''}</p></div>
      <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-600/20 shrink-0"><Plus className="w-4 h-4" /> Nueva solicitud</button>
    </div>
  )
}

export function PurchaseOrdersFilters({
  search,
  statusFilter,
  statusOptions,
  onSearchChange,
  onStatusChange,
}: {
  search: string
  statusFilter: string
  statusOptions: ReadonlyArray<{ value: string; label: string }>
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" /><input type="text" placeholder="Buscar solicitud..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
      <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} className="px-3 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    </div>
  )
}

export function PurchaseOrdersTable({ requisitions }: { requisitions: PurchaseRequisition[] }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
      <table className="w-full text-sm">
        <thead><tr className="bg-app-bg border-b border-app-border"><th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">N° Solicitud</th><th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Descripción</th><th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden md:table-cell">Proyecto</th><th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden lg:table-cell">Solicitado por</th><th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">Fecha req.</th><th className="text-center px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Estado</th><th className="w-14" /></tr></thead>
        <tbody className="divide-y divide-app-border">
          {requisitions.map((requisition) => (
            <tr key={requisition.id} className="hover:bg-app-hover transition-colors group">
              <td className="px-4 py-3.5"><span className="font-mono text-xs font-semibold text-app-muted bg-app-chip px-1.5 py-0.5 rounded">{requisition.req_number}</span></td>
              <td className="px-4 py-3.5"><span className="font-semibold text-app-text text-sm">{requisition.description}</span></td>
              <td className="px-4 py-3.5 text-sm text-app-muted hidden md:table-cell">{requisition.project?.name ?? <span className="text-app-subtle">—</span>}</td>
              <td className="px-4 py-3.5 text-sm text-app-muted hidden lg:table-cell">{requisition.requested_by}</td>
              <td className="px-4 py-3.5 text-sm text-app-muted hidden sm:table-cell">{requisition.required_date ?? <span className="text-app-subtle">—</span>}</td>
              <td className="px-4 py-3.5 text-center"><span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${REQ_STATUS_COLOR[requisition.status]}`}>{REQ_STATUS_LABEL[requisition.status]}</span></td>
              <td className="px-2 py-3.5 text-right"><Link to={`/ordenes-compra/${requisition.id}`} className="inline-flex items-center gap-1 p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all" title="Ver detalle"><Eye className="w-4 h-4" /></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmptyPurchaseOrders({ onNew }: { onNew: () => void }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center mx-auto mb-4"><Package className="w-7 h-7 text-blue-600 dark:text-blue-400" /></div>
      <p className="text-base font-semibold text-app-text mb-1">Sin solicitudes de compra</p>
      <p className="text-sm text-app-muted mb-5">Crea una solicitud y agrega mínimo 2 cotizaciones (o 1 con justificación) para aprobar</p>
      <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"><Plus className="w-4 h-4" /> Nueva solicitud</button>
    </div>
  )
}
