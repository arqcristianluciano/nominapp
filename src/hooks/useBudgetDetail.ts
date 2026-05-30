import { useState, useCallback, useMemo } from 'react'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetSpentService } from '@/services/budgetSpentService'
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
  const [imputedByCategory, setImputedByCategory] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (filters?: {
      dateFrom?: string
      dateTo?: string
    }): Promise<{ categories: BudgetCategory[]; transactions: TransactionWithRelations[] }> => {
      if (!projectId) return { categories: [], transactions: [] }
      setLoading(true)
      setError(null)
      try {
        const [cats, txns, imputed] = await Promise.all([
          budgetCategoryService.initializeForProject(projectId),
          transactionService.getByProject(projectId, filters),
          budgetSpentService.getImputedCostByCategory(projectId, filters),
        ])
        setCategories(cats)
        setTransactions(txns)
        setImputedByCategory(imputed)
        return { categories: cats, transactions: txns }
      } catch (e) {
        setError(getErrorMessage(e))
        return { categories: [], transactions: [] }
      } finally {
        setLoading(false)
      }
    },
    [projectId],
  )

  const removeCategories = useCallback(async (categoryIds: string[]) => {
    if (categoryIds.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await budgetCategoryService.deleteMany(categoryIds)
      const removed = new Set(categoryIds)
      setCategories((prev) => prev.filter((c) => !removed.has(c.id)))
    } catch (e) {
      setError(getErrorMessage(e))
      throw e
    } finally {
      setSaving(false)
    }
  }, [])

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

  const rows = useMemo<BudgetRow[]>(() => {
    return categories.map((category) => {
      // GASTADO = movimientos de la tabla `transactions` + costo imputado
      // a este capítulo desde los reportes comprometidos (mano de obra y
      // facturas de materiales). Sin el segundo término, los gastos imputados
      // en los reportes no se reflejaban y la columna mostraba 0.
      const spent = round2(calcBudgetSpent(transactions, category.id) + (imputedByCategory[category.id] ?? 0))
      return {
        category,
        spent,
        budgeted: category.budgeted_amount,
        difference: round2(category.budgeted_amount - spent),
      }
    })
  }, [categories, transactions, imputedByCategory])

  const totals = useMemo(() => {
    const acc = rows.reduce(
      (sum, row) => ({
        spent: sum.spent + row.spent,
        budgeted: sum.budgeted + row.budgeted,
        difference: sum.difference + row.difference,
      }),
      { spent: 0, budgeted: 0, difference: 0 },
    )
    return {
      spent: round2(acc.spent),
      budgeted: round2(acc.budgeted),
      difference: round2(acc.difference),
    }
  }, [rows])

  return {
    rows,
    totals,
    loading,
    saving,
    error,
    load,
    updateBudget,
    removeCategories,
  }
}
