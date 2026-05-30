import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useBudgetDetail } from '@/hooks/useBudgetDetail'
import { useBudgetItems, type BulkImportPayload } from '@/hooks/useBudgetItems'
import { findEmptyCategories } from '@/components/features/budget/emptyCategories'
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
 * Limpieza de partidas vacías (sin subpartidas, sin monto y sin gasto).
 *
 * - Calcula en vivo qué partidas están vacías a partir del estado ya cargado.
 * - Avisa automáticamente, una sola vez por proyecto, al abrir la página o tras
 *   importar, mostrando un modal donde el usuario elige cuáles eliminar.
 * - Nunca borra sin confirmación; también permite el borrado puntual desde la tabla.
 */
function useEmptyCategoryCleanup(
  projectId: string | undefined,
  budget: ReturnType<typeof useBudgetDetail>,
  budgetItems: ReturnType<typeof useBudgetItems>,
) {
  const [showEmptyModal, setShowEmptyModal] = useState(false)
  const [removingEmpty, setRemovingEmpty] = useState(false)
  const autoPrompted = useRef(false)

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of budget.rows) map.set(row.category.id, row.spent)
    return map
  }, [budget.rows])

  const emptyCategories = useMemo(
    () =>
      findEmptyCategories(
        budget.rows.map((row) => row.category),
        budgetItems.itemsByCategory,
        (id) => spentByCategory.get(id) ?? 0,
      ),
    [budget.rows, budgetItems.itemsByCategory, spentByCategory],
  )

  // Guarda: sin esto, antes de que carguen los items todas las partidas
  // parecerían vacías (itemsByCategory aún no tiene sus claves).
  const itemsLoaded =
    budget.rows.length > 0 && budget.rows.every((row) => row.category.id in budgetItems.itemsByCategory)

  // Reinicia el aviso automático al cambiar de proyecto.
  useEffect(() => {
    autoPrompted.current = false
    setShowEmptyModal(false)
  }, [projectId])

  // Aviso automático (una sola vez por proyecto) cuando hay partidas vacías.
  useEffect(() => {
    if (autoPrompted.current) return
    if (budget.loading || budgetItems.loading) return
    if (!itemsLoaded) return
    autoPrompted.current = true
    if (emptyCategories.length > 0) setShowEmptyModal(true)
  }, [budget.loading, budgetItems.loading, itemsLoaded, emptyCategories])

  const openEmptyModal = useCallback(() => setShowEmptyModal(true), [])
  const closeEmptyModal = useCallback(() => setShowEmptyModal(false), [])

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

  const confirmRemoveEmpty = useCallback(
    async (ids: string[]) => {
      await removeCategories(ids)
      setShowEmptyModal(false)
    },
    [removeCategories],
  )

  const removeCategory = useCallback(
    async (categoryId: string) => {
      await removeCategories([categoryId])
    },
    [removeCategories],
  )

  // Tras importar abrimos el modal; el render lo deja oculto si no hay vacías.
  const promptAfterImport = useCallback(() => setShowEmptyModal(true), [])

  return {
    emptyCategories,
    showEmptyModal,
    removingEmpty,
    openEmptyModal,
    closeEmptyModal,
    confirmRemoveEmpty,
    removeCategory,
    promptAfterImport,
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
  const cleanup = useEmptyCategoryCleanup(projectId, context.budget, context.budgetItems)

  const { promptAfterImport } = cleanup
  const handleImport = useCallback(
    async (payload: BulkImportPayload) => {
      // Pasamos las partidas actuales para que las subpartidas importadas sin
      // código reciban su código consecutivo (p. ej. 1.5) de la partida correcta.
      await context.budgetItems.bulkImport(
        payload,
        context.budget.rows.map((r) => r.category),
      )
      // Recargamos con datos frescos antes de evaluar qué partidas quedaron vacías.
      const { categories } = await context.budget.load()
      await context.budgetItems.loadItems(categories.map((c) => c.id))
      promptAfterImport()
    },
    [context.budgetItems, context.budget, promptAfterImport],
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
    showEmptyModal: cleanup.showEmptyModal,
    removingEmpty: cleanup.removingEmpty,
    openEmptyModal: cleanup.openEmptyModal,
    confirmRemoveEmpty: cleanup.confirmRemoveEmpty,
    cancelRemoveEmpty: cleanup.closeEmptyModal,
    handleDeleteCategory: cleanup.removeCategory,
  }
}
