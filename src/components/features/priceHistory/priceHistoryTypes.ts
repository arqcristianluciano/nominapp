export interface PriceEntry {
  date: string
  description: string
  unit_price: number
  quantity: number
  supplier: string | null
  project: string
}

export interface MaterialHistory {
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
