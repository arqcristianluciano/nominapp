import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { transactionService } from '@/services/transactionService'
import { calcCxPDetails, type CxPItem } from '@/utils/financialCalculations'

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
        setLoading(false)
        return
      }

      try {
        const results: CxPProjectGroup[] = []
        for (const project of activeProjects) {
          const transactions = await transactionService.getByProject(project.id)
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
      } catch {
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
    projectFilter,
    activeProjects,
    displayedGroups,
    displayedTotal,
    filteredProjectName,
    setProjectFilter,
  }
}
