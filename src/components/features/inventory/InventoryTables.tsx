import { useState } from 'react'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import { mul, round2 } from '@/utils/money'
import type { InventoryItem, InventoryMovement } from '@/services/inventoryService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export function InventoryStockTable({
  items,
  onDelete,
}: {
  items: InventoryItem[]
  onDelete: (itemId: string) => void
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const totalValue = round2(
    items.reduce((sum, item) => sum + round2(mul(item.current_stock, item.unit_cost)), 0),
  )

  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      {/* Mobile: card list */}
      <ul className="sm:hidden divide-y divide-app-border">
        {items.map((item) => {
          const isLow = item.current_stock <= item.min_stock
          const totalRow = round2(mul(item.current_stock, item.unit_cost))
          return (
            <li
              key={item.id}
              className={`p-3 ${isLow ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  {isLow && (
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-app-text break-words">{item.name}</div>
                    <div className="text-[11px] text-app-muted mt-0.5">Unidad: {item.unit}</div>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(item.id)}
                  aria-label={`Eliminar material ${item.name}`}
                  className="p-2 -mr-1 text-app-subtle hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div>
                  <dt className="text-app-subtle">Stock</dt>
                  <dd className={`font-bold ${isLow ? 'text-yellow-600' : 'text-app-text'}`}>
                    {item.current_stock} {item.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-app-subtle">Mínimo</dt>
                  <dd className="text-app-muted">{item.min_stock}</dd>
                </div>
                <div>
                  <dt className="text-app-subtle">Costo unit.</dt>
                  <dd className="text-app-muted">{formatRD(item.unit_cost)}</dd>
                </div>
                <div>
                  <dt className="text-app-subtle">Valor total</dt>
                  <dd className="font-semibold text-app-text">{formatRD(totalRow)}</dd>
                </div>
              </dl>
            </li>
          )
        })}
        {items.length > 0 && (
          <li className="p-3 bg-app-hover/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-app-muted">Total inventario</span>
            <span className="text-sm font-semibold text-app-text">{formatRD(totalValue)}</span>
          </li>
        )}
      </ul>

      {/* Desktop: regular table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-hover/50 text-xs text-app-muted">
              <th className="text-left px-4 py-2.5 font-medium">Material</th>
              <th className="text-center px-4 py-2.5 font-medium">Unidad</th>
              <th className="text-right px-4 py-2.5 font-medium">Stock</th>
              <th className="text-right px-4 py-2.5 font-medium">Mínimo</th>
              <th className="text-right px-4 py-2.5 font-medium">Costo unit.</th>
              <th className="text-right px-4 py-2.5 font-medium">Valor total</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {items.map((item) => {
              const isLow = item.current_stock <= item.min_stock
              return (
                <tr
                  key={item.id}
                  className={`hover:bg-app-hover/50 ${isLow ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-app-text">
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                      {item.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-app-muted">{item.unit}</td>
                  <td className={`px-4 py-3 text-right font-bold ${isLow ? 'text-yellow-600' : 'text-app-text'}`}>
                    {item.current_stock}
                  </td>
                  <td className="px-4 py-3 text-right text-app-muted">{item.min_stock}</td>
                  <td className="px-4 py-3 text-right text-app-muted">{formatRD(item.unit_cost)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-app-text">
                    {formatRD(round2(mul(item.current_stock, item.unit_cost)))}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteId(item.id)}
                      aria-label={`Eliminar material ${item.name}`}
                      className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {items.length > 0 && (
              <tr className="bg-app-hover/30 font-semibold text-sm">
                <td colSpan={5} className="px-4 py-2.5 text-app-muted">
                  Total en inventario
                </td>
                <td className="px-4 py-2.5 text-right text-app-text">{formatRD(totalValue)}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-app-muted text-sm">Sin materiales registrados.</div>
      )}
      <ConfirmModal
        open={!!deleteId}
        title="Eliminar material"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteId) onDelete(deleteId)
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

export function InventoryMovementsTable({ movements }: { movements: InventoryMovement[] }) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      {/* Mobile: card list */}
      <ul className="sm:hidden divide-y divide-app-border">
        {movements.map((movement) => {
          const isIn = movement.type === 'in'
          return (
            <li key={movement.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-app-text break-words">
                    {movement.item?.name ?? '—'}
                  </div>
                  <div className="text-[11px] text-app-muted mt-0.5">
                    {new Date(movement.date + 'T12:00:00').toLocaleDateString('es-DO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    isIn
                      ? 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-950/40'
                      : 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40'
                  }`}
                >
                  {isIn ? (
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                  )}
                  {isIn ? 'Entrada' : 'Salida'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs text-app-subtle">Cantidad</span>
                <span className={`font-semibold ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                  {isIn ? '+' : '-'}
                  {movement.quantity} {movement.item?.unit ?? ''}
                </span>
              </div>
              {movement.notes && (
                <div className="text-xs text-app-muted bg-app-hover/40 rounded-md px-2 py-1.5 break-words">
                  {movement.notes}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Desktop: regular table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-hover/50 text-xs text-app-muted">
              <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
              <th className="text-left px-4 py-2.5 font-medium">Material</th>
              <th className="text-center px-4 py-2.5 font-medium">Tipo</th>
              <th className="text-right px-4 py-2.5 font-medium">Cantidad</th>
              <th className="text-left px-4 py-2.5 font-medium">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {movements.map((movement) => (
              <tr key={movement.id} className="hover:bg-app-hover/50">
                <td className="px-4 py-3 text-app-muted whitespace-nowrap">
                  {new Date(movement.date + 'T12:00:00').toLocaleDateString('es-DO', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </td>
                <td className="px-4 py-3 text-app-text">{movement.item?.name ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  {movement.type === 'in' ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      Entrada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      Salida
                    </span>
                  )}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    movement.type === 'in' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {movement.type === 'in' ? '+' : '-'}
                  {movement.quantity} {movement.item?.unit ?? ''}
                </td>
                <td className="px-4 py-3 text-app-muted text-xs">{movement.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {movements.length === 0 && (
        <div className="text-center py-8 text-app-muted text-sm">Sin movimientos registrados.</div>
      )}
    </div>
  )
}
