import { useEffect, useMemo, useState } from 'react'
import { Layers, X } from 'lucide-react'
import type { BudgetCategory, BudgetItem } from '@/types/database'
import type { TransactionWithRelations } from '@/services/transactionService'
import { budgetItemService } from '@/services/budgetItemService'

// Re-imputación masiva: asigna una partida a todas las transacciones de un
// capítulo que aún no tienen partida (back-fill del histórico). Aprovecha el
// indicador de cobertura: sirve para cerrar el hueco de transacciones que solo
// tienen capítulo.
export function BulkPartidaForm({
  budgetCategories,
  transactions,
  onAssign,
  saving,
  onClose,
}: {
  budgetCategories: BudgetCategory[]
  transactions: TransactionWithRelations[]
  onAssign: (ids: string[], budgetItemId: string) => void
  saving: boolean
  onClose: () => void
}) {
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [budgetItemId, setBudgetItemId] = useState('')
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])

  useEffect(() => {
    let cancelled = false
    const promise = budgetCategoryId
      ? budgetItemService.getByCategoryId(budgetCategoryId)
      : Promise.resolve([] as BudgetItem[])
    promise
      .then((data) => {
        if (!cancelled) setBudgetItems(data)
      })
      .catch(() => {
        if (!cancelled) setBudgetItems([])
      })
    return () => {
      cancelled = true
    }
  }, [budgetCategoryId])

  // Transacciones del capítulo elegido que todavía no tienen partida.
  const targets = useMemo(
    () =>
      budgetCategoryId
        ? transactions.filter((t) => t.budget_category_id === budgetCategoryId && !t.budget_item_id)
        : [],
    [transactions, budgetCategoryId],
  )

  const selectClass =
    'w-full px-2 py-2 sm:py-1.5 border border-app-border rounded text-sm sm:text-xs bg-app-input-bg text-app-text [color-scheme:light] dark:[color-scheme:dark] focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
  const labelClass = 'text-[11px] sm:text-[10px] font-medium text-app-muted mb-1 sm:mb-0.5 block'

  const canAssign = !!budgetItemId && targets.length > 0 && !saving

  const handleAssign = () => {
    if (!canAssign) return
    onAssign(
      targets.map((t) => t.id),
      budgetItemId,
    )
    setBudgetItemId('')
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-lg p-3 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-app-text">
          <Layers className="w-4 h-4" /> Imputar partida en lote
        </h3>
        <button onClick={onClose} aria-label="Cerrar" className="p-1 text-app-subtle hover:bg-app-hover-strong rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[11px] text-app-muted">
        Asigna una partida a todas las transacciones del capítulo que aún no la tienen. Útil para completar la cobertura
        del costo por partida en transacciones antiguas.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-end">
        <div>
          <label className={labelClass}>Capítulo</label>
          <select
            value={budgetCategoryId}
            onChange={(e) => {
              setBudgetCategoryId(e.target.value)
              setBudgetItemId('')
            }}
            className={selectClass}
          >
            <option value="">—</option>
            {budgetCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Partida</label>
          <select
            value={budgetItemId}
            onChange={(e) => setBudgetItemId(e.target.value)}
            disabled={!budgetCategoryId}
            className={`${selectClass} disabled:opacity-50`}
          >
            <option value="">—</option>
            {budgetItems.map((it) => (
              <option key={it.id} value={it.id}>
                {it.code ? `[${it.code}] ` : ''}
                {it.description}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button
            onClick={handleAssign}
            disabled={!canAssign}
            className="w-full min-h-[40px] sm:min-h-0 px-3 py-2 sm:py-1.5 bg-blue-600 text-white text-sm sm:text-xs font-semibold sm:font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Asignando...' : `Asignar a ${targets.length} transacción${targets.length === 1 ? '' : 'es'}`}
          </button>
        </div>
      </div>
      {budgetCategoryId && targets.length === 0 && (
        <p className="text-[11px] text-app-muted">Todas las transacciones de este capítulo ya tienen partida.</p>
      )}
    </div>
  )
}
