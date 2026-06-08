import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Building2 } from 'lucide-react'
import { formatRD, formatPercent } from '@/utils/currency'
import type { ProjectKPI } from '@/services/directorService'
import type { ProjectProgress } from '@/hooks/useDashboardData'

interface Props {
  kpi: ProjectKPI
  progress?: ProjectProgress
}

function budgetBarColor(pct: number): string {
  if (pct >= 100) return 'bg-red-500'
  if (pct >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function workBarColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 40) return 'bg-blue-500'
  return 'bg-amber-500'
}

export function ProjectOverviewCard({ kpi, progress }: Props) {
  const executedPct = kpi.total_budget > 0 ? Math.min((kpi.total_actual / kpi.total_budget) * 100, 200) : 0
  const workPct = progress?.avg_completion ?? null
  const alertCount = kpi.pending_requisitions + kpi.low_stock_items

  return (
    <Link
      to={`/proyectos/${kpi.project_id}`}
      className="group flex flex-col gap-3 rounded-xl border border-app-border bg-app-surface p-4 shadow-xs transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-700"
      aria-label={`Ver proyecto ${kpi.project_name}`}
    >
      {/* Header: nombre + alertas */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-app-text group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {kpi.project_name}
            </h3>
            <p className="truncate text-xs text-app-muted">{kpi.project_code}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {alertCount > 0 && (
            <span
              className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              title={`${kpi.pending_requisitions} solicitudes pendientes · ${kpi.low_stock_items} items bajo mínimo`}
            >
              <AlertTriangle className="h-3 w-3" />
              {alertCount}
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-app-subtle opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <p className="text-app-muted">Presupuesto</p>
          <p className="font-semibold text-app-text">{formatRD(kpi.total_budget)}</p>
        </div>
        <div>
          <p className="text-app-muted">Gastado</p>
          <p className="font-semibold text-app-text">{formatRD(kpi.total_actual)}</p>
        </div>
        <div>
          <p className="text-app-muted">Por pagar (CxP)</p>
          <p className="font-semibold text-app-text">{formatRD(kpi.cxp_pending)}</p>
        </div>
        <div>
          <p className="text-app-muted">Avance de obra</p>
          <p className="font-semibold text-app-text">{workPct !== null ? formatPercent(workPct) : '—'}</p>
        </div>
      </div>

      {/* Barra de ejecución presupuestal */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-app-muted">Ejecución presupuestal</span>
          <span
            className={`text-[11px] font-bold ${executedPct >= 100 ? 'text-red-600' : executedPct >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}
          >
            {formatPercent(Math.min(executedPct, 100))}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-app-chip">
          <div
            className={`h-full rounded-full transition-all ${budgetBarColor(executedPct)}`}
            style={{ width: `${Math.min(executedPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Barra de avance de obra (solo si hay datos) */}
      {workPct !== null && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-app-muted">Avance de obra (cronograma)</span>
            <span className="text-[11px] font-bold text-app-muted">{formatPercent(workPct)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-app-chip">
            <div
              className={`h-full rounded-full transition-all ${workBarColor(workPct)}`}
              style={{ width: `${workPct}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}
