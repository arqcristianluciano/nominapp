import { useCallback, useEffect, useMemo, useState } from 'react'
import { accountMovementService, type AccountBalance } from '@/services/accountMovementService'
import { bankAccountService } from '@/services/bankAccountService'
import type { AccountMovement, AccountMovementTipo, BankAccount } from '@/types/database'
import { getErrorMessage } from '@/utils/errors'

export interface ManualMovementInput {
  tipo: AccountMovementTipo
  monto: number
  fecha: string
  concepto: string
}

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
  /** Registra un movimiento manual (depósito o retiro) en la cuenta seleccionada y recarga la lista. */
  addManualMovement: (input: ManualMovementInput) => Promise<void>
  /** Corrige un movimiento anotado a mano y recarga la lista. */
  updateManualMovement: (id: string, input: ManualMovementInput) => Promise<void>
  /** Borra un movimiento anotado a mano y recarga la lista. */
  deleteManualMovement: (id: string) => Promise<void>
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

  const addManualMovement = useCallback(
    async (input: ManualMovementInput) => {
      if (!selectedAccountId) return
      await accountMovementService.create({
        account_id: selectedAccountId,
        fecha: input.fecha,
        tipo: input.tipo,
        monto: input.monto,
        concepto: input.concepto,
        origen: 'manual',
        referencia_id: null,
      })
      await loadMovementsForAccount(selectedAccountId)
    },
    [selectedAccountId, loadMovementsForAccount],
  )

  const updateManualMovement = useCallback(
    async (id: string, input: ManualMovementInput) => {
      if (!selectedAccountId) return
      await accountMovementService.update(id, {
        tipo: input.tipo,
        monto: input.monto,
        fecha: input.fecha,
        concepto: input.concepto,
      })
      await loadMovementsForAccount(selectedAccountId)
    },
    [selectedAccountId, loadMovementsForAccount],
  )

  const deleteManualMovement = useCallback(
    async (id: string) => {
      if (!selectedAccountId) return
      await accountMovementService.delete(id)
      await loadMovementsForAccount(selectedAccountId)
    },
    [selectedAccountId, loadMovementsForAccount],
  )

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
    addManualMovement,
    updateManualMovement,
    deleteManualMovement,
  }
}
