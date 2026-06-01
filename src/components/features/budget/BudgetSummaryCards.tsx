import { formatRD } from '@/utils/currency'

export function BudgetSummaryCards({ spent, budgeted }: { spent: number; budgeted: number }) {
  const diff = budgeted - spent

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-app-surface rounded-xl border border-app-border p-4">
        <p
          className="text-xs text-app-muted cursor-help"
          title={
            'Suma del control financiero (transacciones) más los gastos imputados desde ' +
            'reportes comprometidos y almacén (mano de obra, facturas y salidas de inventario). ' +
            'Nota: las transacciones y los ítems de reporte son fuentes independientes; si un ' +
            'mismo gasto se registra por ambas vías al mismo capítulo, puede contarse dos veces.'
          }
        >
          Total gastado
        </p>
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
