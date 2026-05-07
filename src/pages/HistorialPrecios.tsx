import { useCallback, useMemo, useState } from 'react'
import { PriceHistorySearch } from '@/components/features/priceHistory/PriceHistorySearch'
import { PriceHistorySummary } from '@/components/features/priceHistory/PriceHistorySummary'
import { PriceHistoryTable } from '@/components/features/priceHistory/PriceHistoryTable'
import { usePriceHistory } from '@/hooks/usePriceHistory'

export default function HistorialPrecios() {
  const { history, loading } = usePriceHistory()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search])

  const filtered = useMemo(() => {
    if (!normalizedSearch) return history
    return history.filter((h) => h.key.includes(normalizedSearch) || h.supplier?.toLowerCase().includes(normalizedSearch))
  }, [history, normalizedSearch])

  const trendCounts = useMemo(() => {
    let rising = 0
    let falling = 0
    for (const item of history) {
      if (item.trend === 'up') rising += 1
      if (item.trend === 'down') falling += 1
    }
    return { rising, falling }
  }, [history])

  const handleToggleExpanded = useCallback((key: string) => {
    setExpanded((current) => (current === key ? null : key))
  }, [])

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-app-text">Historial de Precios</h1>
          <p className="text-sm text-app-muted mt-0.5">Evolución de precios de materiales y servicios basado en transacciones</p>
        </div>
      </div>

      <PriceHistorySummary tracked={history.length} rising={trendCounts.rising} falling={trendCounts.falling} />

      <PriceHistorySearch value={search} onChange={setSearch} />

      {loading ? (
        <div className="text-center py-8 text-app-muted text-sm">Analizando transacciones...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-app-muted text-sm">Sin resultados.</div>
      ) : (
        <PriceHistoryTable items={filtered} expanded={expanded} onToggle={handleToggleExpanded} />
      )}
    </div>
  )
}
