import { useCallback, useEffect, useState } from 'react'
import { contractorService } from '@/services/contractorService'
import { mercadoBudgetLineService, mercadoBudgetService } from '@/services/mercadoBudgetService'
import { useProjectStore } from '@/stores/projectStore'
import type { Contractor } from '@/types/database'
import type { MercadoBudget, MercadoBudgetLine, MercadoCategory } from '@/types/mercadoBudget'

type CategoryFilter = MercadoCategory | 'ALL'

async function fetchBudgetData(projectId: string) {
  const budget = await mercadoBudgetService.getByProject(projectId)
  if (!budget) return { budget: null, lines: [] as MercadoBudgetLine[] }
  const lines = await mercadoBudgetLineService.getByBudget(budget.id)
  return { budget, lines }
}

function useInsumosBootstrap(
  projectsLength: number,
  fetchProjects: () => void,
  setContractors: (value: Contractor[]) => void
) {
  useEffect(() => {
    if (!projectsLength) fetchProjects()
    contractorService.getAll().then(setContractors).catch((err) => console.error('InsumosPage contractors load failed', err))
  }, [projectsLength, fetchProjects, setContractors])
}

function useInsumosBudgetData(projectId: string | undefined) {
  const [budget, setBudget] = useState<MercadoBudget | null>(null)
  const [lines, setLines] = useState<MercadoBudgetLine[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await fetchBudgetData(projectId)
      setBudget(data.budget)
      setLines(data.lines)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { budget, lines, loading, reload }
}

export function useInsumosPageController(projectId: string | undefined) {
  const { projects, fetchProjects } = useProjectStore()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [selectedLine, setSelectedLine] = useState<MercadoBudgetLine | null>(null)
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL')
  const { budget, lines, loading, reload } = useInsumosBudgetData(projectId)

  useInsumosBootstrap(projects.length, fetchProjects, setContractors)

  const handleImported = useCallback(() => {
    setShowUpload(false)
    setActiveCategory('ALL')
    void reload()
  }, [reload])

  const handleContractCreated = useCallback(() => {
    setSelectedLine(null)
    void reload()
  }, [reload])

  return {
    projects,
    budget,
    lines,
    contractors,
    loading,
    showUpload,
    selectedLine,
    activeCategory,
    setShowUpload,
    setSelectedLine,
    setActiveCategory,
    handleImported,
    handleContractCreated,
  }
}
