import { useState } from 'react'
import type { BankAccount, Company } from '@/types/database'
import { PAYMENT_CONDITIONS } from '@/constants/indirectCosts'
import { DEFAULT_BUDGET_CATEGORIES } from '@/constants/budgetCategories'
import { DOMINICAN_BANKS } from '@/constants/banks'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { approvalCode } from '@/utils/approvalCode'
import { useToast } from '@/components/ui/Toast'

export function BankAccountsPanel({
  loading,
  accounts,
  onEdit,
}: {
  loading: boolean
  accounts: BankAccount[]
  onEdit?: (account: BankAccount) => void
}) {
  if (loading) return <div className="text-sm text-app-muted">Cargando...</div>
  if (accounts.length === 0) {
    return (
      <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
        <p className="text-app-muted">No hay cuentas bancarias registradas</p>
      </div>
    )
  }

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Titular</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Banco</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">No. Cuenta</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Tipo</th>
            <th className="px-3 py-2 text-center text-[10px] font-semibold text-app-muted uppercase">Interna</th>
            <th className="px-3 py-2 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b border-app-border hover:bg-app-hover">
              <td className="px-3 py-2.5 text-xs text-app-text font-medium">{account.owner_name}</td>
              <td className="px-3 py-2.5 text-xs text-app-muted">{account.bank_name}</td>
              <td className="px-3 py-2.5 text-xs text-app-muted">{account.account_number}</td>
              <td className="px-3 py-2.5 text-xs text-app-muted">{account.account_type || '—'}</td>
              <td className="px-3 py-2.5 text-xs text-center">
                {account.is_internal ? (
                  <span className="text-green-600 font-medium">Si</span>
                ) : (
                  <span className="text-app-subtle">No</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {onEdit && (
                  <button onClick={() => onEdit(account)} className="text-xs text-blue-600 hover:text-blue-800">
                    Editar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CompaniesPanel({
  loading,
  companies,
  onEdit,
}: {
  loading: boolean
  companies: Company[]
  onEdit?: (company: Company) => void
}) {
  if (loading) return <div className="text-sm text-app-muted">Cargando...</div>
  if (companies.length === 0) {
    return (
      <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
        <p className="text-app-muted">No hay empresas registradas</p>
      </div>
    )
  }

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Nombre</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">RNC</th>
            <th className="px-3 py-2 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id} className="border-b border-app-border hover:bg-app-hover">
              <td className="px-3 py-2.5 text-xs text-app-text font-medium">{company.name}</td>
              <td className="px-3 py-2.5 text-xs text-app-muted">{company.rnc || '—'}</td>
              <td className="px-3 py-2.5">
                {onEdit && (
                  <button onClick={() => onEdit(company)} className="text-xs text-blue-600 hover:text-blue-800">
                    Editar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PaymentConditionsPanel() {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Valor</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Etiqueta</th>
          </tr>
        </thead>
        <tbody>
          {PAYMENT_CONDITIONS.map((condition) => (
            <tr key={condition.value} className="border-b border-app-border">
              <td className="px-3 py-2.5 text-xs text-app-muted font-mono">{condition.value}</td>
              <td className="px-3 py-2.5 text-xs text-app-text">{condition.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BudgetCategoriesPanel() {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase w-8">#</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Código</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Nombre</th>
          </tr>
        </thead>
        <tbody>
          {DEFAULT_BUDGET_CATEGORIES.map((category) => (
            <tr key={category.code} className="border-b border-app-border">
              <td className="px-3 py-2.5 text-xs text-app-subtle">{category.sort_order}</td>
              <td className="px-3 py-2.5 text-xs text-app-muted font-mono">{category.code}</td>
              <td className="px-3 py-2.5 text-xs text-app-text">{category.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Tarjeta para cambiar el "código de aprobación": el que se pide al aprobar
 * órdenes de compra y cortes. Es un candado rápido guardado en este navegador
 * (no una seguridad de banco). Antes venía fijo en "1234" y no había forma de
 * cambiarlo; aquí el dueño puede ponerle el suyo.
 */
function ApprovalCodeCard() {
  const { success, error } = useToast()
  const [code, setCode] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const inputCls =
    'w-full border border-app-border rounded-lg px-3 py-2.5 text-sm bg-app-bg text-app-text min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500'

  const handleSave = () => {
    const trimmed = code.trim()
    if (trimmed.length < 4) {
      error('El código debe tener al menos 4 caracteres.')
      return
    }
    if (trimmed !== confirm.trim()) {
      error('Los dos códigos no coinciden.')
      return
    }
    setSaving(true)
    try {
      approvalCode.set(trimmed)
      setCode('')
      setConfirm('')
      success('Código de aprobación actualizado en este dispositivo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-6 space-y-4">
      <div>
        <h2 className="font-medium text-app-text">Código de aprobación</h2>
        <p className="text-sm text-app-muted mt-1">
          Es el código que se pide al aprobar órdenes de compra y cortes de contratista. Sirve como candado rápido para
          no aprobar por error. Elige el tuyo aquí.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Nuevo código</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Al menos 4 caracteres"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Repite el código</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="El mismo código"
            className={inputCls}
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving || !code.trim() || !confirm.trim()}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        Guardar código
      </button>
      <p className="text-[11px] text-app-subtle">
        Nota: este candado es una comodidad, no una seguridad de banco. Se guarda solo en este dispositivo; si usas otro
        teléfono o computadora, deberás configurarlo también allí.
      </p>
    </div>
  )
}

export function SystemPanel() {
  return (
    <>
      <div className="bg-app-surface rounded-xl border border-app-border p-6 space-y-3">
        <h2 className="font-medium text-app-text">Apariencia</h2>
        <p className="text-sm text-app-muted">Modo claro u oscuro. Se guarda en este navegador.</p>
        <ThemeToggle showLabelAlways />
      </div>
      <ApprovalCodeCard />
      <div className="bg-app-surface rounded-xl border border-app-border p-6 space-y-4">
        <h2 className="font-medium text-app-text">Información del sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-app-muted">Versión</p>
            <p className="text-app-text font-medium">NominaAPP v0.4.0</p>
          </div>
          <div>
            <p className="text-app-muted">Stack</p>
            <p className="text-app-text font-medium">React 19 + Supabase + Zustand</p>
          </div>
          <div>
            <p className="text-app-muted">Compatibilidad</p>
            <p className="text-app-text font-medium">estatePRO (fusión futura)</p>
          </div>
          <div>
            <p className="text-app-muted">Bancos registrados</p>
            <p className="text-app-text font-medium">{DOMINICAN_BANKS.length} bancos</p>
          </div>
        </div>
      </div>
    </>
  )
}
