import { useEffect, useMemo, useState } from 'react'
import { payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { useToast } from '@/components/ui/Toast'
import type { PayrollPeriod, Project } from '@/types/database'

interface GroupedProjectReports {
  project: Project
  periods: PayrollPeriod[]
}

export function useReportesObraState() {
  const { error: toastError } = useToast()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [closingProjectId, setClosingProjectId] = useState<string | null>(null)

  useEffect(() => {
    async function loadPageData() {
      setLoading(true)
      try {
        const [loadedPeriods, loadedProjects] = await Promise.all([
          payrollService.getAllPeriods(),
          projectService.getAll(),
        ])
        setPeriods(loadedPeriods)
        setProjects(loadedProjects)
        if (loadedProjects.length > 0) {
          setSelectedProjectId(loadedProjects[0].id)
        }
      } catch (error) {
        console.error('useReportesObraState loadPageData failed', error)
        toastError('No se pudieron cargar los reportes. Inténtalo de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    void loadPageData()
  }, [toastError])

  const grouped = useMemo<GroupedProjectReports[]>(
    () =>
      projects
        .map((project) => ({
          project,
          periods: periods.filter((period) => period.project_id === project.id),
        }))
        .filter((group) => group.periods.length > 0),
    [periods, projects],
  )

  const emptyProjects = useMemo(
    () => projects.filter((project) => !periods.some((period) => period.project_id === project.id)),
    [periods, projects],
  )

  function toggleExpand(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  function openCreate(projectId?: string) {
    if (projectId) {
      setSelectedProjectId(projectId)
    }
    setShowCreate(true)
  }

  function closeCreate() {
    setShowCreate(false)
  }

  async function handleMarkAllPaid(projectId: string) {
    setClosingProjectId(projectId)
    try {
      // A10: solo se marcan como pagados los reportes YA aprobados; los borradores
      // y enviados requieren pasar por el flujo de aprobación primero.
      const approved = periods.filter((period) => period.project_id === projectId && period.status === 'approved')
      await Promise.all(approved.map((period) => payrollService.updatePeriodStatus(period.id, 'paid')))
      setPeriods((prev) =>
        prev.map((period) =>
          period.project_id === projectId && period.status === 'approved' ? { ...period, status: 'paid' } : period,
        ),
      )
    } finally {
      setClosingProjectId(null)
    }
  }

  async function handleDelete(periodId: string) {
    setDeletingId(periodId)
    try {
      await payrollService.deletePeriod(periodId)
      setPeriods((prev) => prev.filter((period) => period.id !== periodId))
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return {
    periods,
    projects,
    grouped,
    emptyProjects,
    loading,
    showCreate,
    selectedProjectId,
    expandedProjects,
    confirmDeleteId,
    deletingId,
    closingProjectId,
    toggleExpand,
    openCreate,
    closeCreate,
    setSelectedProjectId,
    setConfirmDeleteId,
    handleMarkAllPaid,
    handleDelete,
  }
}
