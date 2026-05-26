import { useState } from 'react'
import { Calendar, ChevronDown, Copy, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PayrollPeriod } from '@/types/database'
import { formatRD } from '@/utils/currency'
import { useProjectRoles } from '@/hooks/useProjectRoles'

interface Props {
  projectId: string
  loading: boolean
  periods: PayrollPeriod[]
  draftPeriod: PayrollPeriod | null
  deletingId: string | null
  duplicatingId: string | null
  onCreate: () => void
  onDuplicate: (periodId: string) => void
  onDelete: (periodId: string) => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-app-chip text-app-muted',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  paid: 'bg-emerald-50 text-emerald-700',
}
const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  approved: 'Aprobado',
  paid: 'Pagado',
}

export function ProjectPayrollSection({
  projectId,
  loading,
  periods,
  draftPeriod,
  deletingId,
  duplicatingId,
  onCreate,
  onDuplicate,
  onDelete,
}: Props) {
  const { canCreatePayroll, canDeletePayrollDraft } = useProjectRoles(projectId)
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full sm:w-auto sm:cursor-default flex items-center justify-between gap-2 mb-3 text-left sm:pointer-events-none min-h-[44px] sm:min-h-0"
      >
        <h2 className="text-lg font-medium text-app-text">Reportes</h2>
        <ChevronDown className={`w-5 h-5 text-app-muted sm:hidden transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${open ? '' : 'hidden'} sm:block`}>
        {loading ? <div className="text-sm text-app-muted">Cargando reportes...</div> : periods.length === 0 ? (
          <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
            <p className="text-app-muted">No hay reportes registrados aún</p>
            {canCreatePayroll && (
              <button onClick={onCreate} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center justify-center min-h-[44px] sm:min-h-0 px-2">Crear el primer reporte</button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {periods.map((period) => (
              <div key={period.id} className="flex items-center gap-1 sm:gap-2">
                <Link
                  to={`/nominas/${period.id}`}
                  className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-app-surface rounded-xl border border-app-border p-3 sm:p-4 hover:border-blue-300 hover:shadow-sm transition-all min-h-[44px]"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm">{period.period_number}</div>
                    <div className="min-w-0">
                      <p className="font-medium text-app-text truncate">Reporte No. {period.period_number}</p>
                      <p className="text-xs text-app-muted flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3 shrink-0" />{new Date(period.report_date).toLocaleDateString('es-DO')}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pl-12 sm:pl-0">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[period.status]}`}>{statusLabels[period.status]}</span>
                    <span className="text-sm font-medium text-app-text whitespace-nowrap break-all">{formatRD(period.grand_total || 0)}</span>
                  </div>
                </Link>
                <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0">
                  {canCreatePayroll && (
                    <button
                      onClick={() => onDuplicate(period.id)}
                      disabled={duplicatingId === period.id || !!draftPeriod}
                      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 text-app-subtle hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={draftPeriod ? `Concluye el Reporte No. ${draftPeriod.period_number} antes de duplicar` : 'Duplicar reporte'}
                      aria-label="Duplicar reporte"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  {period.status === 'draft' && canDeletePayrollDraft && (
                    <button
                      onClick={() => onDelete(period.id)}
                      disabled={deletingId === period.id}
                      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 text-app-subtle hover:text-red-500 disabled:opacity-50"
                      title="Eliminar reporte"
                      aria-label="Eliminar reporte"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
