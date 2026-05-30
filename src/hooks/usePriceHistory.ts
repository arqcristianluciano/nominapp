import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { MaterialHistory, PriceEntry } from '@/components/features/priceHistory/priceHistoryTypes'

interface ProjectLite {
  id: string
  name: string
}

interface TxnLite {
  description: string
  unit_price: number
  quantity: number | null
  date: string
  project_id: string
  supplier?: { name?: string | null } | null
}

export function usePriceHistory() {
  const [history, setHistory] = useState<MaterialHistory[]>([])
  const [loading, setLoading] = useState(true)
  const { error: toastError } = useToast()

  useEffect(() => {
    let cancelled = false
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
        if (cancelled) return
        if (txnRes.error) {
          console.warn('[usePriceHistory] transactions query fallo', txnRes.error)
          toastError('No se pudo cargar el historial de precios')
        }
        if (projectRes.error) {
          console.warn('[usePriceHistory] projects query fallo', projectRes.error)
          toastError('No se pudo cargar la lista de proyectos')
        }
        if (txnRes.error || projectRes.error) {
          setHistory([])
          return
        }
        const projectMap: Record<string, string> = Object.fromEntries(
          ((projectRes.data ?? []) as ProjectLite[]).map((project) => [project.id, project.name]),
        )
        const grouped: Record<string, PriceEntry[]> = {}
        for (const txn of (txnRes.data ?? []) as TxnLite[]) {
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
          .map(([key, entries]) => {
            const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
            const prices = sorted.map((entry) => entry.unit_price)
            const latestPrice = prices[prices.length - 1]
            const prevPrice = prices.length > 1 ? prices[prices.length - 2] : latestPrice
            const trendPct = prevPrice > 0 ? ((latestPrice - prevPrice) / prevPrice) * 100 : 0
            const trend: 'up' | 'down' | 'stable' = trendPct > 1 ? 'up' : trendPct < -1 ? 'down' : 'stable'
            return {
              key,
              supplier: sorted[sorted.length - 1].supplier,
              entries: sorted,
              latestPrice,
              avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
              minPrice: Math.min(...prices),
              maxPrice: Math.max(...prices),
              trend,
              trendPct,
            }
          })
          .sort((a, b) => b.entries.length - a.entries.length)
        if (!cancelled) setHistory(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadData()
    return () => {
      cancelled = true
    }
  }, [toastError])

  return { history, loading }
}
