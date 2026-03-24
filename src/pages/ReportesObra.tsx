import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Calendar, FileText } from 'lucide-react'
import { payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { Modal } from '@/components/ui/Modal'
import { CreatePayrollForm } from '@/components/features/payroll/CreatePayrollForm'
import { formatRD } from '@/utils/currency'
import type { PayrollPeriod, Project } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-app-chip text-app-muted',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  paid: 'bg-emerald-50 text-emerald-700',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  approved: 'Aprobado',
  paid: 'Pagado',
}

export default function ReportesObra() {
  const navigate = useNavigate()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  useEffect(() => {
    Promise.all([
      payrollService.getAllPeriods(),
      projectService.getAll(),
    ]).then(([p, proj]) => {
      setPeriods(p)
      setProjects(proj)
      if (proj.length > 0) setSelectedProjectId(proj[0].id)
    }).finally(() => setLoading(false))
  }, [])

  const grouped = projects.map((proj) => ({
    project: proj,
    periods: periods.filter((p) => p.project_id === proj.id),
  })).filter((g) => g.periods.length > 0)

  const emptyProjects = projects.filter((p) => !periods.some((r) => r.project_id === p.id))

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Reportes</h1>
          <p className="text-sm text-app-muted mt-0.5">{periods.length} reporte{periods.length !== 1 ? 's' : ''} registrado{periods.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Nuevo reporte
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-app-muted">Cargando reportes...</div>
      ) : periods.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
          <FileText className="w-10 h-10 text-app-subtle mx-auto mb-3" />
          <p className="text-app-muted font-medium">No hay reportes registrados</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Crear el primer reporte
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ project, periods: pp }) => (
            <div key={project.id}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm font-semibold text-app-text">{project.name}</h2>
                  <p className="text-xs text-app-subtle">{project.code}</p>
                </div>
                <button
                  onClick={() => { setSelectedProjectId(project.id); setShowCreate(true) }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo reporte
                </button>
              </div>
              <div className="space-y-2">
                {pp.map((period) => (
                  <Link
                    key={period.id}
                    to={`/nominas/${period.id}`}
                    className="flex items-center justify-between bg-app-surface rounded-xl border border-app-border px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm">
                        {period.period_number}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-app-text">Reporte No. {period.period_number}</p>
                        <p className="text-xs text-app-muted flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(period.report_date).toLocaleDateString('es-DO')}
                          {period.reported_by && ` · ${period.reported_by}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[period.status] ?? 'bg-app-chip text-app-muted'}`}>
                        {STATUS_LABELS[period.status] ?? period.status}
                      </span>
                      <span className="text-sm font-semibold text-app-text hidden sm:inline">
                        {formatRD(period.grand_total || 0)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {emptyProjects.length > 0 && (
            <div>
              <p className="text-xs text-app-subtle font-medium uppercase tracking-wider mb-2">Proyectos sin reportes</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {emptyProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => { setSelectedProjectId(proj.id); setShowCreate(true) }}
                    className="flex items-center justify-between bg-app-surface rounded-xl border border-dashed border-app-border px-4 py-3 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-app-muted">{proj.name}</p>
                      <p className="text-xs text-app-subtle">{proj.code}</p>
                    </div>
                    <Plus className="w-4 h-4 text-app-subtle" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo reporte">
        {showCreate && (
          <div className="space-y-4">
            {projects.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">Proyecto</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            {selectedProjectId && (
              <CreatePayrollForm
                key={selectedProjectId}
                projectId={selectedProjectId}
                onCreated={(periodId) => { setShowCreate(false); navigate(`/nominas/${periodId}`) }}
                onCancel={() => setShowCreate(false)}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
