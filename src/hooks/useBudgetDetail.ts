import { useState, useCallback, useMemo } from 'react'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { calcBudgetSpent } from '@/utils/financialCalculations'
import type { BudgetCategory } from '@/types/database'

export interface BudgetRow {
  category: BudgetCategory
  spent: number
  budgeted: number
  difference: number
}

export function useBudgetDetail(projectId: string | undefined) {
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (filters?: { dateFrom?: string; dateTo?: string }) => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const [cats, txns] = await Promise.all([
        budgetCategoryService.initializeForProject(projectId),
        transactionService.getByProject(projectId, filters),
      ])
      setCategories(cats)
      setTransactions(txns)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const updateBudget = useCallback(async (categoryId: string, amount: number) => {
    setSaving(true)
    try {
      const updated = await budgetCategoryService.updateBudgetAmount(categoryId, amount)
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [])

  const rows = useMemo<BudgetRow[]>(() => {
    return categories.map((category) => {
      const spent = calcBudgetSpent(transactions, category.id)
      return {
        category,
        spent,
        budgeted: category.budgeted_amount,
        difference: category.budgeted_amount - spent,
      }
    })
  }, [categories, transactions])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        spent: acc.spent + row.spent,
        budgeted: acc.budgeted + row.budgeted,
        difference: acc.difference + row.difference,
      }),
      { spent: 0, budgeted: 0, difference: 0 }
    )
  }, [rows])

  return {
    rows,
    totals,
    loading,
    saving,
    error,
    load,
    updateBudget,
  }
}
