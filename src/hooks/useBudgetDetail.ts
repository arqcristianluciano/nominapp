import { useState, useCallback, useMemo } from 'react'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { partidaProgressService } from '@/services/partidaProgressService'
import { calcBudgetSpent } from '@/utils/financialCalculations'
import { round2 } from '@/utils/money'
import { getErrorMessage } from '@/utils/errors'
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
  const [committedByCategory, setCommittedByCategory] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (filters?: { dateFrom?: string; dateTo?: string }) => {
      if (!projectId) return
      setLoading(true)
      setError(null)
      try {
        const [cats, txns, committed] = await Promise.all([
          budgetCategoryService.initializeForProject(projectId),
          transactionService.getByProject(projectId, filters),
          partidaProgressService.getCommittedSpendByCategory(projectId),
        ])
        setCategories(cats)
        setTransactions(txns)
        setCommittedByCategory(committed)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setLoading(false)
      }
    },
    [projectId],
  )

  const updateBudget = useCallback(async (categoryId: string, amount: number) => {
    setSaving(true)
    try {
      const updated = await budgetCategoryService.updateBudgetAmount(categoryId, amount)
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)))
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [])

  const deleteCategory = useCallback(async (categoryId: string) => {
    setSaving(true)
    try {
      await budgetCategoryService.delete(categoryId)
      setCategories((prev) => prev.filter((c) => c.id !== categoryId))
    } catch (e) {
      setError(getErrorMessage(e))
      throw e
    } finally {
      setSaving(false)
    }
  }, [])

  const rows = useMemo<BudgetRow[]>(() => {
    return categories.map((category) => {
      const spent = round2(calcBudgetSpent(transactions, category.id) + (committedByCategory[category.id] ?? 0))
      return {
        category,
        spent,
        budgeted: category.budgeted_amount,
        difference: category.budgeted_amount - spent,
      }
    })
  }, [categories, transactions, committedByCategory])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        spent: acc.spent + row.spent,
        budgeted: acc.budgeted + row.budgeted,
        difference: acc.difference + row.difference,
      }),
      { spent: 0, budgeted: 0, difference: 0 },
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
    deleteCategory,
  }
}
