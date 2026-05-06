import { formatRD } from '@/utils/currency'
import type { ReportTotals } from './reportTypes'

export function ReportsSummaryCards({ totals }: { totals: ReportTotals }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-app-surface rounded-xl border border-app-border p-4"><p className="text-xs text-app-muted">Total incurrido</p><p className="text-xl font-semibold text-app-text mt-1">{formatRD(totals.totalIncurrido)}</p></div>
      <div className="bg-app-surface rounded-xl border border-app-border p-4"><p className="text-xs text-app-muted">Presupuesto total</p><p className="text-xl font-semibold text-app-text mt-1">{formatRD(totals.presupuesto)}</p></div>
      <div className="bg-app-surface rounded-xl border border-app-border p-4"><p className="text-xs text-app-muted">CxP pendientes</p><p className="text-xl font-semibold text-red-700 mt-1">{formatRD(totals.cxp)}</p></div>
      <div className="bg-app-surface rounded-xl border border-app-border p-4"><p className="text-xs text-app-muted">Cash disponible</p><p className={`text-xl font-semibold mt-1 ${totals.cashDisponible >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatRD(totals.cashDisponible)}</p></div>
    </div>
  )
}
