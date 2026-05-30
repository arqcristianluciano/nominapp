import { useCallback, useMemo, useState } from 'react'
import type { useTransactions } from '@/hooks/useTransactions'
import type { ControlTab } from '@/components/features/control/ControlFinancieroSections'
import { parseDateLocal } from '@/utils/dateLocal'

type TransactionsState = ReturnType<typeof useTransactions>

interface UseControlFinancieroStateParams {
  transactions: TransactionsState['transactions']
  applyDateFilter: TransactionsState['applyDateFilter']
  clearDateFilter: TransactionsState['clearDateFilter']
}

const PAGE_SIZE = 30

export function useControlFinancieroState({
  transactions,
  applyDateFilter,
  clearDateFilter,
}: UseControlFinancieroStateParams) {
  const [activeTab, setActiveTab] = useState<ControlTab>('diario')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [page, setPage] = useState(1)

  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return transactions.slice(start, start + PAGE_SIZE)
  }, [transactions, page])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(transactions.length / PAGE_SIZE)), [transactions.length])

  const isCurrentMonth = useCallback((dateStr: string) => {
    const currentDate = new Date()
    const transactionDate = parseDateLocal(dateStr.slice(0, 10))
    return (
      transactionDate.getMonth() === currentDate.getMonth() &&
      transactionDate.getFullYear() === currentDate.getFullYear()
    )
  }, [])

  const toggleAddForm = useCallback(() => {
    setShowAddForm((value) => !value)
  }, [])

  const toggleFilter = useCallback(() => {
    setShowFilter((value) => !value)
  }, [])

  const changePage = useCallback(
    (nextPage: number) => {
      const safePage = Math.max(1, Math.min(nextPage, totalPages))
      setPage(safePage)
    },
    [totalPages],
  )

  const handleApplyFilter = useCallback(() => {
    applyDateFilter(filterFrom, filterTo)
    setPage(1)
  }, [applyDateFilter, filterFrom, filterTo])

  const handleClearFilter = useCallback(() => {
    setFilterFrom('')
    setFilterTo('')
    clearDateFilter()
    setPage(1)
  }, [clearDateFilter])

  return {
    activeTab,
    showAddForm,
    showFilter,
    filterFrom,
    filterTo,
    page,
    pageSize: PAGE_SIZE,
    pagedTransactions,
    totalPages,
    setActiveTab,
    setFilterFrom,
    setFilterTo,
    toggleAddForm,
    toggleFilter,
    changePage,
    handleApplyFilter,
    handleClearFilter,
    isCurrentMonth,
  }
}
