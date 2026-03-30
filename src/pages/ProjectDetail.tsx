import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, Calendar, Landmark, BarChart3, Trash2, ClipboardCheck, Layers, Pencil, PackageSearch, Copy } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { useProjectStore } from '@/stores/projectStore'
import { usePayrollStore } from '@/stores/payrollStore'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { CreatePayrollForm } from '@/components/features/payroll/CreatePayrollForm'
import { ProjectForm } from '@/components/features/projects/ProjectForm'
import { formatRD } from '@/utils/currency'
import type { BudgetCategory } from '@/types/database'

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { projects, fetchProjects } = useProjectStore()
  const { periods, loading, fetchPeriods } = usePayrollStore()
  const [showCreate, setShowCreate] = useState(false)
  const [recentTxns, setRecentTxns] = useState<TransactionWithRelations[]>([])
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])

  const project = projects.find((p) => p.id === projectId)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showEditProject, setShowEditProject] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!projects.length) fetchProjects()
    if (projectId) {
      fetchPeriods(projectId)
      transactionService.getByProject(projectId).then((txns) => setRecentTxns(txns.slice(0, 5))).catch(() => {})
      budgetCategoryService.getByProject(projectId).then(setBudgetCategories).catch(() => {})
    }
  }, [projectId, projects.length, fetchProjects, fetchPeriods])

  async function handleEditProject(data: any) {
    if (!projectId) return
    setSavingProject(true)
    try {
      await projectService.update(projectId, data)
      setShowEditProject(false)
      fetchProjects()
    } finally {
      setSavingProject(false)
    }
  }

  async function handleDeletePeriod(periodId: string) {
    setDeletingId(periodId)
    try {
      await payrollService.deletePeriod(periodId)
      if (projectId) fetchPeriods(projectId)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  async function handleDuplicatePeriod(periodId: string) {
    if (!projectId) return
    setDuplicatingId(periodId)
    try {
      const newPeriod = await payrollService.duplicatePeriod(periodId, projectId)
      navigate(`/nominas/${newPeriod.id}`)
    } finally {
      setDuplicatingId(null)
    }
  }

  if (!project) return <div className="text-sm text-app-muted">Cargando proyecto...</div>

  const totalBudget = budgetCategories.reduce((sum, c) => sum + c.budgeted_amount, 0)
  const totalInvested = periods.reduce((sum, p) => sum + (p.grand_total || 0), 0)

  const statusColors: Record<string, string> = { draft: 'bg-app-chip text-app-muted', submitted: 'bg-blue-50 text-blue-700', approved: 'bg-green-50 text-green-700', paid: 'bg-emerald-50 text-emerald-700' }
  const statusLabels: Record<string, string> = { draft: 'Borrador', submitted: 'Enviado', approved: 'Aprobado', paid: 'Pagado' }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: project.name }]} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-app-text">{project.name}</h1>
            <p className="text-sm text-app-muted mt-0.5">{project.location} · {project.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEditProject(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-app-muted border border-app-border rounded-xl hover:bg-app-hover transition-colors">
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">
              <Plus className="w-4 h-4" /> Nuevo reporte
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards + Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-surface rounded-xl border border-app-border p-4">
          <p className="text-xs text-app-muted">Reportes registrados</p>
          <p className="text-2xl font-semibold text-app-text mt-1">{periods.length}</p>
        </div>
        <div className="bg-app-surface rounded-xl border border-app-border p-4">
          <p className="text-xs text-app-muted">Total invertido</p>
          <p className="text-2xl font-semibold text-app-text mt-1">{formatRD(totalInvested)}</p>
        </div>
        <Link to={`/proyectos/${projectId}/control`} className="bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-app-text">Control Financiero</p>
              <p className="text-xs text-app-muted">Libro diario, CxP, cheques</p>
            </div>
          </div>
        </Link>
        <Link to={`/proyectos/${projectId}/presupuesto`} className="bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-app-text">Presupuesto</p>
              <p className="text-xs text-app-muted">Presupuesto vs real</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to={`/proyectos/${projectId}/cubicaciones`} className="bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-50 text-teal-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-app-text">Cubicaciones</p>
              <p className="text-xs text-app-muted">Contrato por contratista</p>
            </div>
          </div>
        </Link>
        <Link to={`/proyectos/${projectId}/calidad`} className="bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-app-text">Control de Calidad</p>
              <p className="text-xs text-app-muted">Ensayos de hormigón</p>
            </div>
          </div>
        </Link>
        <Link to={`/proyectos/${projectId}/insumos`} className="bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
              <PackageSearch className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-app-text">Listado de Insumos</p>
              <p className="text-xs text-app-muted">Presupuesto Mercado · contratos de ajuste</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Budget Summary */}
      {totalBudget > 0 && (
        <div className="bg-app-surface rounded-xl border border-app-border p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-app-text">Resumen presupuestario</p>
            <Link to={`/proyectos/${projectId}/presupuesto`} className="text-xs text-blue-600 hover:text-blue-800">Ver detalle</Link>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-app-muted">Presupuesto</p>
              <p className="text-sm font-semibold text-app-text">{formatRD(totalBudget)}</p>
            </div>
            <div>
              <p className="text-xs text-app-muted">Invertido</p>
              <p className="text-sm font-semibold text-app-text">{formatRD(totalInvested)}</p>
            </div>
            <div>
              <p className="text-xs text-app-muted">Disponible</p>
              <p className={`text-sm font-semibold ${totalBudget - totalInvested >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatRD(totalBudget - totalInvested)}
              </p>
            </div>
          </div>
          <div className="mt-3 w-full h-2 bg-app-chip rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                totalInvested / totalBudget > 0.9 ? 'bg-red-500' : totalInvested / totalBudget > 0.7 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((totalInvested / totalBudget) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTxns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-app-text">Últimas transacciones</h2>
            <Link to={`/proyectos/${projectId}/control`} className="text-xs text-blue-600 hover:text-blue-800">Ver todas</Link>
          </div>
          <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
            <table className="w-full">
              <tbody>
                {recentTxns.map((t) => (
                  <tr key={t.id} className="border-b border-app-border last:border-0 hover:bg-app-hover">
                    <td className="px-4 py-2.5 text-xs text-app-muted w-24">{new Date(t.date).toLocaleDateString('es-DO')}</td>
                    <td className="px-4 py-2.5 text-xs text-app-text font-medium">{t.description}</td>
                    <td className="px-4 py-2.5 text-xs text-app-muted">{t.supplier?.name || ''}</td>
                    <td className="px-4 py-2.5 text-xs text-app-text font-medium text-right">{formatRD(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payrolls */}
      <div>
        <h2 className="text-lg font-medium text-app-text mb-3">Reportes</h2>
        {loading ? <div className="text-sm text-app-muted">Cargando reportes...</div> : periods.length === 0 ? (
          <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
            <p className="text-app-muted">No hay reportes registrados aún</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
              Crear el primer reporte
            </button>
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
                      <p className="text-xs text-app-muted flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(period.report_date).toLocaleDateString('es-DO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[period.status]}`}>{statusLabels[period.status]}</span>
                    <span className="text-sm font-medium text-app-text hidden sm:inline">{formatRD(period.grand_total || 0)}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicatePeriod(period.id)}
                    disabled={duplicatingId === period.id}
                    className="p-2 text-app-subtle hover:text-blue-500 disabled:opacity-50"
                    title="Duplicar reporte"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {period.status === 'draft' && (
                    <button
                      onClick={() => setConfirmDeleteId(period.id)}
                      disabled={deletingId === period.id}
                      className="p-2 text-app-subtle hover:text-red-500 disabled:opacity-50"
                      title="Eliminar reporte"
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo reporte">
        <CreatePayrollForm
          projectId={projectId!}
          onCreated={(periodId) => { setShowCreate(false); navigate(`/nominas/${periodId}`) }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal open={showEditProject} onClose={() => setShowEditProject(false)} title="Editar proyecto">
        {project && (
          <ProjectForm
            initial={project}
            onSubmit={handleEditProject}
            onCancel={() => setShowEditProject(false)}
            saving={savingProject}
          />
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Eliminar reporte"
        message="¿Eliminar este reporte? Esta acción no se puede deshacer y se perderán todas las partidas asociadas."
        confirmLabel="Eliminar"
        onConfirm={() => confirmDeleteId && handleDeletePeriod(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
