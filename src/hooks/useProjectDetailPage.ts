import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { payrollService, COMMITTED_PAYROLL_STATUSES } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { usePayrollStore } from '@/stores/payrollStore'
import { useProjectStore } from '@/stores/projectStore'
import type { BudgetCategory, Project } from '@/types/database'

function logError(scope: string, error: unknown) {
  console.error(`Error in ${scope}`, error)
}

function useProjectDetailUiState() {
  const [showCreate, setShowCreate] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  return {
    showCreate,
    showEditProject,
    savingProject,
    deletingId,
    confirmDeleteId,
    duplicatingId,
    setShowCreate,
    setShowEditProject,
    setSavingProject,
    setDeletingId,
    setConfirmDeleteId,
    setDuplicatingId,
  }
}

function useProjectDetailData(projectId: string | undefined) {
  const { projects, fetchProjects } = useProjectStore()
  const { periods, loading, fetchPeriods } = usePayrollStore()
  const [recentTxns, setRecentTxns] = useState<TransactionWithRelations[]>([])
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])

  const loadProjectDetails = useCallback(async (id: string) => {
    try {
      const [txns, categories] = await Promise.all([
        transactionService.getByProject(id),
        budgetCategoryService.getByProject(id),
      ])
      setRecentTxns(txns.slice(0, 5))
      setBudgetCategories(categories)
    } catch (error) {
      logError('loadProjectDetails', error)
    }
  }, [])

  useEffect(() => {
    if (!projectId) return
    if (!projects.length) void fetchProjects()
    void fetchPeriods(projectId)
    const timerId = window.setTimeout(() => {
      void loadProjectDetails(projectId)
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [projectId, projects.length, fetchProjects, fetchPeriods, loadProjectDetails])

  return { projects, periods, loading, recentTxns, budgetCategories, fetchProjects, fetchPeriods }
}

type ActionParams = {
  projectId: string | undefined
  navigate: ReturnType<typeof useNavigate>
  fetchProjects: () => Promise<void>
  fetchPeriods: (projectId: string) => Promise<void>
  setShowCreate: (open: boolean) => void
  setShowEditProject: (open: boolean) => void
  setSavingProject: (saving: boolean) => void
  setDeletingId: (id: string | null) => void
  setConfirmDeleteId: (id: string | null) => void
  setDuplicatingId: (id: string | null) => void
}

function useProjectDetailActions(params: ActionParams) {
  async function handleEditProject(data: Partial<Project>) {
    if (!params.projectId) return
    params.setSavingProject(true)
    try {
      await projectService.update(params.projectId, data)
      params.setShowEditProject(false)
      await params.fetchProjects()
    } catch (error) {
      logError('handleEditProject', error)
      throw error
    } finally {
      params.setSavingProject(false)
    }
  }

  async function handleDeletePeriod(periodId: string) {
    params.setDeletingId(periodId)
    try {
      await payrollService.deletePeriod(periodId)
      if (params.projectId) await params.fetchPeriods(params.projectId)
    } catch (error) {
      logError('handleDeletePeriod', error)
      throw error
    } finally {
      params.setDeletingId(null)
      params.setConfirmDeleteId(null)
    }
  }

  async function handleDuplicatePeriod(periodId: string) {
    if (!params.projectId) return
    params.setDuplicatingId(periodId)
    try {
      const newPeriod = await payrollService.duplicatePeriod(periodId, params.projectId)
      params.navigate(`/nominas/${newPeriod.id}`)
    } catch (error) {
      logError('handleDuplicatePeriod', error)
      throw error
    } finally {
      params.setDuplicatingId(null)
    }
  }

  return { handleEditProject, handleDeletePeriod, handleDuplicatePeriod }
}

type ModelParams = {
  projectId: string | undefined
  navigate: ReturnType<typeof useNavigate>
  ui: ReturnType<typeof useProjectDetailUiState>
  data: ReturnType<typeof useProjectDetailData>
  actions: ReturnType<typeof useProjectDetailActions>
}

function useProjectDetailModel(params: ModelParams) {
  const project = useMemo(
    () => params.data.projects.find((item) => item.id === params.projectId),
    [params.projectId, params.data.projects],
  )
  const draftPeriod = useMemo(
    () => params.data.periods.find((item) => item.status === 'draft' || item.status === 'submitted') ?? null,
    [params.data.periods],
  )
  const totalBudget = useMemo(
    () => params.data.budgetCategories.reduce((sum, item) => sum + item.budgeted_amount, 0),
    [params.data.budgetCategories],
  )
  // Solo cuentan como "Invertido" los reportes comprometidos (aprobados o
  // pagados), igual que el Panel, el flujo de caja y el presupuesto-vs-real.
  // Antes se sumaban también borradores y enviados, inflando la barra y
  // mostrando una cifra distinta a la del Panel para el mismo proyecto.
  const totalInvested = useMemo(
    () =>
      params.data.periods
        .filter((item) => COMMITTED_PAYROLL_STATUSES.includes(item.status))
        .reduce((sum, item) => sum + (item.grand_total || 0), 0),
    [params.data.periods],
  )
  function handleCreatedPeriod(periodId: string) {
    params.ui.setShowCreate(false)
    params.navigate(`/nominas/${periodId}`)
  }
  function openCreateModal() {
    params.ui.setShowCreate(true)
  }
  function closeCreateModal() {
    params.ui.setShowCreate(false)
  }
  function openEditProjectModal() {
    params.ui.setShowEditProject(true)
  }
  function closeEditProjectModal() {
    params.ui.setShowEditProject(false)
  }
  function requestDeletePeriod(periodId: string) {
    params.ui.setConfirmDeleteId(periodId)
  }
  function cancelDeletePeriod() {
    params.ui.setConfirmDeleteId(null)
  }
  return {
    projectId: params.projectId,
    project,
    loading: params.data.loading,
    periods: params.data.periods,
    recentTxns: params.data.recentTxns,
    showCreate: params.ui.showCreate,
    showEditProject: params.ui.showEditProject,
    savingProject: params.ui.savingProject,
    deletingId: params.ui.deletingId,
    confirmDeleteId: params.ui.confirmDeleteId,
    duplicatingId: params.ui.duplicatingId,
    draftPeriod,
    totalBudget,
    totalInvested,
    openCreateModal,
    closeCreateModal,
    openEditProjectModal,
    closeEditProjectModal,
    requestDeletePeriod,
    cancelDeletePeriod,
    handleCreatedPeriod,
    ...params.actions,
  }
}

export function useProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const ui = useProjectDetailUiState()
  const data = useProjectDetailData(projectId)
  const actions = useProjectDetailActions({
    projectId,
    navigate,
    fetchProjects: data.fetchProjects,
    fetchPeriods: data.fetchPeriods,
    setShowCreate: ui.setShowCreate,
    setShowEditProject: ui.setShowEditProject,
    setSavingProject: ui.setSavingProject,
    setDeletingId: ui.setDeletingId,
    setConfirmDeleteId: ui.setConfirmDeleteId,
    setDuplicatingId: ui.setDuplicatingId,
  })
  return useProjectDetailModel({ projectId, navigate, ui, data, actions })
}
