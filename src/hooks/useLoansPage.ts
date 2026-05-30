import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'
import { loanService } from '@/services/loanService'
import { contractorService } from '@/services/contractorService'
import type { ContractorLoan, Contractor } from '@/types/database'
import { getErrorMessage } from '@/utils/errors'

type LoanCreateInput = Parameters<typeof loanService.create>[0]

interface ToastHandlers {
  success: (message: string) => void
  error: (message: string) => void
}

interface LoanActionContext extends ToastHandlers {
  refresh: () => Promise<void>
}

interface LoansUiState {
  saving: boolean
  search: string
  showForm: boolean
  cancelTargetId: string | null
  setSaving: (value: boolean) => void
  setSearch: (value: string) => void
  setShowForm: (value: boolean) => void
  setCancelTargetId: (value: string | null) => void
}

async function fetchLoansData() {
  const [loans, contractors] = await Promise.all([loanService.getAll(), contractorService.getAll()])
  const paidEntries = await Promise.all(
    loans.map(async (loan) => [loan.id, await loanService.getTotalPaid(loan.id)] as const),
  )
  return { loans, contractors, paidMap: Object.fromEntries(paidEntries) }
}

function filterLoans(loans: ContractorLoan[], search: string) {
  const term = search.trim().toLowerCase()
  if (!term) return loans
  return loans.filter(
    (loan) => loan.contractor?.name?.toLowerCase().includes(term) || loan.notes?.toLowerCase().includes(term),
  )
}

function useLoansData(onError: (message: string) => void) {
  const [loans, setLoans] = useState<ContractorLoan[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchLoansData()
      setLoans(data.loans)
      setContractors(data.contractors)
      setPaidMap(data.paidMap)
    } catch (loadError) {
      onError(`No se pudieron cargar préstamos: ${getErrorMessage(loadError)}`)
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { loans, contractors, paidMap, loading, refresh }
}

function useLoanFilters(loans: ContractorLoan[], search: string) {
  const filteredLoans = useMemo(() => filterLoans(loans, search), [loans, search])
  const activeLoans = useMemo(() => filteredLoans.filter((loan) => loan.status === 'active'), [filteredLoans])
  const otherLoans = useMemo(() => filteredLoans.filter((loan) => loan.status !== 'active'), [filteredLoans])
  return { activeLoans, otherLoans }
}

async function markLoanAsPaid(loanId: string, context: LoanActionContext) {
  try {
    await loanService.updateStatus(loanId, 'paid')
    await context.refresh()
    context.success('Préstamo marcado como pagado')
  } catch (err) {
    console.error('[useLoansPage] markLoanAsPaid fallo', err)
    Sentry.captureException(err, { tags: { area: 'useLoansPage' } })
    context.error(getErrorMessage(err) || 'No se pudo marcar como pagado')
  }
}

async function cancelLoan(loanId: string, context: LoanActionContext) {
  try {
    await loanService.updateStatus(loanId, 'cancelled')
    await context.refresh()
    context.success('Préstamo cancelado')
    return true
  } catch (err) {
    console.error('[useLoansPage] cancelLoan fallo', err)
    Sentry.captureException(err, { tags: { area: 'useLoansPage' } })
    context.error(getErrorMessage(err) || 'No se pudo cancelar el préstamo')
    return false
  }
}

function useLoansUiState(): LoansUiState {
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  return { saving, search, showForm, cancelTargetId, setSaving, setSearch, setShowForm, setCancelTargetId }
}

function useLoanHandlers(
  context: LoanActionContext,
  setSaving: (value: boolean) => void,
  setShowForm: (value: boolean) => void,
  setCancelTargetId: (value: string | null) => void,
) {
  const handleCreate = useCallback(
    async (values: LoanCreateInput) => {
      setSaving(true)
      try {
        await loanService.create(values)
        setShowForm(false)
        await context.refresh()
        context.success('Préstamo creado correctamente')
      } catch (err) {
        console.error('[useLoansPage] handleCreate fallo', err)
        Sentry.captureException(err, { tags: { area: 'useLoansPage' } })
        context.error('Error al crear el préstamo')
      } finally {
        setSaving(false)
      }
    },
    [context, setSaving, setShowForm],
  )

  const handleMarkPaid = useCallback(async (loanId: string) => markLoanAsPaid(loanId, context), [context])
  const handleCancel = useCallback(
    async (loanId: string) => {
      const cancelled = await cancelLoan(loanId, context)
      if (cancelled) setCancelTargetId(null)
    },
    [context, setCancelTargetId],
  )

  return { handleCreate, handleMarkPaid, handleCancel }
}

export function useLoansPage({ success, error }: ToastHandlers) {
  const ui = useLoansUiState()
  const { loans, contractors, paidMap, loading, refresh } = useLoansData(error)
  const { activeLoans, otherLoans } = useLoanFilters(loans, ui.search)
  const actionContext = useMemo(() => ({ refresh, success, error }), [error, refresh, success])
  const { handleCreate, handleMarkPaid, handleCancel } = useLoanHandlers(
    actionContext,
    ui.setSaving,
    ui.setShowForm,
    ui.setCancelTargetId,
  )

  return {
    loans,
    contractors,
    paidMap,
    loading,
    saving: ui.saving,
    search: ui.search,
    showForm: ui.showForm,
    cancelTargetId: ui.cancelTargetId,
    activeLoans,
    otherLoans,
    setSearch: ui.setSearch,
    setShowForm: ui.setShowForm,
    setCancelTargetId: ui.setCancelTargetId,
    handleCreate,
    handleMarkPaid,
    handleCancel,
  }
}
