import { ChevronLeft, ChevronRight, Filter, Plus, X } from 'lucide-react'
import { TransactionInlineForm } from '@/components/features/control/TransactionInlineForm'
import { TransactionRow } from '@/components/features/control/TransactionRow'
import { formatRD } from '@/utils/currency'
import type { useTransactions } from '@/hooks/useTransactions'

type TxnState = ReturnType<typeof useTransactions>

interface Props {
  projectId: string
  txns: TxnState
  showAddForm: boolean
  showFilter: boolean
  filterFrom: string
  filterTo: string
  page: number
  pageSize: number
  pagedTransactions: TxnState['transactions']
  totalPages: number
  onToggleAdd: () => void
  onToggleFilter: () => void
  onFilterFrom: (value: string) => void
  onFilterTo: (value: string) => void
  onApplyFilter: () => void
  onClearFilter: () => void
  onPage: (page: number) => void
  isCurrentMonth: (dateStr: string) => boolean
}

export function DiarioTab({
  projectId,
  txns,
  showAddForm,
  showFilter,
  filterFrom,
  filterTo,
  page,
  pageSize,
  pagedTransactions,
  totalPages,
  onToggleAdd,
  onToggleFilter,
  onFilterFrom,
  onFilterTo,
  onApplyFilter,
  onClearFilter,
  onPage,
  isCurrentMonth,
}: Props) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          onClick={onToggleFilter}
          className="flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
        >
          <Filter className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Filtrar
        </button>
        <button
          onClick={onToggleAdd}
          className="flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-1.5 bg-blue-600 text-white text-sm sm:text-xs font-semibold sm:font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Nueva transacción
        </button>
      </div>

      {showFilter && (
        <div className="flex flex-wrap items-end gap-2 sm:gap-3 bg-app-surface border border-app-border rounded-lg p-3 shadow-xs">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[11px] sm:text-[10px] font-medium text-app-muted mb-1 sm:mb-0.5 block">Desde</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => onFilterFrom(e.target.value)}
              className="w-full px-2 py-2 sm:py-1.5 border border-app-border rounded text-sm sm:text-xs bg-app-input-bg text-app-text [color-scheme:light] dark:[color-scheme:dark] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[11px] sm:text-[10px] font-medium text-app-muted mb-1 sm:mb-0.5 block">Hasta</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => onFilterTo(e.target.value)}
              className="w-full px-2 py-2 sm:py-1.5 border border-app-border rounded text-sm sm:text-xs bg-app-input-bg text-app-text [color-scheme:light] dark:[color-scheme:dark] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={onApplyFilter}
            className="flex-1 sm:flex-none min-h-[40px] sm:min-h-0 px-3 py-2 sm:py-1.5 bg-blue-600 text-white text-sm sm:text-xs font-semibold sm:font-normal rounded-lg hover:bg-blue-700"
          >
            Aplicar
          </button>
          {(txns.dateFrom || txns.dateTo) && (
            <button
              onClick={onClearFilter}
              className="flex items-center justify-center gap-1 flex-1 sm:flex-none min-h-[40px] sm:min-h-0 px-3 py-2 sm:py-1.5 text-sm sm:text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover-strong"
            >
              <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> Limpiar
            </button>
          )}
        </div>
      )}

      {showAddForm && (
        <TransactionInlineForm
          projectId={projectId}
          budgetCategories={txns.budgetCategories}
          suppliers={txns.suppliers}
          onSubmit={txns.addTransaction}
          saving={txns.saving}
        />
      )}

      {txns.loading ? (
        <div className="text-sm text-app-muted">Cargando transacciones...</div>
      ) : txns.transactions.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <p className="text-app-muted">No hay transacciones registradas</p>
          <button onClick={onToggleAdd} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
            Registrar la primera transacción
          </button>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Cód.</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Partida</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Descripción</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Proveedor</th>
                <th className="px-2 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Cant.</th>
                <th className="px-2 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Precio</th>
                <th className="px-2 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Total</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Condición</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Factura</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Cheque</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase hidden lg:table-cell">
                  Banco
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase hidden lg:table-cell">
                  Canje
                </th>
                <th className="px-2 py-2 text-[10px] font-semibold text-app-muted uppercase w-16"></th>
              </tr>
            </thead>
            <tbody>
              {pagedTransactions.map((item) => (
                <TransactionRow
                  key={item.id}
                  transaction={item}
                  budgetCategories={txns.budgetCategories}
                  suppliers={txns.suppliers}
                  onUpdate={txns.updateTransaction}
                  onDelete={txns.deleteTransaction}
                  isCurrentMonth={isCurrentMonth(item.date)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-app-bg border-t border-app-border">
                <td colSpan={7} className="px-2 py-2 text-xs font-semibold text-app-muted text-right">
                  Total ({txns.transactions.length} transacciones):
                </td>
                <td className="px-2 py-2 text-xs font-bold text-app-text text-right">
                  {formatRD(txns.transactions.reduce((sum, item) => sum + item.total, 0))}
                </td>
                <td colSpan={6}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-app-surface rounded-xl border border-app-border">
          <span className="text-xs text-app-muted">
            Página {page} de {totalPages} — mostrando{' '}
            {Math.min(pageSize, txns.transactions.length - (page - 1) * pageSize)} de {txns.transactions.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-app-subtle hover:text-app-muted hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              const number = Math.max(1, Math.min(totalPages - 4, page - 2)) + idx
              return (
                <button
                  key={number}
                  onClick={() => onPage(number)}
                  className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${number === page ? 'bg-blue-600 text-white' : 'text-app-muted hover:bg-app-hover'}`}
                >
                  {number}
                </button>
              )
            })}
            <button
              onClick={() => onPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-app-subtle hover:text-app-muted hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
