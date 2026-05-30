import { useState, useCallback } from 'react'
import { budgetItemService } from '@/services/budgetItemService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { priceListService } from '@/services/priceListService'
import { getErrorMessage } from '@/utils/errors'
import { assignImportCodes } from '@/utils/budgetItemCode'
import type { BudgetItem, BudgetCategory, PriceListItem } from '@/types/database'

export interface BudgetPartida {
  category: BudgetCategory
  items: BudgetItem[]
  total: number
}

export interface BulkImportPayload {
  newCategories: { key: string; code: string; name: string; sort_order: number }[]
  items: (Omit<BudgetItem, 'id' | 'budget_category_id'> & {
    budget_category_id: string | null
    new_category_key: string | null
  })[]
}

export function useBudgetItems(projectId: string | undefined) {
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, BudgetItem[]>>({})
  const [priceList, setPriceList] = useState<PriceListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(
    async (categoryIds: string[]) => {
      if (!projectId || categoryIds.length === 0) return
      setLoading(true)
      setError(null)
      try {
        const [items, prices] = await Promise.all([
          budgetItemService.getByProjectCategories(categoryIds),
          priceListService.getByProject(projectId),
        ])
        const grouped = categoryIds.reduce<Record<string, BudgetItem[]>>((acc, id) => {
          acc[id] = items.filter((it) => it.budget_category_id === id)
          return acc
        }, {})
        setItemsByCategory(grouped)
        setPriceList(prices)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setLoading(false)
      }
    },
    [projectId],
  )

  const addItem = useCallback(async (item: Omit<BudgetItem, 'id'>) => {
    const created = await budgetItemService.create(item)
    setItemsByCategory((prev) => ({
      ...prev,
      [item.budget_category_id]: [...(prev[item.budget_category_id] ?? []), created],
    }))
    return created
  }, [])

  const updateItem = useCallback(async (id: string, categoryId: string, changes: Partial<Omit<BudgetItem, 'id'>>) => {
    const updated = await budgetItemService.update(id, changes)
    setItemsByCategory((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId]?.map((it) => (it.id === id ? updated : it)) ?? [],
    }))
    return updated
  }, [])

  const deleteItem = useCallback(async (id: string, categoryId: string) => {
    await budgetItemService.delete(id)
    setItemsByCategory((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId]?.filter((it) => it.id !== id) ?? [],
    }))
  }, [])

  const bulkImport = useCallback(
    async (payload: BulkImportPayload, existingCategories: BudgetCategory[] = []) => {
      if (!projectId) throw new Error('Proyecto no seleccionado')

      const createdCategories = payload.newCategories.length
        ? await budgetCategoryService.bulkCreate(
            projectId,
            payload.newCategories.map((c) => ({ code: c.code, name: c.name, sort_order: c.sort_order })),
          )
        : []

      const createdBySortOrder = new Map<number, BudgetCategory>()
      for (const cat of createdCategories) createdBySortOrder.set(cat.sort_order, cat)
      const categoryByKey = new Map<string, BudgetCategory>()
      for (const draft of payload.newCategories) {
        const created = createdBySortOrder.get(draft.sort_order)
        if (created) categoryByKey.set(draft.key, created)
      }

      // Mapa categoría → datos para derivar el prefijo del código (partidas
      // existentes + recién creadas en este import).
      const categoryById = new Map<string, BudgetCategory>()
      for (const cat of existingCategories) categoryById.set(cat.id, cat)
      for (const cat of createdCategories) categoryById.set(cat.id, cat)

      const itemsToInsert: Omit<BudgetItem, 'id'>[] = []
      for (const item of payload.items) {
        let categoryId = item.budget_category_id
        if (!categoryId && item.new_category_key) {
          categoryId = categoryByKey.get(item.new_category_key)?.id ?? null
        }
        if (!categoryId) continue
        const { new_category_key: _unused, ...rest } = item
        void _unused
        itemsToInsert.push({ ...rest, budget_category_id: categoryId })
      }

      // Numerar consecutivamente las subpartidas que no traen código, continuando
      // desde el mayor código existente de cada partida.
      const coded = assignImportCodes(itemsToInsert, categoryById, itemsByCategory)

      const created = await budgetItemService.bulkCreate(coded)
      setItemsByCategory((prev) => {
        const next = { ...prev }
        for (const cat of createdCategories) {
          if (!next[cat.id]) next[cat.id] = []
        }
        for (const item of created) {
          const cid = item.budget_category_id
          next[cid] = [...(next[cid] ?? []), item]
        }
        return next
      })
      return { createdCategories, createdItems: created }
    },
    [projectId, itemsByCategory],
  )

  const addPriceListItem = useCallback(async (item: Omit<PriceListItem, 'id'>) => {
    const created = await priceListService.create(item)
    setPriceList((prev) => [...prev, created])
    return created
  }, [])

  const updatePriceListItem = useCallback(async (id: string, changes: Partial<Omit<PriceListItem, 'id'>>) => {
    const updated = await priceListService.update(id, changes)
    setPriceList((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }, [])

  const deletePriceListItem = useCallback(async (id: string) => {
    await priceListService.delete(id)
    setPriceList((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const copyPriceListToProject = useCallback(
    async (targetProjectId: string) => {
      return priceListService.copyToProject(priceList, targetProjectId)
    },
    [priceList],
  )

  const getCategoryTotal = useCallback(
    (categoryId: string): number => {
      return (itemsByCategory[categoryId] ?? []).reduce((sum, it) => sum + it.quantity * it.unit_price, 0)
    },
    [itemsByCategory],
  )

  return {
    itemsByCategory,
    priceList,
    loading,
    error,
    loadItems,
    addItem,
    updateItem,
    deleteItem,
    bulkImport,
    addPriceListItem,
    updatePriceListItem,
    deletePriceListItem,
    copyPriceListToProject,
    getCategoryTotal,
  }
}
