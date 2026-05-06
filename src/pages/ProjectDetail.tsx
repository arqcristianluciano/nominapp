import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
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
import { ProjectBudgetSummary } from '@/components/features/projects/ProjectBudgetSummary'
import { ProjectModulesGrid } from '@/components/features/projects/ProjectModulesGrid'
import { ProjectPayrollSection } from '@/components/features/projects/ProjectPayrollSection'
import { ProjectRecentTransactions } from '@/components/features/projects/ProjectRecentTransactions'
import type { BudgetCategory, Project } from '@/types/database'

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

  async function handleEditProject(data: Partial<Project>) {
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
  const draftPeriod = periods.find((p) => p.status === 'draft' || p.status === 'submitted') ?? null

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
            {draftPeriod ? (
              <span
                title={`El Reporte No. ${draftPeriod.period_number} está pendiente. Concluye ese reporte antes de crear uno nuevo.`}
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl cursor-not-allowed border border-amber-200"
              >
                Borrador pendiente
              </span>
            ) : (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">
                <Plus className="w-4 h-4" /> Nuevo reporte
              </button>
            )}
          </div>
        </div>
      </div>

      <ProjectModulesGrid projectId={projectId!} />
      <ProjectBudgetSummary projectId={projectId!} totalBudget={totalBudget} totalInvested={totalInvested} />
      <ProjectRecentTransactions projectId={projectId!} transactions={recentTxns} />
      <ProjectPayrollSection
        loading={loading}
        periods={periods}
        draftPeriod={draftPeriod}
        deletingId={deletingId}
        duplicatingId={duplicatingId}
        onCreate={() => setShowCreate(true)}
        onDuplicate={handleDuplicatePeriod}
        onDelete={setConfirmDeleteId}
      />

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
