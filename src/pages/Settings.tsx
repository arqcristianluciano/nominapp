import { useEffect, useState } from 'react'
import { bankAccountService } from '@/services/bankAccountService'
import { Modal } from '@/components/ui/Modal'
import type { BankAccount } from '@/types/database'
import { BankAccountForm } from '@/components/features/settings/BankAccountForm'
import {
  BankAccountsPanel,
  BudgetCategoriesPanel,
  PaymentConditionsPanel,
  SystemPanel,
} from '@/components/features/settings/SettingsPanels'
import { SETTINGS_TABS, type SettingsTab } from '@/components/features/settings/settingsTabs'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('bancos')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BankAccount | undefined>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const data = await bankAccountService.getAll()
      setAccounts(data)
    } catch (err) {
      console.error('Settings loadAccounts failed', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (data: Omit<BankAccount, 'id'>) => {
    setSaving(true)
    try {
      await bankAccountService.create(data)
      setShowForm(false)
      loadAccounts()
    } catch (err) {
      console.error('Settings createAccount failed', err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateAccount = async (data: Partial<BankAccount>) => {
    if (!editing) return
    setSaving(true)
    try {
      await bankAccountService.update(editing.id, data)
      setEditing(undefined)
      loadAccounts()
    } catch (err) {
      console.error('Settings updateAccount failed', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-app-text">Configuración</h1>
        <p className="text-sm text-app-muted mt-1">Tablas maestras y ajustes del sistema</p>
      </div>

      <div className="flex gap-0 border-b border-app-border">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-app-muted hover:text-app-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'bancos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              + Nueva cuenta
            </button>
          </div>
          <BankAccountsPanel loading={loading} accounts={accounts} onEdit={(account) => { setEditing(account); setShowForm(true) }} />

          <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(undefined) }} title={editing ? 'Editar cuenta' : 'Nueva cuenta bancaria'}>
            <BankAccountForm
              initial={editing}
              saving={saving}
              onSubmit={(data) => editing ? handleUpdateAccount(data) : handleCreateAccount(data as Omit<BankAccount, 'id'>)}
              onCancel={() => { setShowForm(false); setEditing(undefined) }}
            />
          </Modal>
        </div>
      )}

      {activeTab === 'condiciones' && <PaymentConditionsPanel />}
      {activeTab === 'categorias' && <BudgetCategoriesPanel />}
      {activeTab === 'sistema' && <SystemPanel />}
    </div>
  )
}
