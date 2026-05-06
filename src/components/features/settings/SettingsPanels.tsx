import type { BankAccount } from '@/types/database'
import { PAYMENT_CONDITIONS } from '@/constants/indirectCosts'
import { DEFAULT_BUDGET_CATEGORIES } from '@/constants/budgetCategories'
import { DOMINICAN_BANKS } from '@/constants/banks'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export function BankAccountsPanel({
  loading,
  accounts,
  onEdit,
}: {
  loading: boolean
  accounts: BankAccount[]
  onEdit: (account: BankAccount) => void
}) {
  if (loading) return <div className="text-sm text-app-muted">Cargando...</div>
  if (accounts.length === 0) {
    return <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center"><p className="text-app-muted">No hay cuentas bancarias registradas</p></div>
  }

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      <table className="w-full">
        <thead><tr className="bg-app-bg border-b border-app-border">
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Titular</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Banco</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">No. Cuenta</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Tipo</th>
          <th className="px-3 py-2 text-center text-[10px] font-semibold text-app-muted uppercase">Interna</th>
          <th className="px-3 py-2 w-16"></th>
        </tr></thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b border-app-border hover:bg-app-hover">
              <td className="px-3 py-2.5 text-xs text-app-text font-medium">{account.owner_name}</td>
              <td className="px-3 py-2.5 text-xs text-app-muted">{account.bank_name}</td>
              <td className="px-3 py-2.5 text-xs text-app-muted">{account.account_number}</td>
              <td className="px-3 py-2.5 text-xs text-app-muted">{account.account_type || '—'}</td>
              <td className="px-3 py-2.5 text-xs text-center">{account.is_internal ? <span className="text-green-600 font-medium">Si</span> : <span className="text-app-subtle">No</span>}</td>
              <td className="px-3 py-2.5"><button onClick={() => onEdit(account)} className="text-xs text-blue-600 hover:text-blue-800">Editar</button></td>
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
        <thead><tr className="bg-app-bg border-b border-app-border">
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Valor</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Etiqueta</th>
        </tr></thead>
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
        <thead><tr className="bg-app-bg border-b border-app-border">
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase w-8">#</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Código</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Nombre</th>
        </tr></thead>
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

export function SystemPanel() {
  return (
    <>
      <div className="bg-app-surface rounded-xl border border-app-border p-6 space-y-3">
        <h2 className="font-medium text-app-text">Apariencia</h2>
        <p className="text-sm text-app-muted">Modo claro u oscuro. Se guarda en este navegador.</p>
        <ThemeToggle showLabelAlways />
      </div>
      <div className="bg-app-surface rounded-xl border border-app-border p-6 space-y-4">
        <h2 className="font-medium text-app-text">Información del sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><p className="text-app-muted">Versión</p><p className="text-app-text font-medium">NominaAPP v0.4.0</p></div>
          <div><p className="text-app-muted">Stack</p><p className="text-app-text font-medium">React 19 + Supabase + Zustand</p></div>
          <div><p className="text-app-muted">Compatibilidad</p><p className="text-app-text font-medium">estatePRO (fusión futura)</p></div>
          <div><p className="text-app-muted">Bancos registrados</p><p className="text-app-text font-medium">{DOMINICAN_BANKS.length} bancos</p></div>
        </div>
      </div>
    </>
  )
}
