import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useBudgetDetail } from '@/hooks/useBudgetDetail'
import { useBudgetItems } from '@/hooks/useBudgetItems'
import type { BudgetItem, PriceListItem } from '@/types/database'

export type BudgetTab = 'presupuesto' | 'precios'

function useBudgetDetailPageState() {
  const [tab, setTab] = useState<BudgetTab>('presupuesto')
  const [showImport, setShowImport] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  return {
    tab,
    setTab,
    showImport,
    setShowImport,
    showCopyModal,
    setShowCopyModal,
    editingId,
    setEditingId,
    editValue,
    setEditValue,
  }
}

type EffectsArgs = {
  projectsLength: number
  fetchProjects: () => Promise<unknown>
  loadBudget: () => Promise<void>
  categoryIds: string[]
  loadItems: (ids: string[]) => Promise<void>
}

function useBudgetDetailPageEffects(args: EffectsArgs) {
  const { projectsLength, fetchProjects, loadBudget, categoryIds, loadItems } = args

  useEffect(() => {
    if (!projectsLength) void fetchProjects()
  }, [projectsLength, fetchProjects])

  useEffect(() => {
    void loadBudget()
  }, [loadBudget])

  useEffect(() => {
    if (!categoryIds.length) return
    void loadItems(categoryIds)
  }, [categoryIds, loadItems])
}

type EditHandlersArgs = {
  budget: ReturnType<typeof useBudgetDetail>
  editValue: string
  editingId: string | null
  setEditValue: (value: string) => void
  setEditingId: (value: string | null) => void
}

function useBudgetEditHandlers(args: EditHandlersArgs) {
  const { budget, editValue, editingId, setEditValue, setEditingId } = args

  const startEdit = useCallback((id: string, amount: number) => {
    setEditingId(id)
    setEditValue(amount.toString())
  }, [setEditValue, setEditingId])

  const saveEdit = useCallback(async () => {
    if (!editingId) return
    try {
      await budget.updateBudget(editingId, Number(editValue) || 0)
    } finally {
      // Cierra el modal aunque haya error: el error queda visible en el banner global del presupuesto.
      setEditingId(null)
    }
  }, [budget, editValue, editingId, setEditingId])

  return { startEdit, saveEdit }
}

function useBudgetItemHandlers(budgetItems: ReturnType<typeof useBudgetItems>) {
  const handleAddItem = useCallback(async (data: Omit<BudgetItem, 'id'>) => {
    await budgetItems.addItem(data)
  }, [budgetItems])

  const handleUpdateItem = useCallback(
    async (
      id: string,
      categoryId: string,
      changes: Partial<Omit<BudgetItem, 'id'>>
    ) => {
      await budgetItems.updateItem(id, categoryId, changes)
    },
    [budgetItems]
  )

  const handleDeleteItem = useCallback(async (id: string, categoryId: string) => {
    await budgetItems.deleteItem(id, categoryId)
  }, [budgetItems])

  return { handleAddItem, handleUpdateItem, handleDeleteItem }
}

function usePriceHandlers(budgetItems: ReturnType<typeof useBudgetItems>) {
  const handleAddPrice = useCallback(async (item: Omit<PriceListItem, 'id'>) => {
    await budgetItems.addPriceListItem(item)
  }, [budgetItems])

  const handleUpdatePrice = useCallback(
    async (id: string, changes: Partial<Omit<PriceListItem, 'id'>>) => {
      await budgetItems.updatePriceListItem(id, changes)
    },
    [budgetItems]
  )

  const handleDeletePrice = useCallback(async (id: string) => {
    await budgetItems.deletePriceListItem(id)
  }, [budgetItems])

  return { handleAddPrice, handleUpdatePrice, handleDeletePrice }
}

function calculateGrandBudgeted(args: {
  budget: ReturnType<typeof useBudgetDetail>
  budgetItems: ReturnType<typeof useBudgetItems>
}) {
  return args.budget.rows.reduce((sum, row) => {
    const hasItems = (args.budgetItems.itemsByCategory[row.category.id] ?? []).length > 0
    const value = hasItems ? args.budgetItems.getCategoryTotal(row.category.id) : row.budgeted
    return sum + value
  }, 0)
}

function useBudgetDetailPageContext(projectId: string | undefined) {
  const { projects, fetchProjects } = useProjectStore()
  const budget = useBudgetDetail(projectId)
  const budgetItems = useBudgetItems(projectId)
  const project = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId])
  const categoryIds = useMemo(() => budget.rows.map((row) => row.category.id), [budget.rows])
  const grandBudgeted = useMemo(
    () => calculateGrandBudgeted({ budget, budgetItems }),
    [budget, budgetItems]
  )

  return {
    projects,
    fetchProjects,
    project,
    budget,
    budgetItems,
    categoryIds,
    grandBudgeted,
  }
}

export function useBudgetDetailPage(projectId: string | undefined) {
  const state = useBudgetDetailPageState()
  const context = useBudgetDetailPageContext(projectId)
  useBudgetDetailPageEffects({
    projectsLength: context.projects.length,
    fetchProjects: context.fetchProjects,
    loadBudget: context.budget.load,
    categoryIds: context.categoryIds,
    loadItems: context.budgetItems.loadItems,
  })

  const editHandlers = useBudgetEditHandlers({
    budget: context.budget,
    editValue: state.editValue,
    editingId: state.editingId,
    setEditValue: state.setEditValue,
    setEditingId: state.setEditingId,
  })
  const itemHandlers = useBudgetItemHandlers(context.budgetItems)
  const priceHandlers = usePriceHandlers(context.budgetItems)

  return {
    projects: context.projects,
    project: context.project,
    budget: context.budget,
    budgetItems: context.budgetItems,
    ...state,
    ...editHandlers,
    ...itemHandlers,
    ...priceHandlers,
    grandBudgeted: context.grandBudgeted,
  }
}
