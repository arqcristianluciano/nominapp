import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { MaterialHistory } from './priceHistoryTypes'

export function PriceHistoryTable({
  items,
  expanded,
  onToggle,
}: {
  items: MaterialHistory[]
  expanded: string | null
  onToggle: (key: string) => void
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-app-hover/50 text-xs text-app-muted">
          <th className="text-left px-4 py-2.5 font-medium">Material / Proveedor</th><th className="text-right px-4 py-2.5 font-medium">Precio actual</th><th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">Promedio</th><th className="text-right px-4 py-2.5 font-medium hidden md:table-cell">Mín / Máx</th><th className="text-center px-4 py-2.5 font-medium">Tendencia</th><th className="text-center px-4 py-2.5 font-medium hidden sm:table-cell">Registros</th>
        </tr></thead>
        <tbody className="divide-y divide-app-border">
          {items.map((history) => (
            <PriceHistoryRow key={history.key} history={history} expanded={expanded === history.key} onToggle={() => onToggle(history.key)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PriceHistoryRow({
  history,
  expanded,
  onToggle,
}: {
  history: MaterialHistory
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr onClick={onToggle} className="hover:bg-app-hover/50 cursor-pointer">
        <td className="px-4 py-3"><p className="font-medium text-app-text capitalize">{history.supplier ?? history.entries[0]?.description ?? history.key}</p>{history.supplier && <p className="text-xs text-app-muted truncate">{history.entries[0]?.description}</p>}</td>
        <td className="px-4 py-3 text-right font-semibold text-app-text">{formatRD(history.latestPrice)}</td>
        <td className="px-4 py-3 text-right text-app-muted hidden sm:table-cell">{formatRD(history.avgPrice)}</td>
        <td className="px-4 py-3 text-right text-xs hidden md:table-cell"><span className="text-green-600">{formatRD(history.minPrice)}</span><span className="text-app-subtle mx-1">/</span><span className="text-red-600">{formatRD(history.maxPrice)}</span></td>
        <td className="px-4 py-3 text-center">{history.trend === 'up' ? <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold"><TrendingUp className="w-3.5 h-3.5" />+{history.trendPct.toFixed(1)}%</span> : history.trend === 'down' ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold"><TrendingDown className="w-3.5 h-3.5" />{history.trendPct.toFixed(1)}%</span> : <span className="inline-flex items-center gap-1 text-app-muted text-xs"><Minus className="w-3.5 h-3.5" />Estable</span>}</td>
        <td className="px-4 py-3 text-center text-app-muted text-xs hidden sm:table-cell">{history.entries.length}</td>
      </tr>
      {expanded && (
        <tr className="bg-app-hover/20">
          <td colSpan={6} className="px-4 py-3">
            <p className="text-xs font-semibold text-app-muted mb-2 uppercase tracking-wide">Historial de precios</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-app-subtle"><th className="text-left py-1 pr-4">Fecha</th><th className="text-right py-1 pr-4">Precio unitario</th><th className="text-right py-1 pr-4">Cantidad</th><th className="text-left py-1">Proyecto</th></tr></thead>
                <tbody>
                  {history.entries.map((entry, index) => {
                    const prev = index > 0 ? history.entries[index - 1].unit_price : null
                    const change = prev ? ((entry.unit_price - prev) / prev) * 100 : null
                    return (
                      <tr key={`${history.key}-${index}`} className="border-t border-app-border/30">
                        <td className="py-1 pr-4 text-app-muted">{new Date(entry.date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="py-1 pr-4 text-right font-semibold text-app-text">{formatRD(entry.unit_price)}{change !== null && <span className={`ml-1.5 ${change > 0 ? 'text-red-500' : change < 0 ? 'text-green-500' : 'text-app-subtle'}`}>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>}</td>
                        <td className="py-1 pr-4 text-right text-app-muted">{entry.quantity > 0 ? entry.quantity : '—'}</td>
                        <td className="py-1 text-app-muted truncate max-w-[200px]">{entry.project}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
