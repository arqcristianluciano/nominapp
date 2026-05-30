import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useBudgetDetail } from '@/hooks/useBudgetDetail'
import { useBudgetItems, type BulkImportPayload } from '@/hooks/useBudgetItems'
import { findEmptyCategories } from '@/components/features/budget/emptyCategories'
import { calcBudgetSpent } from '@/utils/financialCalculations'
import type { TransactionWithRelations } from '@/services/transactionService'
import type { BudgetCategory, BudgetItem, PriceListItem } from '@/types/database'

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
  loadBudget: () => Promise<unknown>
  categoryIds: string[]
  loadItems: (ids: string[]) => Promise<unknown>
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

  const startEdit = useCallback(
    (id: string, amount: number) => {
      setEditingId(id)
      setEditValue(amount.toString())
    },
    [setEditValue, setEditingId],
  )

  const saveEdit = useCallback(async () => {
    if (!editingId) return
    await budget.updateBudget(editingId, Number(editValue) || 0)
    setEditingId(null)
  }, [budget, editValue, editingId, setEditingId])

  return { startEdit, saveEdit }
}

function useBudgetItemHandlers(budgetItems: ReturnType<typeof useBudgetItems>) {
  const handleAddItem = useCallback(
    async (data: Omit<BudgetItem, 'id'>) => {
      await budgetItems.addItem(data)
    },
    [budgetItems],
  )

  const handleUpdateItem = useCallback(
    async (id: string, categoryId: string, changes: Partial<Omit<BudgetItem, 'id'>>) => {
      await budgetItems.updateItem(id, categoryId, changes)
    },
    [budgetItems],
  )

  const handleDeleteItem = useCallback(
    async (id: string, categoryId: string) => {
      await budgetItems.deleteItem(id, categoryId)
    },
    [budgetItems],
  )

  return { handleAddItem, handleUpdateItem, handleDeleteItem }
}

function usePriceHandlers(budgetItems: ReturnType<typeof useBudgetItems>) {
  const handleAddPrice = useCallback(
    async (item: Omit<PriceListItem, 'id'>) => {
      await budgetItems.addPriceListItem(item)
    },
    [budgetItems],
  )

  const handleUpdatePrice = useCallback(
    async (id: string, changes: Partial<Omit<PriceListItem, 'id'>>) => {
      await budgetItems.updatePriceListItem(id, changes)
    },
    [budgetItems],
  )

  const handleDeletePrice = useCallback(
    async (id: string) => {
      await budgetItems.deletePriceListItem(id)
    },
    [budgetItems],
  )

  return { handleAddPrice, handleUpdatePrice, handleDeletePrice }
}

/**
 * Limpieza de partidas vacías. Tras importar un presupuesto, las partidas
 * predeterminadas que no coincidieron con el Excel quedan sin subpartidas, sin
 * monto y sin gasto. Las detectamos y las dejamos listas para que el usuario
 * confirme su eliminación (no se borra nada sin preguntar). También expone un
 * borrado puntual para eliminar una partida vacía desde la tabla.
 */
function useEmptyCategoryCleanup(
  budget: ReturnType<typeof useBudgetDetail>,
  budgetItems: ReturnType<typeof useBudgetItems>,
) {
  const [emptyCategories, setEmptyCategories] = useState<BudgetCategory[]>([])
  const [removingEmpty, setRemovingEmpty] = useState(false)

  const detectAfterImport = useCallback(
    (
      categories: BudgetCategory[],
      itemsByCategory: Record<string, BudgetItem[]>,
      transactions: TransactionWithRelations[],
    ) => {
      const empties = findEmptyCategories(categories, itemsByCategory, (id) => calcBudgetSpent(transactions, id))
      setEmptyCategories(empties)
      return empties
    },
    [],
  )

  const removeCategories = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return
      setRemovingEmpty(true)
      try {
        await budget.removeCategories(ids)
        budgetItems.dropCategories(ids)
      } catch {
        // budget.removeCategories ya registró el error en budget.error;
        // no propagamos para no dejar promesas sin manejar en la UI.
      } finally {
        setRemovingEmpty(false)
      }
    },
    [budget, budgetItems],
  )

  const confirmRemoveEmpty = useCallback(async () => {
    const ids = emptyCategories.map((c) => c.id)
    try {
      await removeCategories(ids)
    } finally {
      setEmptyCategories([])
    }
  }, [emptyCategories, removeCategories])

  const cancelRemoveEmpty = useCallback(() => setEmptyCategories([]), [])

  const removeCategory = useCallback(
    async (categoryId: string) => {
      await removeCategories([categoryId])
    },
    [removeCategories],
  )

  return {
    emptyCategories,
    removingEmpty,
    detectAfterImport,
    confirmRemoveEmpty,
    cancelRemoveEmpty,
    removeCategory,
  }
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
  const grandBudgeted = useMemo(() => calculateGrandBudgeted({ budget, budgetItems }), [budget, budgetItems])

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
  const cleanup = useEmptyCategoryCleanup(context.budget, context.budgetItems)

  const { detectAfterImport } = cleanup
  const handleImport = useCallback(
    async (payload: BulkImportPayload) => {
      // Pasamos las partidas actuales para que las subpartidas importadas sin
      // código reciban su código consecutivo (p. ej. 1.5) de la partida correcta.
      await context.budgetItems.bulkImport(
        payload,
        context.budget.rows.map((r) => r.category),
      )
      // Recargamos con datos frescos para evaluar qué partidas quedaron vacías
      // sin depender del estado asíncrono de React.
      const { categories, transactions } = await context.budget.load()
      const itemsMap = await context.budgetItems.loadItems(categories.map((c) => c.id))
      detectAfterImport(categories, itemsMap, transactions)
    },
    [context.budgetItems, context.budget, detectAfterImport],
  )

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
    handleImport,
    emptyCategories: cleanup.emptyCategories,
    removingEmpty: cleanup.removingEmpty,
    confirmRemoveEmpty: cleanup.confirmRemoveEmpty,
    cancelRemoveEmpty: cleanup.cancelRemoveEmpty,
    handleDeleteCategory: cleanup.removeCategory,
  }
}
