import { useCallback, useEffect, useState } from 'react'
import { bankAccountService } from '@/services/bankAccountService'
import type { BankAccount } from '@/types/database'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'

type BankAccountInput = Omit<BankAccount, 'id'>

function useBankAccountsData() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(false)
  const { error } = useToast()

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await bankAccountService.getAll()
      setAccounts(data)
    } catch (loadError) {
      error(`No se pudieron cargar cuentas bancarias: ${getErrorMessage(loadError)}`)
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  return { accounts, loading, loadAccounts }
}

function useBankAccountDialogState() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BankAccount | undefined>()

  const openCreate = useCallback(() => {
    setEditing(undefined)
    setShowForm(true)
  }, [])

  const openEdit = useCallback((account: BankAccount) => {
    setEditing(account)
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditing(undefined)
  }, [])

  return { showForm, editing, openCreate, openEdit, closeForm }
}

function useBankAccountSave(
  loadAccounts: () => Promise<void>,
  closeForm: () => void,
  editing?: BankAccount
) {
  const [saving, setSaving] = useState(false)
  const { error } = useToast()

  const saveAccount = useCallback(async (data: Partial<BankAccount>) => {
    setSaving(true)
    try {
      if (editing) await bankAccountService.update(editing.id, data)
      else await bankAccountService.create(data as BankAccountInput)
      closeForm()
      await loadAccounts()
    } catch (saveError) {
      error(`No se pudo guardar cuenta bancaria: ${getErrorMessage(saveError)}`)
    } finally {
      setSaving(false)
    }
  }, [closeForm, editing, error, loadAccounts])

  return { saving, saveAccount }
}

export function useSettingsBankAccounts() {
  const { accounts, loading, loadAccounts } = useBankAccountsData()
  const { showForm, editing, openCreate, openEdit, closeForm } = useBankAccountDialogState()
  const { saving, saveAccount } = useBankAccountSave(loadAccounts, closeForm, editing)

  return {
    accounts,
    loading,
    showForm,
    editing,
    saving,
    openCreate,
    openEdit,
    closeForm,
    saveAccount,
  }
}
