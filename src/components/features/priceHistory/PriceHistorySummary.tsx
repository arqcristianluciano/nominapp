import { TrendingDown, TrendingUp } from 'lucide-react'

export function PriceHistorySummary({
  tracked,
  rising,
  falling,
}: {
  tracked: number
  rising: number
  falling: number
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-app-surface border border-app-border rounded-xl p-4"><p className="text-xs text-app-muted mb-1">Materiales rastreados</p><p className="text-2xl font-bold text-app-text">{tracked}</p></div>
      <div className="bg-app-surface border border-app-border rounded-xl p-4"><div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-3.5 h-3.5 text-red-500" /><p className="text-xs text-app-muted">En alza</p></div><p className="text-2xl font-bold text-red-600">{rising}</p></div>
      <div className="bg-app-surface border border-app-border rounded-xl p-4"><div className="flex items-center gap-1.5 mb-1"><TrendingDown className="w-3.5 h-3.5 text-green-500" /><p className="text-xs text-app-muted">En baja</p></div><p className="text-2xl font-bold text-green-600">{falling}</p></div>
    </div>
  )
}
