import { useState, useCallback, useMemo } from 'react'
import { transactionService, type TransactionWithRelations } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { supplierService } from '@/services/supplierService'
import {
  calcTransitos,
  calcCashDisponible,
  calcTotalCxP,
  calcDisponibleNeto,
  calcTotalIncurrido,
} from '@/utils/financialCalculations'
import type { BudgetCategory, Supplier, Transaction } from '@/types/database'

export function useTransactions(projectId: string | undefined) {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const load = useCallback(async (filters?: { dateFrom?: string; dateTo?: string }) => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const [txns, categories, supps] = await Promise.all([
        transactionService.getByProject(projectId, {
          dateFrom: filters?.dateFrom || undefined,
          dateTo: filters?.dateTo || undefined,
        }),
        budgetCategoryService.initializeForProject(projectId),
        supplierService.getAll(),
      ])
      setTransactions(txns)
      setBudgetCategories(categories)
      setSuppliers(supps)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'created_at'>) => {
    setSaving(true)
    setError(null)
    try {
      const newTxn = await transactionService.create(data)
      setTransactions((prev) => [newTxn, ...prev])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [])

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await transactionService.update(id, updates)
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      await transactionService.delete(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [])

  const applyDateFilter = useCallback((from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
    load({ dateFrom: from, dateTo: to })
  }, [load])

  const clearDateFilter = useCallback(() => {
    setDateFrom('')
    setDateTo('')
    load()
  }, [load])

  const transitos = useMemo(() => calcTransitos(transactions), [transactions])
  const cashDisponible = useMemo(() => calcCashDisponible(transactions), [transactions])
  const totalCxP = useMemo(() => calcTotalCxP(transactions), [transactions])
  const disponibleNeto = useMemo(() => calcDisponibleNeto(cashDisponible, totalCxP, transitos), [cashDisponible, totalCxP, transitos])
  const totalIncurrido = useMemo(() => calcTotalIncurrido(transactions), [transactions])

  return {
    transactions,
    budgetCategories,
    suppliers,
    loading,
    saving,
    error,
    dateFrom,
    dateTo,
    load,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    applyDateFilter,
    clearDateFilter,
    transitos,
    cashDisponible,
    totalCxP,
    disponibleNeto,
    totalIncurrido,
  }
}
