import { Calendar, Copy, Trash2 } from 'lucide-react'
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
  return (
    <div>
      <h2 className="text-lg font-medium text-app-text mb-3">Reportes</h2>
      {loading ? <div className="text-sm text-app-muted">Cargando reportes...</div> : periods.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <p className="text-app-muted">No hay reportes registrados aún</p>
          {canCreatePayroll && (
            <button onClick={onCreate} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">Crear el primer reporte</button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {periods.map((period) => (
            <div key={period.id} className="flex items-center gap-2">
              <Link to={`/nominas/${period.id}`} className="flex-1 flex items-center justify-between bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm">{period.period_number}</div>
                  <div>
                    <p className="font-medium text-app-text">Reporte No. {period.period_number}</p>
                    <p className="text-xs text-app-muted flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" />{new Date(period.report_date).toLocaleDateString('es-DO')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[period.status]}`}>{statusLabels[period.status]}</span>
                  <span className="text-sm font-medium text-app-text hidden sm:inline">{formatRD(period.grand_total || 0)}</span>
                </div>
              </Link>
              <div className="flex items-center gap-1">
                {canCreatePayroll && (
                  <button
                    onClick={() => onDuplicate(period.id)}
                    disabled={duplicatingId === period.id || !!draftPeriod}
                    className="p-2 text-app-subtle hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={draftPeriod ? `Concluye el Reporte No. ${draftPeriod.period_number} antes de duplicar` : 'Duplicar reporte'}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                {period.status === 'draft' && canDeletePayrollDraft && (
                  <button onClick={() => onDelete(period.id)} disabled={deletingId === period.id} className="p-2 text-app-subtle hover:text-red-500 disabled:opacity-50" title="Eliminar reporte">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
