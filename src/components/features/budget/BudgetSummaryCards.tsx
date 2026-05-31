import { formatRD } from '@/utils/currency'

export function BudgetSummaryCards({ spent, budgeted }: { spent: number; budgeted: number }) {
  const diff = budgeted - spent

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-app-surface rounded-xl border border-app-border p-4">
        <p className="text-xs text-app-muted">Total gastado</p>
        <p className="text-2xl font-semibold text-app-text mt-1">{formatRD(spent)}</p>
      </div>
      <div className="bg-app-surface rounded-xl border border-app-border p-4">
        <p className="text-xs text-app-muted">Presupuesto total</p>
        <p className="text-2xl font-semibold text-app-text mt-1">{formatRD(budgeted)}</p>
      </div>
      <div
        className={`rounded-xl border p-4 ${diff < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
      >
        <p className="text-xs text-app-muted">Diferencia</p>
        <p className={`text-2xl font-semibold mt-1 ${diff < 0 ? 'text-red-700' : 'text-green-700'}`}>
          {formatRD(diff)}
        </p>
      </div>
    </div>
  )
}
