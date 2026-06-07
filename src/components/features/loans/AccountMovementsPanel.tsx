import { ArrowDownCircle, ArrowUpCircle, Building2 } from 'lucide-react'
import { useAccountMovements } from '@/hooks/useAccountMovements'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatRD } from '@/utils/currency'
import type { AccountMovement, BankAccount } from '@/types/database'

// ─── Helpers de presentación ────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

const ORIGEN_LABEL: Record<string, string> = {
  loan_disbursement: 'Desembolso de préstamo',
  loan_repayment: 'Cobro de cuota',
  manual: 'Manual',
}

function origenLabel(origen: string): string {
  return ORIGEN_LABEL[origen] ?? origen
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function AccountSelector({
  accounts,
  selectedId,
  onChange,
}: {
  accounts: BankAccount[]
  selectedId: string | null
  onChange: (id: string) => void
}) {
  if (accounts.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((acc) => (
        <button
          key={acc.id}
          onClick={() => onChange(acc.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            selectedId === acc.id
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-app-surface text-app-muted border-app-border hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[180px]">
            {acc.owner_name} — {acc.bank_name}
          </span>
        </button>
      ))}
    </div>
  )
}

function BalanceCard({
  label,
  amount,
  variant,
}: {
  label: string
  amount: number
  variant: 'credito' | 'debito' | 'saldo'
}) {
  const colorClass =
    variant === 'credito'
      ? 'text-emerald-600 dark:text-emerald-400'
      : variant === 'debito'
        ? 'text-red-500 dark:text-red-400'
        : amount >= 0
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-red-500 dark:text-red-400'

  return (
    <div className="bg-app-bg rounded-xl border border-app-border p-4 flex flex-col gap-1">
      <p className="text-xs text-app-subtle uppercase font-semibold">{label}</p>
      <p className={`text-lg font-bold ${colorClass}`}>{formatRD(amount)}</p>
    </div>
  )
}

function MovimientoRow({ mov }: { mov: AccountMovement }) {
  const isCredito = mov.tipo === 'credito'
  return (
    <tr className="hover:bg-app-hover transition-colors">
      <td className="px-4 py-3 text-xs text-app-muted">{formatDate(mov.fecha)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isCredito ? (
            <ArrowDownCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <ArrowUpCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <div>
            <p className="text-xs font-medium text-app-text">{mov.concepto}</p>
            <p className="text-[11px] text-app-subtle">{origenLabel(mov.origen)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`text-sm font-semibold ${isCredito ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
        >
          {isCredito ? '+' : '−'}
          {formatRD(mov.monto)}
        </span>
      </td>
    </tr>
  )
}

function MovimientoCard({ mov }: { mov: AccountMovement }) {
  const isCredito = mov.tipo === 'credito'
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-app-hover transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        {isCredito ? (
          <ArrowDownCircle className="w-5 h-5 text-emerald-500 shrink-0" />
        ) : (
          <ArrowUpCircle className="w-5 h-5 text-red-400 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-app-text truncate">{mov.concepto}</p>
          <p className="text-[11px] text-app-subtle">
            {formatDate(mov.fecha)} · {origenLabel(mov.origen)}
          </p>
        </div>
      </div>
      <span
        className={`text-sm font-bold shrink-0 ${isCredito ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
      >
        {isCredito ? '+' : '−'}
        {formatRD(mov.monto)}
      </span>
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function AccountMovementsPanel() {
  const { accounts, selectedAccountId, movements, balance, loading, loadingMovements, error, setSelectedAccountId } =
    useAccountMovements()

  if (loading) return <SkeletonTable rows={4} cols={3} />

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
        <Building2 className="w-8 h-8 text-app-subtle mx-auto mb-2" />
        <p className="text-sm text-app-muted">No hay cuentas bancarias registradas.</p>
        <p className="text-xs text-app-subtle mt-1">Ve a Configuración → Cuentas bancarias para agregar una.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector de cuenta */}
      <AccountSelector accounts={accounts} selectedId={selectedAccountId} onChange={setSelectedAccountId} />

      {/* Tarjetas de resumen */}
      {balance && (
        <div className="grid grid-cols-3 gap-3">
          <BalanceCard label="Entradas" amount={balance.totalCreditos} variant="credito" />
          <BalanceCard label="Salidas" amount={balance.totalDebitos} variant="debito" />
          <BalanceCard label="Saldo neto" amount={balance.saldo} variant="saldo" />
        </div>
      )}

      {/* Tabla de movimientos */}
      {loadingMovements ? (
        <SkeletonTable rows={3} cols={3} />
      ) : movements.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <p className="text-sm text-app-muted">Esta cuenta aún no tiene movimientos registrados.</p>
          <p className="text-xs text-app-subtle mt-1">
            Los movimientos se generan automáticamente al desembolsar un préstamo o al marcar una cuota como cobrada.
          </p>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          {/* Tabla en pantallas medianas/grandes */}
          <table className="w-full hidden sm:table">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-app-subtle uppercase">Fecha</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-app-subtle uppercase">Concepto</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-app-subtle uppercase">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {movements.map((mov) => (
                <MovimientoRow key={mov.id} mov={mov} />
              ))}
            </tbody>
          </table>
          {/* Cards en móvil */}
          <div className="sm:hidden divide-y divide-app-border">
            {movements.map((mov) => (
              <MovimientoCard key={mov.id} mov={mov} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
