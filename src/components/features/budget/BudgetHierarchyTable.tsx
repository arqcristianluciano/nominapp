import { formatRD } from '@/utils/currency'
import BudgetPartidaRow from './BudgetPartidaRow'
import type { BudgetCategory, BudgetItem } from '@/types/database'

interface BudgetRow {
  category: BudgetCategory
  spent: number
  budgeted: number
}

export function BudgetHierarchyTable({
  loading,
  rows,
  spentTotal,
  budgetedTotal,
  itemsByCategory,
  priceList,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onEditBudgetAmount,
  onDeleteCategory,
}: {
  loading: boolean
  rows: BudgetRow[]
  spentTotal: number
  budgetedTotal: number
  itemsByCategory: Record<string, BudgetItem[]>
  priceList: unknown[]
  onAddItem: (data: Omit<BudgetItem, 'id'>) => Promise<void>
  onUpdateItem: (id: string, categoryId: string, changes: Partial<Omit<BudgetItem, 'id'>>) => Promise<void>
  onDeleteItem: (id: string, categoryId: string) => Promise<void>
  onEditBudgetAmount: (categoryId: string, amount: number) => void
  onDeleteCategory?: (categoryId: string) => Promise<void>
}) {
  if (loading) return <div className="text-sm text-app-muted">Cargando presupuesto...</div>
  const diff = budgetedTotal - spentTotal

  const thClass = 'px-3 py-2 text-right text-[10px] font-semibold text-app-muted uppercase'
  const tdTotalClass = 'px-3 py-3 text-xs font-bold text-app-text text-right'

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className="px-3 py-2 w-8" />
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">
              Partida / Subpartida
            </th>
            <th className={thClass}>Gastado</th>
            <th className={thClass}>Presupuesto</th>
            <th className={thClass}>Diferencia</th>
            <th className="px-3 py-2 w-20" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <BudgetPartidaRow
              key={row.category.id}
              category={row.category}
              items={itemsByCategory[row.category.id] ?? []}
              spent={row.spent}
              priceList={priceList as never[]}
              onAddItem={onAddItem}
              onUpdateItem={(id, changes) => onUpdateItem(id, row.category.id, changes)}
              onDeleteItem={(id) => onDeleteItem(id, row.category.id)}
              onEditBudgetAmount={() => onEditBudgetAmount(row.category.id, row.budgeted)}
              onDeleteCategory={onDeleteCategory ? () => onDeleteCategory(row.category.id) : undefined}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-app-bg border-t-2 border-app-border">
            <td colSpan={2} className="px-3 py-3 text-xs font-bold text-app-text pl-11">
              TOTAL
            </td>
            <td className={tdTotalClass}>{formatRD(spentTotal)}</td>
            <td className={tdTotalClass}>{formatRD(budgetedTotal)}</td>
            <td className={`px-3 py-3 text-xs font-bold text-right ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatRD(diff)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
