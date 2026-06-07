import { useCallback, useEffect, useMemo, useState } from 'react'
import { accountMovementService, type AccountBalance } from '@/services/accountMovementService'
import { bankAccountService } from '@/services/bankAccountService'
import type { AccountMovement, BankAccount } from '@/types/database'
import { getErrorMessage } from '@/utils/errors'

interface UseAccountMovementsResult {
  /** Lista de cuentas bancarias cargadas */
  accounts: BankAccount[]
  /** Cuenta seleccionada actualmente */
  selectedAccountId: string | null
  /** Movimientos de la cuenta seleccionada */
  movements: AccountMovement[]
  /** Saldo calculado de la cuenta seleccionada */
  balance: AccountBalance | null
  loading: boolean
  loadingMovements: boolean
  error: string | null
  setSelectedAccountId: (id: string | null) => void
  refresh: () => Promise<void>
}

export function useAccountMovements(): UseAccountMovementsResult {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [movementsMap, setMovementsMap] = useState<Record<string, AccountMovement[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const data = await bankAccountService.getAll()
      setAccounts(data)
      // Pre-seleccionar la primera cuenta si ninguna está seleccionada
      setSelectedAccountId((prev) => prev ?? data[0]?.id ?? null)
    } catch (err) {
      setErrorMsg(`No se pudieron cargar las cuentas: ${getErrorMessage(err)}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMovementsForAccount = useCallback(async (accountId: string) => {
    setLoadingMovements(true)
    try {
      const data = await accountMovementService.getByAccount(accountId)
      setMovementsMap((prev) => ({ ...prev, [accountId]: data }))
    } catch (err) {
      setErrorMsg(`No se pudieron cargar los movimientos: ${getErrorMessage(err)}`)
    } finally {
      setLoadingMovements(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await loadAccounts()
    if (selectedAccountId) await loadMovementsForAccount(selectedAccountId)
  }, [loadAccounts, loadMovementsForAccount, selectedAccountId])

  // Carga inicial de cuentas
  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  // Carga de movimientos cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (!selectedAccountId) return
    if (movementsMap[selectedAccountId] !== undefined) return // ya cargado
    void loadMovementsForAccount(selectedAccountId)
  }, [selectedAccountId, movementsMap, loadMovementsForAccount])

  const movements = useMemo(
    () => (selectedAccountId ? (movementsMap[selectedAccountId] ?? []) : []),
    [selectedAccountId, movementsMap],
  )

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  )

  const balance = useMemo((): AccountBalance | null => {
    if (!selectedAccount) return null
    const { totalCreditos, totalDebitos, saldo } = accountMovementService.calcSaldo(movements)
    return { account: selectedAccount, totalCreditos, totalDebitos, saldo }
  }, [selectedAccount, movements])

  return {
    accounts,
    selectedAccountId,
    movements,
    balance,
    loading,
    loadingMovements,
    error: errorMsg,
    setSelectedAccountId: (id) => {
      setSelectedAccountId(id)
    },
    refresh,
  }
}
