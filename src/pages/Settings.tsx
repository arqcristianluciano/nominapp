import { useEffect, useState } from 'react'
import { bankAccountService } from '@/services/bankAccountService'
import { Modal } from '@/components/ui/Modal'
import type { BankAccount } from '@/types/database'
import { PAYMENT_CONDITIONS } from '@/constants/indirectCosts'
import { DEFAULT_BUDGET_CATEGORIES } from '@/constants/budgetCategories'
import { DOMINICAN_BANKS } from '@/constants/banks'

type SettingsTab = 'bancos' | 'condiciones' | 'categorias' | 'sistema'

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
    } catch {
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
    } catch {
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
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'bancos', label: 'Cuentas bancarias' },
    { key: 'condiciones', label: 'Condiciones de pago' },
    { key: 'categorias', label: 'Categorías presupuestarias' },
    { key: 'sistema', label: 'Sistema' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Tablas maestras y ajustes del sistema</p>
      </div>

      <div className="flex gap-0 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
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
          {loading ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : accounts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No hay cuentas bancarias registradas</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Titular</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Banco</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">No. Cuenta</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase">Interna</th>
                    <th className="px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-xs text-gray-900 font-medium">{acc.owner_name}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{acc.bank_name}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{acc.account_number}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{acc.account_type || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-center">{acc.is_internal ? <span className="text-green-600 font-medium">Si</span> : <span className="text-gray-400">No</span>}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => { setEditing(acc); setShowForm(true) }} className="text-xs text-blue-600 hover:text-blue-800">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

      {activeTab === 'condiciones' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Valor</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Etiqueta</th>
              </tr>
            </thead>
            <tbody>
              {PAYMENT_CONDITIONS.map((pc) => (
                <tr key={pc.value} className="border-b border-gray-100">
                  <td className="px-3 py-2.5 text-xs text-gray-600 font-mono">{pc.value}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-900">{pc.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'categorias' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-8">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Código</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_BUDGET_CATEGORIES.map((cat) => (
                <tr key={cat.code} className="border-b border-gray-100">
                  <td className="px-3 py-2.5 text-xs text-gray-400">{cat.sort_order}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 font-mono">{cat.code}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-900">{cat.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sistema' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Información del sistema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Versión</p>
              <p className="text-gray-900 font-medium">NominaAPP v0.2.0</p>
            </div>
            <div>
              <p className="text-gray-500">Stack</p>
              <p className="text-gray-900 font-medium">React 19 + Supabase + Zustand</p>
            </div>
            <div>
              <p className="text-gray-500">Compatibilidad</p>
              <p className="text-gray-900 font-medium">estatePRO (fusión futura)</p>
            </div>
            <div>
              <p className="text-gray-500">Bancos registrados</p>
              <p className="text-gray-900 font-medium">{DOMINICAN_BANKS.length} bancos</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BankAccountForm({
  initial,
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: BankAccount
  saving: boolean
  onSubmit: (data: Partial<BankAccount>) => void
  onCancel: () => void
}) {
  const [ownerName, setOwnerName] = useState(initial?.owner_name || '')
  const [bankName, setBankName] = useState(initial?.bank_name || '')
  const [accountNumber, setAccountNumber] = useState(initial?.account_number || '')
  const [accountType, setAccountType] = useState(initial?.account_type || '')
  const [cedulaRnc, setCedulaRnc] = useState(initial?.cedula_rnc || '')
  const [isInternal, setIsInternal] = useState(initial?.is_internal ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      owner_name: ownerName,
      bank_name: bankName,
      account_number: accountNumber,
      account_type: accountType || null,
      cedula_rnc: cedulaRnc || null,
      is_internal: isInternal,
      project_id: null,
    })
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-700 mb-1 block">Titular</label>
          <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Banco</label>
          <select value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} required>
            <option value="">Seleccionar...</option>
            {DOMINICAN_BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">No. Cuenta</label>
          <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Tipo de cuenta</label>
          <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className={inputClass}>
            <option value="">—</option>
            <option value="Ahorro">Ahorro</option>
            <option value="Corriente">Corriente</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Cédula / RNC</label>
          <input type="text" value={cedulaRnc} onChange={(e) => setCedulaRnc(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded border-gray-300" />
            <span className="text-sm text-gray-700">Cuenta interna (de la empresa)</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}
