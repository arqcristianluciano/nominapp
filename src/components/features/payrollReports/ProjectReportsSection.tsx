import { Calendar, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatRD } from '@/utils/currency'
import type { PayrollPeriod, Project } from '@/types/database'
import { PAYROLL_REPORT_STATUS_COLORS, PAYROLL_REPORT_STATUS_LABELS } from './reportStatus'
import { ProjectSummaryBar } from './ProjectSummaryBar'

const MAX_VISIBLE = 3

interface Props {
  project: Project
  periods: PayrollPeriod[]
  expanded: boolean
  closing: boolean
  deletingId: string | null
  onToggleExpand: (projectId: string) => void
  onMarkAllPaid: (projectId: string) => void
  onCreateNew: (projectId: string) => void
  onDeleteDraft: (periodId: string) => void
}

export function ProjectReportsSection({
  project,
  periods,
  expanded,
  closing,
  deletingId,
  onToggleExpand,
  onMarkAllPaid,
  onCreateNew,
  onDeleteDraft,
}: Props) {
  const hasDraft = periods.some((period) => period.status === 'draft' || period.status === 'submitted')
  const hasMore = periods.length > MAX_VISIBLE
  const visiblePeriods = expanded ? periods : periods.slice(0, MAX_VISIBLE)
  const hidden = periods.length - MAX_VISIBLE

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div><h2 className="text-sm font-semibold text-app-text">{project.name}</h2><p className="text-xs text-app-subtle">{project.code}</p></div>
        {hasDraft ? (
          <button onClick={() => onMarkAllPaid(project.id)} disabled={closing} className="flex items-center gap-1 text-xs text-amber-600 hover:text-emerald-600 font-medium disabled:opacity-50 transition-colors" title="Marcar todos los borradores como pagado">
            {closing ? 'Guardando...' : 'Marcar como pagado'}
          </button>
        ) : (
          <button onClick={() => onCreateNew(project.id)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"><Plus className="w-3.5 h-3.5" /> Nuevo reporte</button>
        )}
      </div>

      <ProjectSummaryBar periods={periods} />
      <div className="space-y-2">
        {visiblePeriods.map((period) => (
          <div key={period.id} className="flex items-center gap-2">
            <Link to={`/nominas/${period.id}`} className="flex-1 flex items-center justify-between bg-app-surface rounded-xl border border-app-border px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm">{period.period_number}</div>
                <div>
                  <p className="text-sm font-medium text-app-text">Reporte No. {period.period_number}</p>
                  <p className="text-xs text-app-muted flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" />{new Date(period.report_date).toLocaleDateString('es-DO')}{period.reported_by && ` · ${period.reported_by}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PAYROLL_REPORT_STATUS_COLORS[period.status] ?? 'bg-app-chip text-app-muted'}`}>{PAYROLL_REPORT_STATUS_LABELS[period.status] ?? period.status}</span>
                <span className="text-sm font-semibold text-app-text hidden sm:inline">{formatRD(period.grand_total || 0)}</span>
              </div>
            </Link>
            {period.status === 'draft' && (
              <button onClick={() => onDeleteDraft(period.id)} disabled={deletingId === period.id} className="p-2 text-app-subtle hover:text-red-500 disabled:opacity-30" title="Eliminar borrador">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button onClick={() => onToggleExpand(project.id)} className="mt-2 flex items-center gap-1.5 text-xs text-app-muted hover:text-app-text font-medium w-full justify-center py-1.5 rounded-lg hover:bg-app-hover transition-colors">
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Mostrar menos</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver {hidden} reporte{hidden !== 1 ? 's' : ''} más</>}
        </button>
      )}
    </div>
  )
}
