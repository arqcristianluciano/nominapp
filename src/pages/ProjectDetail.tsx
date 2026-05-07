import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { usePayrollStore } from '@/stores/payrollStore'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { ProjectDetailHeader } from '@/components/features/projects/ProjectDetailHeader'
import { ProjectDetailModals } from '@/components/features/projects/ProjectDetailModals'
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
      <ProjectDetailHeader project={project} draftPeriod={draftPeriod} onEdit={() => setShowEditProject(true)} onCreate={() => setShowCreate(true)} />

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

      <ProjectDetailModals
        projectId={projectId!}
        project={project}
        showCreate={showCreate}
        showEditProject={showEditProject}
        savingProject={savingProject}
        confirmDeleteId={confirmDeleteId}
        onCloseCreate={() => setShowCreate(false)}
        onCreated={(periodId) => { setShowCreate(false); navigate(`/nominas/${periodId}`) }}
        onCloseEditProject={() => setShowEditProject(false)}
        onSubmitEditProject={handleEditProject}
        onConfirmDeletePeriod={handleDeletePeriod}
        onCancelDeletePeriod={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
