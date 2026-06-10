import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'
import { loanService } from '@/services/loanService'
import { contractorService } from '@/services/contractorService'
import { bankAccountService } from '@/services/bankAccountService'
import type { BankAccount, ContractorLoan, Contractor, LoanFrecuencia, LoanInstallment } from '@/types/database'
import { getErrorMessage } from '@/utils/errors'

type LoanCreateInput = Parameters<typeof loanService.create>[0]
type LoanUpdateInput = Parameters<typeof loanService.update>[1]

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
  editLoan: ContractorLoan | null
  setSaving: (value: boolean) => void
  setSearch: (value: string) => void
  setShowForm: (value: boolean) => void
  setCancelTargetId: (value: string | null) => void
  setEditLoan: (value: ContractorLoan | null) => void
}

async function fetchLoansData() {
  const [loans, contractors, bankAccounts] = await Promise.all([
    loanService.getAll(),
    contractorService.getAll(),
    bankAccountService.getAll(),
  ])
  // Perf: una sola query para todos los totales pagados (en vez de N).
  const paidMap = await loanService.getTotalPaidByLoans(loans.map((l) => l.id))
  // Una sola query para todos los cronogramas de cuotas.
  const installmentsMap = await loanService.getInstallmentsByLoans(loans.map((l) => l.id))
  return { loans, contractors, bankAccounts, paidMap, installmentsMap }
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
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, number>>({})
  const [installmentsMap, setInstallmentsMap] = useState<Record<string, LoanInstallment[]>>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchLoansData()
      setLoans(data.loans)
      setContractors(data.contractors)
      setBankAccounts(data.bankAccounts)
      setPaidMap(data.paidMap)
      setInstallmentsMap(data.installmentsMap)
    } catch (loadError) {
      onError(`No se pudieron cargar préstamos: ${getErrorMessage(loadError)}`)
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { loans, contractors, bankAccounts, paidMap, installmentsMap, loading, refresh }
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
  const [editLoan, setEditLoan] = useState<ContractorLoan | null>(null)
  return {
    saving,
    search,
    showForm,
    cancelTargetId,
    editLoan,
    setSaving,
    setSearch,
    setShowForm,
    setCancelTargetId,
    setEditLoan,
  }
}

function useLoanHandlers(
  context: LoanActionContext,
  installmentsMap: Record<string, LoanInstallment[]>,
  setSaving: (value: boolean) => void,
  setShowForm: (value: boolean) => void,
  setCancelTargetId: (value: string | null) => void,
  setEditLoan: (value: ContractorLoan | null) => void,
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

  const handleEdit = useCallback(
    async (loanId: string, values: LoanUpdateInput) => {
      setSaving(true)
      try {
        await loanService.update(loanId, values)
        setEditLoan(null)
        await context.refresh()
        context.success('Préstamo actualizado correctamente')
      } catch (err) {
        console.error('[useLoansPage] handleEdit fallo', err)
        Sentry.captureException(err, { tags: { area: 'useLoansPage' } })
        context.error('Error al actualizar el préstamo')
      } finally {
        setSaving(false)
      }
    },
    [context, setSaving, setEditLoan],
  )

  const handleMarkPaid = useCallback(async (loanId: string) => markLoanAsPaid(loanId, context), [context])
  const handleCancel = useCallback(
    async (loanId: string) => {
      const cancelled = await cancelLoan(loanId, context)
      if (cancelled) setCancelTargetId(null)
    },
    [context, setCancelTargetId],
  )

  /** Registra el pago de una cuota (con cuenta de cobro opcional). Si era la
   *  última pendiente, el préstamo completo queda marcado como pagado. */
  const handlePayInstallment = useCallback(
    async (loan: ContractorLoan, installment: LoanInstallment, fechaPago: string, cuentaCobroId?: string) => {
      try {
        await loanService.markInstallmentPaid(installment.id, fechaPago, cuentaCobroId)
        const stillPending = (installmentsMap[loan.id] ?? []).filter(
          (i) => i.id !== installment.id && i.estado === 'pendiente',
        )
        if (stillPending.length === 0 && loan.status === 'active') {
          await loanService.updateStatus(loan.id, 'paid')
        }
        await context.refresh()
        context.success(`Cuota #${installment.numero_cuota} registrada como pagada`)
      } catch (err) {
        console.error('[useLoansPage] handlePayInstallment fallo', err)
        Sentry.captureException(err, { tags: { area: 'useLoansPage' } })
        context.error(getErrorMessage(err) || 'No se pudo registrar el pago de la cuota')
      }
    },
    [context, installmentsMap],
  )

  /** Cambia la fecha programada de una cuota pendiente. */
  const handleUpdateInstallmentDate = useCallback(
    async (installment: LoanInstallment, fechaProgramada: string) => {
      try {
        await loanService.updateInstallmentDate(installment.id, fechaProgramada)
        await context.refresh()
        context.success(`Fecha de la cuota #${installment.numero_cuota} actualizada`)
      } catch (err) {
        console.error('[useLoansPage] handleUpdateInstallmentDate fallo', err)
        Sentry.captureException(err, { tags: { area: 'useLoansPage' } })
        context.error(getErrorMessage(err) || 'No se pudo cambiar la fecha de la cuota')
      }
    },
    [context],
  )

  /** Calcula si el préstamo a editar tiene al menos una cuota ya pagada */
  const hasPaidInstallments = useCallback(
    (loanId: string) => {
      const insts = installmentsMap[loanId] ?? []
      return insts.some((i) => i.estado === 'pagada')
    },
    [installmentsMap],
  )

  return {
    handleCreate,
    handleEdit,
    handleMarkPaid,
    handleCancel,
    handlePayInstallment,
    handleUpdateInstallmentDate,
    hasPaidInstallments,
  }
}

export function useLoansPage({ success, error }: ToastHandlers) {
  const ui = useLoansUiState()
  const { loans, contractors, bankAccounts, paidMap, installmentsMap, loading, refresh } = useLoansData(error)
  const { activeLoans, otherLoans } = useLoanFilters(loans, ui.search)
  const actionContext = useMemo(() => ({ refresh, success, error }), [error, refresh, success])
  const {
    handleCreate,
    handleEdit,
    handleMarkPaid,
    handleCancel,
    handlePayInstallment,
    handleUpdateInstallmentDate,
    hasPaidInstallments,
  } = useLoanHandlers(
    actionContext,
    installmentsMap,
    ui.setSaving,
    ui.setShowForm,
    ui.setCancelTargetId,
    ui.setEditLoan,
  )

  return {
    loans,
    contractors,
    bankAccounts,
    paidMap,
    installmentsMap,
    loading,
    saving: ui.saving,
    search: ui.search,
    showForm: ui.showForm,
    cancelTargetId: ui.cancelTargetId,
    editLoan: ui.editLoan,
    activeLoans,
    otherLoans,
    setSearch: ui.setSearch,
    setShowForm: ui.setShowForm,
    setCancelTargetId: ui.setCancelTargetId,
    setEditLoan: ui.setEditLoan,
    handleCreate,
    handleEdit,
    handleMarkPaid,
    handleCancel,
    handlePayInstallment,
    handleUpdateInstallmentDate,
    hasPaidInstallments,
  }
}

// Re-export types for convenience
export type { LoanFrecuencia }
