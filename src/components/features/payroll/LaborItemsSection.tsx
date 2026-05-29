import { memo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { BudgetCategory, LaborLineItem } from '@/types/database'

interface Props {
  items: LaborLineItem[]
  isDraft: boolean
  total: number
  budgetCategories?: BudgetCategory[]
  onOpenAdd: () => void
  onDelete: (itemId: string) => void
  onUpdateImputation?: (itemId: string, budgetCategoryId: string | null) => void
}

interface LaborItemRowProps {
  item: LaborLineItem
  isDraft: boolean
  budgetCategories: BudgetCategory[]
  onDelete: (itemId: string) => void
  onUpdateImputation?: (itemId: string, budgetCategoryId: string | null) => void
}

function ChapterSelect({
  item,
  budgetCategories,
  onUpdateImputation,
  className,
}: {
  item: LaborLineItem
  budgetCategories: BudgetCategory[]
  onUpdateImputation?: (itemId: string, budgetCategoryId: string | null) => void
  className?: string
}) {
  return (
    <select
      value={item.budget_category_id ?? ''}
      onChange={(e) => onUpdateImputation?.(item.id, e.target.value || null)}
      aria-label="Capítulo imputado"
      className={`bg-app-input-bg text-app-text border border-app-border rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className ?? ''}`}
    >
      <option value="">— Sin imputación —</option>
      {budgetCategories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.code} {c.name}
        </option>
      ))}
    </select>
  )
}

function chapterLabel(item: LaborLineItem, budgetCategories: BudgetCategory[]): string {
  if (!item.budget_category_id) return '—'
  const cat = budgetCategories.find((c) => c.id === item.budget_category_id)
  return cat ? `${cat.code} ${cat.name}` : '—'
}

function LaborItemMobileCardComponent({
  item,
  isDraft,
  budgetCategories,
  onDelete,
  onUpdateImputation,
}: LaborItemRowProps) {
  return (
    <li className="bg-app-surface rounded-xl border border-app-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-app-text truncate">{item.contractor?.name || '—'}</p>
          <p className="text-xs text-app-muted mt-0.5 break-words">{item.description}</p>
        </div>
        {isDraft && (
          <button
            onClick={() => onDelete(item.id)}
            aria-label="Eliminar partida"
            className="shrink-0 inline-flex items-center justify-center w-11 h-11 -mr-2 -mt-2 text-app-subtle hover:text-red-500 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-app-subtle">Cant.</div>
          <div className="text-app-text">{item.quantity.toLocaleString('es-DO')}</div>
        </div>
        <div>
          <div className="text-app-subtle">Precio</div>
          <div className="text-app-text">{formatRD(item.unit_price)}</div>
        </div>
        <div className="text-right">
          <div className="text-app-subtle">Subtotal</div>
          <div className="font-medium text-app-text">{formatRD(item.quantity * item.unit_price)}</div>
        </div>
      </div>
      {budgetCategories.length > 0 && (
        <div className="mt-2 text-xs">
          <div className="text-app-subtle mb-1">Capítulo imputado</div>
          {isDraft ? (
            <ChapterSelect
              item={item}
              budgetCategories={budgetCategories}
              onUpdateImputation={onUpdateImputation}
              className="w-full"
            />
          ) : (
            <div className="text-app-text">{chapterLabel(item, budgetCategories)}</div>
          )}
        </div>
      )}
    </li>
  )
}
LaborItemMobileCardComponent.displayName = 'LaborItemMobileCard'
const LaborItemMobileCard = memo(LaborItemMobileCardComponent)

function LaborItemRowComponent({ item, isDraft, budgetCategories, onDelete, onUpdateImputation }: LaborItemRowProps) {
  const showChapter = budgetCategories.length > 0
  return (
    <tr className="hover:bg-app-hover">
      <td className="px-4 py-2.5 text-app-text">{item.contractor?.name || '—'}</td>
      <td className="px-4 py-2.5 text-app-muted">{item.description}</td>
      {showChapter && (
        <td className="px-4 py-2.5 text-app-muted">
          {isDraft ? (
            <ChapterSelect item={item} budgetCategories={budgetCategories} onUpdateImputation={onUpdateImputation} />
          ) : (
            chapterLabel(item, budgetCategories)
          )}
        </td>
      )}
      <td className="px-4 py-2.5 text-right text-app-text">{item.quantity.toLocaleString('es-DO')}</td>
      <td className="px-4 py-2.5 text-right text-app-text">{formatRD(item.unit_price)}</td>
      <td className="px-4 py-2.5 text-right font-medium text-app-text">{formatRD(item.quantity * item.unit_price)}</td>
      {isDraft && (
        <td className="px-2 py-2.5">
          <button
            onClick={() => onDelete(item.id)}
            aria-label="Eliminar partida"
            className="inline-flex items-center justify-center w-8 h-8 text-app-subtle hover:text-red-500 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
    </tr>
  )
}
LaborItemRowComponent.displayName = 'LaborItemRow'
const LaborItemRow = memo(LaborItemRowComponent)

export function LaborItemsSection({
  items,
  isDraft,
  total,
  budgetCategories = [],
  onOpenAdd,
  onDelete,
  onUpdateImputation,
}: Props) {
  const showChapter = budgetCategories.length > 0
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-medium text-app-text">Mano de obra</h2>
        {isDraft && (
          <button
            onClick={onOpenAdd}
            aria-label="Agregar partida"
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover min-h-[44px] sm:min-h-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Agregar partida</span>
            <span className="sm:hidden">Agregar</span>
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center text-sm text-app-subtle">
          No hay partidas de mano de obra registradas
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="sm:hidden space-y-2">
            {items.map((item) => (
              <LaborItemMobileCard
                key={item.id}
                item={item}
                isDraft={isDraft}
                budgetCategories={budgetCategories}
                onDelete={onDelete}
                onUpdateImputation={onUpdateImputation}
              />
            ))}
          </ul>
          {/* Desktop / tablet table */}
          <div className="hidden sm:block bg-app-surface rounded-xl border border-app-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-app-bg border-b border-app-border">
                    <th className="text-left px-4 py-2.5 font-medium text-app-muted">Contratista</th>
                    <th className="text-left px-4 py-2.5 font-medium text-app-muted">Descripción</th>
                    {showChapter && <th className="text-left px-4 py-2.5 font-medium text-app-muted">Capítulo</th>}
                    <th className="text-right px-4 py-2.5 font-medium text-app-muted">Cant.</th>
                    <th className="text-right px-4 py-2.5 font-medium text-app-muted">Precio</th>
                    <th className="text-right px-4 py-2.5 font-medium text-app-muted">Subtotal</th>
                    {isDraft && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {items.map((item) => (
                    <LaborItemRow
                      key={item.id}
                      item={item}
                      isDraft={isDraft}
                      budgetCategories={budgetCategories}
                      onDelete={onDelete}
                      onUpdateImputation={onUpdateImputation}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <div className="mt-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-medium text-blue-800 dark:text-blue-400">Total mano de obra</span>
        <span className="text-sm font-semibold text-blue-800 dark:text-blue-400">{formatRD(total)}</span>
      </div>
    </section>
  )
}
