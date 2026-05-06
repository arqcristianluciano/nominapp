import { Plus, Trash2 } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { LaborLineItem } from '@/types/database'

interface Props {
  items: LaborLineItem[]
  isDraft: boolean
  total: number
  onOpenAdd: () => void
  onDelete: (itemId: string) => void
}

export function LaborItemsSection({ items, isDraft, total, onOpenAdd, onDelete }: Props) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-medium text-app-text">Mano de obra</h2>{isDraft && <button onClick={onOpenAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover"><Plus className="w-4 h-4" /> Agregar partida</button>}</div>
      {items.length === 0 ? <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center text-sm text-app-subtle">No hay partidas de mano de obra registradas</div> : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-app-bg border-b border-app-border"><th className="text-left px-4 py-2.5 font-medium text-app-muted">Contratista</th><th className="text-left px-4 py-2.5 font-medium text-app-muted">Descripción</th><th className="text-right px-4 py-2.5 font-medium text-app-muted">Cant.</th><th className="text-right px-4 py-2.5 font-medium text-app-muted">Precio</th><th className="text-right px-4 py-2.5 font-medium text-app-muted">Subtotal</th>{isDraft && <th className="w-10" />}</tr></thead>
            <tbody className="divide-y divide-app-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-app-hover">
                  <td className="px-4 py-2.5 text-app-text">{item.contractor?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-app-muted">{item.description}</td>
                  <td className="px-4 py-2.5 text-right text-app-text">{item.quantity.toLocaleString('es-DO')}</td>
                  <td className="px-4 py-2.5 text-right text-app-text">{formatRD(item.unit_price)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-app-text">{formatRD(item.quantity * item.unit_price)}</td>
                  {isDraft && <td className="px-2 py-2.5"><button onClick={() => onDelete(item.id)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg px-4 py-3 flex justify-between items-center"><span className="text-sm font-medium text-blue-800 dark:text-blue-400">Total mano de obra</span><span className="text-sm font-semibold text-blue-800 dark:text-blue-400">{formatRD(total)}</span></div>
    </section>
  )
}
