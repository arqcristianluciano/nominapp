import { useState, useCallback, useMemo } from 'react'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetSpentService } from '@/services/budgetSpentService'
import { calcBudgetSpent } from '@/utils/financialCalculations'
import { transactionCost } from '@/utils/costoReal'
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
  const [imputedByItem, setImputedByItem] = useState<Record<string, number>>({})
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
          budgetSpentService.getImputedCost(projectId, filters),
        ])
        setCategories(cats)
        setTransactions(txns)
        setImputedByCategory(imputed.byCategory)
        setImputedByItem(imputed.byItem)
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

  const removeCategories = useCallback(async (categoryIds: string[]): Promise<BudgetCategory[]> => {
    if (categoryIds.length === 0) return []
    setSaving(true)
    setError(null)
    try {
      const removedRows = await budgetCategoryService.deleteMany(categoryIds)
      const removed = new Set(categoryIds)
      setCategories((prev) => prev.filter((c) => !removed.has(c.id)))
      return removedRows
    } catch (e) {
      setError(getErrorMessage(e))
      throw e
    } finally {
      setSaving(false)
    }
  }, [])

  const restoreCategories = useCallback(
    async (rows: BudgetCategory[]) => {
      if (!projectId || rows.length === 0) return
      setSaving(true)
      setError(null)
      try {
        const recreated = await budgetCategoryService.restore(projectId, rows)
        setCategories((prev) => [...prev, ...recreated].sort((a, b) => a.sort_order - b.sort_order))
      } catch (e) {
        setError(getErrorMessage(e))
        throw e
      } finally {
        setSaving(false)
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

  const rows = useMemo<BudgetRow[]>(() => {
    return categories.map((category) => {
      // GASTADO = movimientos de la tabla `transactions` + costo imputado a este
      // capítulo desde reportes comprometidos y almacén (mano de obra, facturas
      // de materiales y salidas de inventario). Sin el segundo término, los
      // gastos imputados en los reportes no se reflejaban y la columna mostraba 0.
      //
      // ⚠️ DOBLE CONTEO: `transactions` (control financiero) y los ítems
      // imputados son fuentes INDEPENDIENTES; no se deduplican. Si un mismo gasto
      // se captura por ambas vías para el mismo capítulo, se sumará dos veces.
      // Ver `@/utils/costoReal` (fuente única de las reglas de costo real).
      const spent = round2(calcBudgetSpent(transactions, category.id) + (imputedByCategory[category.id] ?? 0))
      return {
        category,
        spent,
        budgeted: category.budgeted_amount,
        difference: round2(category.budgeted_amount - spent),
      }
    })
  }, [categories, transactions, imputedByCategory])

  // GASTADO por subpartida: costo imputado directamente a cada budget_item
  // (mano de obra, facturas y salidas de consumo de almacén) más las
  // transacciones del control financiero imputadas a esa subpartida. Es el
  // desglose de la columna GASTADO del capítulo; lo imputado solo a nivel de
  // capítulo no aparece aquí.
  const spentByItem = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = { ...imputedByItem }
    for (const tx of transactions) {
      if (!tx.budget_item_id) continue
      map[tx.budget_item_id] = (map[tx.budget_item_id] ?? 0) + transactionCost(tx)
    }
    for (const id of Object.keys(map)) {
      map[id] = round2(map[id])
    }
    return map
  }, [transactions, imputedByItem])

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
    spentByItem,
    totals,
    loading,
    saving,
    error,
    load,
    updateBudget,
    removeCategories,
    restoreCategories,
  }
}
