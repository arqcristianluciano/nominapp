import { useState, useCallback } from 'react'
import { budgetItemService } from '@/services/budgetItemService'
import { priceListService } from '@/services/priceListService'
import type { BudgetItem, BudgetCategory, PriceListItem } from '@/types/database'

export interface BudgetPartida {
  category: BudgetCategory
  items: BudgetItem[]
  total: number
}

export function useBudgetItems(projectId: string | undefined) {
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, BudgetItem[]>>({})
  const [priceList, setPriceList] = useState<PriceListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(async (categoryIds: string[]) => {
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
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

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

  const bulkImport = useCallback(async (items: Omit<BudgetItem, 'id'>[]) => {
    const created = await budgetItemService.bulkCreate(items)
    setItemsByCategory((prev) => {
      const next = { ...prev }
      for (const item of created) {
        const cid = item.budget_category_id
        next[cid] = [...(next[cid] ?? []), item]
      }
      return next
    })
    return created
  }, [])

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

  const copyPriceListToProject = useCallback(async (targetProjectId: string) => {
    return priceListService.copyToProject(priceList, targetProjectId)
  }, [priceList])

  const getCategoryTotal = useCallback((categoryId: string): number => {
    return (itemsByCategory[categoryId] ?? []).reduce(
      (sum, it) => sum + it.quantity * it.unit_price,
      0
    )
  }, [itemsByCategory])

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
