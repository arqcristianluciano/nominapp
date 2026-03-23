import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Calendar, Landmark, BarChart3, Trash2, ClipboardCheck, Layers, Pencil } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { usePayrollStore } from '@/stores/payrollStore'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { Modal } from '@/components/ui/Modal'
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
  const [showEditProject, setShowEditProject] = useState(false)
  const [savingProject, setSavingProject] = useState(false)

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
    if (!confirm('¿Eliminar este reporte? Esta acción no se puede deshacer.')) return
    setDeletingId(periodId)
    try {
      await payrollService.deletePeriod(periodId)
      if (projectId) fetchPeriods(projectId)
    } finally {
      setDeletingId(null)
    }
  }

  if (!project) return <div className="text-sm text-gray-500">Cargando proyecto...</div>

  const totalBudget = budgetCategories.reduce((sum, c) => sum + c.budgeted_amount, 0)
  const totalInvested = periods.reduce((sum, p) => sum + (p.grand_total || 0), 0)

  const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', submitted: 'bg-blue-50 text-blue-700', approved: 'bg-green-50 text-green-700', paid: 'bg-emerald-50 text-emerald-700' }
  const statusLabels: Record<string, string> = { draft: 'Borrador', submitted: 'Enviado', approved: 'Aprobado', paid: 'Pagado' }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/proyectos" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft className="w-4 h-4" /> Proyectos
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{project.location} · {project.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEditProject(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Nuevo reporte
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards + Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Reportes registrados</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{periods.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total invertido</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{formatRD(totalInvested)}</p>
        </div>
        <Link to={`/proyectos/${projectId}/control`} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Control Financiero</p>
              <p className="text-xs text-gray-500">Libro diario, CxP, cheques</p>
            </div>
          </div>
        </Link>
        <Link to={`/proyectos/${projectId}/presupuesto`} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Presupuesto</p>
              <p className="text-xs text-gray-500">Presupuesto vs real</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to={`/proyectos/${projectId}/cubicaciones`} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-50 text-teal-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Cubicaciones</p>
              <p className="text-xs text-gray-500">Contrato por contratista</p>
            </div>
          </div>
        </Link>
        <Link to={`/proyectos/${projectId}/calidad`} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Control de Calidad</p>
              <p className="text-xs text-gray-500">Ensayos de hormigón</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Budget Summary */}
      {totalBudget > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-900">Resumen presupuestario</p>
            <Link to={`/proyectos/${projectId}/presupuesto`} className="text-xs text-blue-600 hover:text-blue-800">Ver detalle</Link>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Presupuesto</p>
              <p className="text-sm font-semibold text-gray-900">{formatRD(totalBudget)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Invertido</p>
              <p className="text-sm font-semibold text-gray-900">{formatRD(totalInvested)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Disponible</p>
              <p className={`text-sm font-semibold ${totalBudget - totalInvested >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatRD(totalBudget - totalInvested)}
              </p>
            </div>
          </div>
          <div className="mt-3 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
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
            <h2 className="text-lg font-medium text-gray-900">Últimas transacciones</h2>
            <Link to={`/proyectos/${projectId}/control`} className="text-xs text-blue-600 hover:text-blue-800">Ver todas</Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <tbody>
                {recentTxns.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 w-24">{new Date(t.date).toLocaleDateString('es-DO')}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-900 font-medium">{t.description}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{t.supplier?.name || ''}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-900 font-medium text-right">{formatRD(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payrolls */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-3">Reportes</h2>
        {loading ? <div className="text-sm text-gray-500">Cargando reportes...</div> : periods.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No hay reportes registrados aún</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
              Crear el primer reporte
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {periods.map((period) => (
              <div key={period.id} className="flex items-center gap-2">
                <Link to={`/nominas/${period.id}`} className="flex-1 flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm">{period.period_number}</div>
                    <div>
                      <p className="font-medium text-gray-900">Reporte No. {period.period_number}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(period.report_date).toLocaleDateString('es-DO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[period.status]}`}>{statusLabels[period.status]}</span>
                    <span className="text-sm font-medium text-gray-900 hidden sm:inline">{formatRD(period.grand_total || 0)}</span>
                  </div>
                </Link>
                {period.status === 'draft' && (
                  <button
                    onClick={() => handleDeletePeriod(period.id)}
                    disabled={deletingId === period.id}
                    className="p-2 text-gray-300 hover:text-red-500 disabled:opacity-50"
                    title="Eliminar reporte"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
    </div>
  )
}
