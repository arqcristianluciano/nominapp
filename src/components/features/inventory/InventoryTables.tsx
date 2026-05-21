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
  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-app-hover/50 text-xs text-app-muted">
          <th className="text-left px-4 py-2.5 font-medium">Material</th><th className="text-center px-4 py-2.5 font-medium">Unidad</th><th className="text-right px-4 py-2.5 font-medium">Stock</th><th className="text-right px-4 py-2.5 font-medium">Mínimo</th><th className="text-right px-4 py-2.5 font-medium">Costo unit.</th><th className="text-right px-4 py-2.5 font-medium">Valor total</th><th className="px-4 py-2.5" />
        </tr></thead>
        <tbody className="divide-y divide-app-border">
          {items.map((item) => {
            const isLow = item.current_stock <= item.min_stock
            return (
              <tr key={item.id} className={`hover:bg-app-hover/50 ${isLow ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}>
                <td className="px-4 py-3 font-medium text-app-text"><div className="flex items-center gap-2">{isLow && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}{item.name}</div></td>
                <td className="px-4 py-3 text-center text-app-muted">{item.unit}</td>
                <td className={`px-4 py-3 text-right font-bold ${isLow ? 'text-yellow-600' : 'text-app-text'}`}>{item.current_stock}</td>
                <td className="px-4 py-3 text-right text-app-muted">{item.min_stock}</td>
                <td className="px-4 py-3 text-right text-app-muted">{formatRD(item.unit_cost)}</td>
                <td className="px-4 py-3 text-right font-semibold text-app-text">{formatRD(round2(mul(item.current_stock, item.unit_cost)))}</td>
                <td className="px-4 py-3"><button onClick={() => setDeleteId(item.id)} aria-label={`Eliminar material ${item.name}`} className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
            )
          })}
          {items.length > 0 && <tr className="bg-app-hover/30 font-semibold text-sm"><td colSpan={5} className="px-4 py-2.5 text-app-muted">Total en inventario</td><td className="px-4 py-2.5 text-right text-app-text">{formatRD(round2(items.reduce((sum, item) => sum + round2(mul(item.current_stock, item.unit_cost)), 0)))}</td><td /></tr>}
        </tbody>
      </table>
      {items.length === 0 && <div className="text-center py-8 text-app-muted text-sm">Sin materiales registrados.</div>}
      <ConfirmModal
        open={!!deleteId}
        title="Eliminar material"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => { if (deleteId) onDelete(deleteId) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

export function InventoryMovementsTable({ movements }: { movements: InventoryMovement[] }) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-app-hover/50 text-xs text-app-muted">
          <th className="text-left px-4 py-2.5 font-medium">Fecha</th><th className="text-left px-4 py-2.5 font-medium">Material</th><th className="text-center px-4 py-2.5 font-medium">Tipo</th><th className="text-right px-4 py-2.5 font-medium">Cantidad</th><th className="text-left px-4 py-2.5 font-medium">Notas</th>
        </tr></thead>
        <tbody className="divide-y divide-app-border">
          {movements.map((movement) => (
            <tr key={movement.id} className="hover:bg-app-hover/50">
              <td className="px-4 py-3 text-app-muted whitespace-nowrap">{new Date(movement.date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}</td>
              <td className="px-4 py-3 text-app-text">{movement.item?.name ?? '—'}</td>
              <td className="px-4 py-3 text-center">{movement.type === 'in' ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><ArrowDownCircle className="w-3.5 h-3.5" />Entrada</span> : <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"><ArrowUpCircle className="w-3.5 h-3.5" />Salida</span>}</td>
              <td className={`px-4 py-3 text-right font-semibold ${movement.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>{movement.type === 'in' ? '+' : '-'}{movement.quantity} {movement.item?.unit ?? ''}</td>
              <td className="px-4 py-3 text-app-muted text-xs">{movement.notes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {movements.length === 0 && <div className="text-center py-8 text-app-muted text-sm">Sin movimientos registrados.</div>}
    </div>
  )
}
