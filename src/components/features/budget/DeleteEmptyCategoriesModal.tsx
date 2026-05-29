import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { BudgetCategory } from '@/types/database'

interface Props {
  categories: BudgetCategory[]
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Tras importar el presupuesto, pregunta al usuario si desea eliminar las
 * partidas que quedaron vacías (sin subpartidas, sin monto y sin gasto).
 * Nunca borra sin confirmación: el usuario puede conservarlas.
 */
export function DeleteEmptyCategoriesModal({ categories, loading = false, onConfirm, onCancel }: Props) {
  const count = categories.length
  const single = count === 1

  return (
    <Modal open={count > 0} onClose={onCancel} title="" ariaLabel="Eliminar partidas vacías" width="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-app-text">
              {single ? 'Eliminar partida vacía' : `Eliminar ${count} partidas vacías`}
            </h3>
            <p className="text-sm text-app-muted mt-1 leading-relaxed">
              Al importar el presupuesto, {single ? 'esta partida quedó' : 'estas partidas quedaron'} sin subpartidas,
              sin monto y sin gasto. ¿Deseas {single ? 'eliminarla' : 'eliminarlas'}? Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        <ul className="max-h-48 overflow-y-auto rounded-lg border border-app-border divide-y divide-app-border">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm text-app-text">
              <span className="text-xs text-app-subtle w-6 shrink-0 text-right">{c.sort_order}</span>
              <span className="truncate">{c.name}</span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover transition-colors disabled:opacity-50"
          >
            Conservar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Eliminando…' : single ? 'Eliminar partida' : `Eliminar ${count} partidas`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
