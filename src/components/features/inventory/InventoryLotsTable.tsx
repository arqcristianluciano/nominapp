import { AlertTriangle, Layers } from 'lucide-react'
import type { InventoryLotWithItem } from '@/services/lotService'
import { formatNumber } from '@/utils/currency'

// Días de antelación para marcar un lote como "por vencer".
const SOON_DAYS = 30

function expiryState(expiry: string | null): 'none' | 'ok' | 'soon' | 'expired' {
  if (!expiry) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(expiry + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return 'none'
  const days = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= SOON_DAYS) return 'soon'
  return 'ok'
}

export function InventoryLotsTable({ lots }: { lots: InventoryLotWithItem[] }) {
  if (lots.length === 0) {
    return (
      <div className="bg-app-surface rounded-xl border border-app-border p-10 text-center">
        <Layers className="w-7 h-7 text-app-subtle mx-auto mb-2" />
        <p className="text-sm text-app-muted">Aún no hay lotes registrados.</p>
        <p className="text-xs text-app-subtle mt-1">
          Los lotes se crean al recibir mercancía indicando número de lote o fecha de vencimiento.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-app-bg border-b border-app-border text-left text-xs font-semibold text-app-subtle uppercase tracking-wide">
            <th className="px-4 py-3">Material</th>
            <th className="px-4 py-3">Lote</th>
            <th className="px-4 py-3 text-right">Disponible</th>
            <th className="px-4 py-3 hidden sm:table-cell">Recibido</th>
            <th className="px-4 py-3">Vence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {lots.map((lot) => {
            const state = expiryState(lot.expiry_date)
            const badge =
              state === 'expired'
                ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                : state === 'soon'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'text-app-muted'
            return (
              <tr key={lot.id} className="hover:bg-app-hover transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-app-text">{lot.item_name}</span>
                  <span className="text-app-subtle text-xs"> {lot.item_unit}</span>
                </td>
                <td className="px-4 py-3 text-app-muted">
                  {lot.lot_number || <span className="text-app-subtle">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-app-text">{formatNumber(lot.quantity)}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-app-muted">
                  {lot.received_date ?? <span className="text-app-subtle">—</span>}
                </td>
                <td className="px-4 py-3">
                  {lot.expiry_date ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${badge}`}
                    >
                      {(state === 'expired' || state === 'soon') && <AlertTriangle className="w-3 h-3" />}
                      {lot.expiry_date}
                      {state === 'expired' ? ' · vencido' : state === 'soon' ? ' · por vencer' : ''}
                    </span>
                  ) : (
                    <span className="text-app-subtle">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
