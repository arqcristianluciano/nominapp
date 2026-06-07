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
    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3 sm:p-4 min-w-0">
      <p className="text-xs text-red-600 dark:text-red-400">
        {projectFilter === 'all' ? 'Total CxP consolidado' : 'Total CxP (proyecto seleccionado)'}
      </p>
      <p className="text-lg sm:text-2xl font-bold text-red-700 dark:text-red-400 break-all leading-tight">
        {formatRD(displayedTotal)}
      </p>
      <p className="text-xs text-app-muted mt-1">
        {projectFilter === 'all'
          ? `${groupsCount} proyecto(s) con CxP pendientes`
          : `${displayedCount} proyecto(s) en vista`}
      </p>
    </div>
  )
}

export function CxPConsolidadoEmpty({ filteredProjectName }: { filteredProjectName: string | null }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
      <CreditCard className="w-12 h-12 text-app-subtle mx-auto mb-3" />
      <p className="text-app-muted">
        No hay cuentas por pagar pendientes{filteredProjectName ? ` para «${filteredProjectName}»` : ''}.
      </p>
    </div>
  )
}

export function CxPConsolidadoGroups({ groups }: { groups: CxPProjectGroup[] }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const seenKeysMobile = new Map<string, number>()
        const seenKeysDesktop = new Map<string, number>()
        return (
          <div key={group.projectId} className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
            <div className="bg-app-bg px-3 sm:px-4 py-3 border-b border-app-border flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-app-text truncate">{group.projectName}</h3>
                <p className="text-xs text-app-muted">{group.items.length} factura(s) pendiente(s)</p>
              </div>
              <span className="text-sm font-bold text-red-700 dark:text-red-400 whitespace-nowrap shrink-0 text-right break-all max-w-[40%] sm:max-w-none">
                {formatRD(group.total)}
              </span>
            </div>

            {/* Mobile: card list */}
            <div className="md:hidden p-3 space-y-3">
              {group.items.map((item) => {
                const baseKey = `${item.supplierId ?? 'nosupplier'}-${item.invoiceNumber ?? 'noinvoice'}-${item.date}`
                const dup = seenKeysMobile.get(baseKey) ?? 0
                seenKeysMobile.set(baseKey, dup + 1)
                const rowKey = dup === 0 ? baseKey : `${baseKey}#${dup}`
                return (
                  <div key={rowKey} className="bg-app-bg/40 rounded-lg border border-app-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-app-text truncate min-w-0 flex-1">{item.supplierName}</p>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400 whitespace-nowrap shrink-0">
                        {formatRD(item.pending)}
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <p className="text-app-muted uppercase tracking-wide text-[9px]">Fecha</p>
                        <p className="text-app-text">{new Date(item.date).toLocaleDateString('es-DO')}</p>
                      </div>
                      <div>
                        <p className="text-app-muted uppercase tracking-wide text-[9px]">Factura</p>
                        <p className="text-app-text truncate">{item.invoiceNumber || '—'}</p>
                      </div>
                      <div>
                        <p className="text-app-muted uppercase tracking-wide text-[9px]">Condición</p>
                        <p className="text-app-text truncate">{item.paymentCondition || '—'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-app-border">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Factura</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">
                      Proveedor
                    </th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">
                      Pendiente
                    </th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">
                      Condición
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => {
                    const baseKey = `${item.supplierId ?? 'nosupplier'}-${item.invoiceNumber ?? 'noinvoice'}-${item.date}`
                    const dup = seenKeysDesktop.get(baseKey) ?? 0
                    seenKeysDesktop.set(baseKey, dup + 1)
                    const rowKey = dup === 0 ? baseKey : `${baseKey}#${dup}`
                    return (
                      <tr key={rowKey} className="border-b border-app-border hover:bg-app-hover">
                        <td className="px-4 py-2 text-xs text-app-muted whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString('es-DO')}
                        </td>
                        <td className="px-4 py-2 text-xs text-app-muted">{item.invoiceNumber || '—'}</td>
                        <td className="px-4 py-2 text-xs text-app-text font-medium">{item.supplierName}</td>
                        <td className="px-4 py-2 text-xs text-red-700 dark:text-red-400 font-semibold text-right whitespace-nowrap">
                          {formatRD(item.pending)}
                        </td>
                        <td className="px-4 py-2 text-xs text-app-muted">{item.paymentCondition}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
