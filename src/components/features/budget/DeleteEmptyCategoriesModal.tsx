import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { BudgetCategory } from '@/types/database'

interface Props {
  open: boolean
  categories: BudgetCategory[]
  loading?: boolean
  onConfirm: (ids: string[]) => void
  onCancel: () => void
}

/**
 * Pregunta al usuario si desea eliminar las partidas que quedaron vacías
 * (sin subpartidas, sin monto y sin gasto). Permite elegir cuáles eliminar con
 * checkboxes y nunca borra sin confirmación: el usuario puede conservarlas.
 */
export function DeleteEmptyCategoriesModal({ open, categories, loading = false, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title="" ariaLabel="Eliminar partidas vacías" width="max-w-md">
      {/* La key reinicia la selección (todas marcadas) cuando cambia el conjunto. */}
      <EmptyCategoryPicker
        key={categories.map((c) => c.id).join(',')}
        categories={categories}
        loading={loading}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Modal>
  )
}

function EmptyCategoryPicker({
  categories,
  loading,
  onConfirm,
  onCancel,
}: {
  categories: BudgetCategory[]
  loading: boolean
  onConfirm: (ids: string[]) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(categories.map((c) => c.id)))

  const total = categories.length
  const selectedCount = categories.reduce((n, c) => (selected.has(c.id) ? n + 1 : n), 0)
  const allSelected = total > 0 && selectedCount === total

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => setSelected(allSelected ? new Set<string>() : new Set(categories.map((c) => c.id)))

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-app-text">
            {total === 1 ? 'Partida vacía' : `${total} partidas vacías`}
          </h3>
          <p className="text-sm text-app-muted mt-1 leading-relaxed">
            Quedaron sin subpartidas, sin monto y sin gasto. Elige cuáles eliminar. Esta acción no se puede deshacer.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-app-border overflow-hidden">
        <label className="flex items-center gap-2 px-3 py-2 border-b border-app-border bg-app-bg cursor-pointer">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-red-600" />
          <span className="text-xs font-medium text-app-muted">
            Seleccionar todas ({selectedCount}/{total})
          </span>
        </label>
        <ul className="max-h-48 overflow-y-auto divide-y divide-app-border">
          {categories.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 px-3 py-2 text-sm text-app-text cursor-pointer hover:bg-app-hover">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="accent-red-600"
                />
                <span className="text-xs text-app-subtle w-6 shrink-0 text-right">{c.sort_order}</span>
                <span className="truncate">{c.name}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover transition-colors disabled:opacity-50"
        >
          Conservar
        </button>
        <button
          onClick={() => onConfirm(categories.filter((c) => selected.has(c.id)).map((c) => c.id))}
          disabled={loading || selectedCount === 0}
          className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Eliminando…' : selectedCount <= 1 ? 'Eliminar partida' : `Eliminar ${selectedCount} partidas`}
        </button>
      </div>
    </div>
  )
}
