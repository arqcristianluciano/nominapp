import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatRD } from '@/utils/currency'

interface PriceEntry {
  date: string
  description: string
  unit_price: number
  quantity: number
  supplier: string | null
  project: string
}

interface MaterialHistory {
  key: string
  supplier: string | null
  entries: PriceEntry[]
  latestPrice: number
  avgPrice: number
  minPrice: number
  maxPrice: number
  trend: 'up' | 'down' | 'stable'
  trendPct: number
}

export default function HistorialPrecios() {
  const [history, setHistory] = useState<MaterialHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [txnRes, projectRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('description, unit_price, quantity, date, project_id, supplier:suppliers(name)')
          .order('date', { ascending: true })
          .limit(500),
        supabase.from('projects').select('id, name'),
      ])

      const projectMap: Record<string, string> = Object.fromEntries(
        (projectRes.data ?? []).map((p: any) => [p.id, p.name])
      )

      const grouped: Record<string, PriceEntry[]> = {}
      for (const txn of (txnRes.data ?? []) as any[]) {
        if (!txn.unit_price || txn.unit_price <= 0) continue
        const key = `${(txn.supplier?.name ?? txn.description).toLowerCase().trim()}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push({
          date: txn.date,
          description: txn.description,
          unit_price: txn.unit_price,
          quantity: txn.quantity ?? 0,
          supplier: txn.supplier?.name ?? null,
          project: projectMap[txn.project_id] ?? 'Proyecto',
        })
      }

      const result: MaterialHistory[] = Object.entries(grouped)
        .filter(([, entries]) => entries.length >= 1)
        .map(([key, entries]) => {
          const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
          const prices = sorted.map((e) => e.unit_price)
          const latestPrice = prices[prices.length - 1]
          const prevPrice = prices.length > 1 ? prices[prices.length - 2] : latestPrice
          const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length
          const minPrice = Math.min(...prices)
          const maxPrice = Math.max(...prices)
          const trendPct = prevPrice > 0 ? ((latestPrice - prevPrice) / prevPrice) * 100 : 0
          const trend: 'up' | 'down' | 'stable' = trendPct > 1 ? 'up' : trendPct < -1 ? 'down' : 'stable'

          return {
            key,
            supplier: sorted[sorted.length - 1].supplier,
            entries: sorted,
            latestPrice,
            avgPrice,
            minPrice,
            maxPrice,
            trend,
            trendPct,
          }
        })
        .sort((a, b) => b.entries.length - a.entries.length)

      setHistory(result)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return history
    const q = search.toLowerCase()
    return history.filter((h) => h.key.includes(q) || h.supplier?.toLowerCase().includes(q))
  }, [history, search])

  const rising = history.filter((h) => h.trend === 'up').length
  const falling = history.filter((h) => h.trend === 'down').length

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-app-text">Historial de Precios</h1>
          <p className="text-sm text-app-muted mt-0.5">Evolución de precios de materiales y servicios basado en transacciones</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Materiales rastreados</p>
          <p className="text-2xl font-bold text-app-text">{history.length}</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-app-muted">En alza</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{rising}</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-app-muted">En baja</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{falling}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar material o proveedor..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-app-border rounded-xl bg-app-surface text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="text-center py-8 text-app-muted text-sm">Analizando transacciones...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-app-muted text-sm">Sin resultados.</div>
      ) : (
        <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-hover/50 text-xs text-app-muted">
                <th className="text-left px-4 py-2.5 font-medium">Material / Proveedor</th>
                <th className="text-right px-4 py-2.5 font-medium">Precio actual</th>
                <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">Promedio</th>
                <th className="text-right px-4 py-2.5 font-medium hidden md:table-cell">Mín / Máx</th>
                <th className="text-center px-4 py-2.5 font-medium">Tendencia</th>
                <th className="text-center px-4 py-2.5 font-medium hidden sm:table-cell">Registros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filtered.map((h) => (
                <>
                  <tr key={h.key} onClick={() => setExpanded(expanded === h.key ? null : h.key)}
                    className="hover:bg-app-hover/50 cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-medium text-app-text capitalize">{h.supplier ?? h.entries[0]?.description ?? h.key}</p>
                      {h.supplier && <p className="text-xs text-app-muted truncate">{h.entries[0]?.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-app-text">{formatRD(h.latestPrice)}</td>
                    <td className="px-4 py-3 text-right text-app-muted hidden sm:table-cell">{formatRD(h.avgPrice)}</td>
                    <td className="px-4 py-3 text-right text-xs hidden md:table-cell">
                      <span className="text-green-600">{formatRD(h.minPrice)}</span>
                      <span className="text-app-subtle mx-1">/</span>
                      <span className="text-red-600">{formatRD(h.maxPrice)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {h.trend === 'up' && (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
                          <TrendingUp className="w-3.5 h-3.5" />+{h.trendPct.toFixed(1)}%
                        </span>
                      )}
                      {h.trend === 'down' && (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                          <TrendingDown className="w-3.5 h-3.5" />{h.trendPct.toFixed(1)}%
                        </span>
                      )}
                      {h.trend === 'stable' && (
                        <span className="inline-flex items-center gap-1 text-app-muted text-xs">
                          <Minus className="w-3.5 h-3.5" />Estable
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-app-muted text-xs hidden sm:table-cell">{h.entries.length}</td>
                  </tr>
                  {expanded === h.key && (
                    <tr key={`${h.key}-detail`} className="bg-app-hover/20">
                      <td colSpan={6} className="px-4 py-3">
                        <p className="text-xs font-semibold text-app-muted mb-2 uppercase tracking-wide">Historial de precios</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-app-subtle">
                                <th className="text-left py-1 pr-4">Fecha</th>
                                <th className="text-right py-1 pr-4">Precio unitario</th>
                                <th className="text-right py-1 pr-4">Cantidad</th>
                                <th className="text-left py-1">Proyecto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {h.entries.map((e, i) => {
                                const prev = i > 0 ? h.entries[i - 1].unit_price : null
                                const change = prev ? ((e.unit_price - prev) / prev) * 100 : null
                                return (
                                  <tr key={i} className="border-t border-app-border/30">
                                    <td className="py-1 pr-4 text-app-muted">{new Date(e.date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="py-1 pr-4 text-right font-semibold text-app-text">
                                      {formatRD(e.unit_price)}
                                      {change !== null && (
                                        <span className={`ml-1.5 ${change > 0 ? 'text-red-500' : change < 0 ? 'text-green-500' : 'text-app-subtle'}`}>
                                          {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-1 pr-4 text-right text-app-muted">{e.quantity > 0 ? e.quantity : '—'}</td>
                                    <td className="py-1 text-app-muted truncate max-w-[200px]">{e.project}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
