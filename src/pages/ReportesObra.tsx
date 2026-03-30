import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Calendar, FileText, TrendingUp, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
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

function ProjectSummaryBar({ periods }: { periods: PayrollPeriod[] }) {
  const total = periods.reduce((s, p) => s + (p.grand_total || 0), 0)
  const pagado = periods.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.grand_total || 0), 0)
  const aprobado = periods.filter((p) => p.status === 'approved').reduce((s, p) => s + (p.grand_total || 0), 0)
  const nBorradores = periods.filter((p) => p.status === 'draft' || p.status === 'submitted').length
  const porcentajePagado = total > 0 ? (pagado / total) * 100 : 0

  return (
    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap px-3 py-2 mb-2 bg-app-bg rounded-lg border border-app-border text-xs">
      <span className="flex items-center gap-1 text-app-muted">
        <TrendingUp className="w-3 h-3" />
        Total: <span className="font-semibold text-app-text ml-0.5">{formatRD(total)}</span>
      </span>
      <span className="text-app-border">·</span>
      <span className="text-app-muted">
        Pagado: <span className="font-semibold text-emerald-600">{formatRD(pagado)}</span>
        {porcentajePagado > 0 && (
          <span className="text-app-subtle ml-1">({porcentajePagado.toFixed(0)}%)</span>
        )}
      </span>
      {aprobado > 0 && (
        <>
          <span className="text-app-border">·</span>
          <span className="text-app-muted">
            Aprobado: <span className="font-semibold text-green-600">{formatRD(aprobado)}</span>
          </span>
        </>
      )}
      {nBorradores > 0 && (
        <>
          <span className="text-app-border">·</span>
          <span className="text-app-muted">
            {nBorradores} {nBorradores === 1 ? 'borrador' : 'borradores'}
          </span>
        </>
      )}
      <span className="text-app-border">·</span>
      <span className="text-app-muted">
        {periods.length} {periods.length === 1 ? 'reporte' : 'reportes'}
      </span>
    </div>
  )
}

const MAX_VISIBLE = 3

export default function ReportesObra() {
  const navigate = useNavigate()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [closingProjectId, setClosingProjectId] = useState<string | null>(null)

  function toggleExpand(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      next.has(projectId) ? next.delete(projectId) : next.add(projectId)
      return next
    })
  }

  async function handleMarkAllPaid(projectId: string) {
    setClosingProjectId(projectId)
    try {
      const drafts = periods.filter(
        (p) => p.project_id === projectId && (p.status === 'draft' || p.status === 'submitted' || p.status === 'approved')
      )
      await Promise.all(drafts.map((p) => payrollService.updatePeriodStatus(p.id, 'paid')))
      setPeriods((prev) =>
        prev.map((p) => (p.project_id === projectId && p.status !== 'paid') ? { ...p, status: 'paid' } : p)
      )
    } finally {
      setClosingProjectId(null)
    }
  }

  async function handleDelete(periodId: string) {
    setDeletingId(periodId)
    try {
      await payrollService.deletePeriod(periodId)
      setPeriods((prev) => prev.filter((p) => p.id !== periodId))
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

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
    hasDraft: periods.some((p) => p.project_id === proj.id && (p.status === 'draft' || p.status === 'submitted')),
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
          {grouped.map(({ project, periods: pp, hasDraft }) => {
            const isExpanded = expandedProjects.has(project.id)
            const hasMore = pp.length > MAX_VISIBLE
            const visible = isExpanded ? pp : pp.slice(0, MAX_VISIBLE)
            const hidden = pp.length - MAX_VISIBLE

            return (
              <div key={project.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-sm font-semibold text-app-text">{project.name}</h2>
                    <p className="text-xs text-app-subtle">{project.code}</p>
                  </div>
                  {hasDraft ? (
                    <button
                      onClick={() => handleMarkAllPaid(project.id)}
                      disabled={closingProjectId === project.id}
                      className="flex items-center gap-1 text-xs text-amber-600 hover:text-emerald-600 font-medium disabled:opacity-50 transition-colors"
                      title="Marcar todos los borradores como pagado"
                    >
                      {closingProjectId === project.id ? 'Guardando...' : 'Marcar como pagado'}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setSelectedProjectId(project.id); setShowCreate(true) }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nuevo reporte
                    </button>
                  )}
                </div>
                <ProjectSummaryBar periods={pp} />
                <div className="space-y-2">
                  {visible.map((period) => (
                    <div key={period.id} className="flex items-center gap-2">
                      <Link
                        to={`/nominas/${period.id}`}
                        className="flex-1 flex items-center justify-between bg-app-surface rounded-xl border border-app-border px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
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
                      {period.status === 'draft' && (
                        <button
                          onClick={() => setConfirmDeleteId(period.id)}
                          disabled={deletingId === period.id}
                          className="p-2 text-app-subtle hover:text-red-500 disabled:opacity-30"
                          title="Eliminar borrador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <button
                    onClick={() => toggleExpand(project.id)}
                    className="mt-2 flex items-center gap-1.5 text-xs text-app-muted hover:text-app-text font-medium w-full justify-center py-1.5 rounded-lg hover:bg-app-hover transition-colors"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="w-3.5 h-3.5" /> Mostrar menos</>
                    ) : (
                      <><ChevronDown className="w-3.5 h-3.5" /> Ver {hidden} reporte{hidden !== 1 ? 's' : ''} más</>
                    )}
                  </button>
                )}
              </div>
            )
          })}

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

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Eliminar borrador"
        message="¿Eliminar este reporte en borrador? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo reporte">
        {showCreate && (
          <div className="space-y-4">
            {projects.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">Proyecto</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
