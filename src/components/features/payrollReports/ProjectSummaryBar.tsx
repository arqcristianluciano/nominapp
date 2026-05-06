import { TrendingUp } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { PayrollPeriod } from '@/types/database'

export function ProjectSummaryBar({ periods }: { periods: PayrollPeriod[] }) {
  const total = periods.reduce((sum, period) => sum + (period.grand_total || 0), 0)
  const paid = periods.filter((period) => period.status === 'paid').reduce((sum, period) => sum + (period.grand_total || 0), 0)
  const approved = periods.filter((period) => period.status === 'approved').reduce((sum, period) => sum + (period.grand_total || 0), 0)
  const drafts = periods.filter((period) => period.status === 'draft' || period.status === 'submitted').length
  const paidPct = total > 0 ? (paid / total) * 100 : 0

  return (
    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap px-3 py-2 mb-2 bg-app-bg rounded-lg border border-app-border text-xs">
      <span className="flex items-center gap-1 text-app-muted"><TrendingUp className="w-3 h-3" />Total: <span className="font-semibold text-app-text ml-0.5">{formatRD(total)}</span></span>
      <span className="text-app-border">·</span>
      <span className="text-app-muted">Pagado: <span className="font-semibold text-emerald-600">{formatRD(paid)}</span>{paidPct > 0 && <span className="text-app-subtle ml-1">({paidPct.toFixed(0)}%)</span>}</span>
      {approved > 0 && <><span className="text-app-border">·</span><span className="text-app-muted">Aprobado: <span className="font-semibold text-green-600">{formatRD(approved)}</span></span></>}
      {drafts > 0 && <><span className="text-app-border">·</span><span className="text-app-muted">{drafts} {drafts === 1 ? 'borrador' : 'borradores'}</span></>}
      <span className="text-app-border">·</span>
      <span className="text-app-muted">{periods.length} {periods.length === 1 ? 'reporte' : 'reportes'}</span>
    </div>
  )
}
