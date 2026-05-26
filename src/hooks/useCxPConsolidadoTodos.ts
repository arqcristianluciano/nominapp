import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { transactionService } from '@/services/transactionService'
import { calcCxPDetails, type CxPItem } from '@/utils/financialCalculations'
import { getErrorMessage } from '@/utils/errors'

export interface CxPProjectGroup {
  projectName: string
  projectId: string
  items: CxPItem[]
  total: number
}

export function useCxPConsolidadoTodos() {
  const { projects, fetchProjects } = useProjectStore()
  const [groups, setGroups] = useState<CxPProjectGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectFilter, setProjectFilter] = useState<string>('all')

  const activeProjects = useMemo(
    () => [...projects.filter((project) => project.status === 'active')].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [projects]
  )

  const displayedGroups = useMemo(
    () => (projectFilter === 'all' ? groups : groups.filter((group) => group.projectId === projectFilter)),
    [groups, projectFilter]
  )

  const displayedTotal = useMemo(
    () => displayedGroups.reduce((sum, group) => sum + group.total, 0),
    [displayedGroups]
  )

  const filteredProjectName = useMemo(
    () => (projectFilter === 'all' ? null : activeProjects.find((project) => project.id === projectFilter)?.name ?? null),
    [projectFilter, activeProjects]
  )

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    async function loadAll() {
      if (activeProjects.length === 0) {
        setError(null)
        setLoading(false)
        return
      }

      try {
        const projectIds = activeProjects.map((project) => project.id)
        const allTransactions = await transactionService.getByProjects(projectIds)

        const transactionsByProject = new Map<string, typeof allTransactions>()
        for (const tx of allTransactions) {
          const list = transactionsByProject.get(tx.project_id)
          if (list) list.push(tx)
          else transactionsByProject.set(tx.project_id, [tx])
        }

        const results: CxPProjectGroup[] = []
        for (const project of activeProjects) {
          const transactions = transactionsByProject.get(project.id) ?? []
          const cxpItems = calcCxPDetails(transactions)
          if (cxpItems.length === 0) continue
          results.push({
            projectName: project.name,
            projectId: project.id,
            items: cxpItems,
            total: cxpItems.reduce((sum, item) => sum + item.pending, 0),
          })
        }
        setGroups(results)
        setError(null)
      } catch (err) {
        console.warn('[useCxPConsolidadoTodos] load failed', err)
        setError(getErrorMessage(err))
        setGroups([])
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    loadAll()
  }, [activeProjects])

  return {
    groups,
    loading,
    error,
    projectFilter,
    activeProjects,
    displayedGroups,
    displayedTotal,
    filteredProjectName,
    setProjectFilter,
  }
}
