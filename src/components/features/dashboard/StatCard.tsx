import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

const ACCENT_STYLES: Record<string, { icon: string; border: string }> = {
  blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300', border: 'border-l-blue-500' },
  emerald: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300', border: 'border-l-emerald-500' },
  red: { icon: 'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300', border: 'border-l-red-500' },
  amber: { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-300', border: 'border-l-amber-500' },
}

interface Props {
  icon: React.ElementType
  label: string
  value: string
  accent: 'blue' | 'emerald' | 'red' | 'amber'
  prev?: number
  invertTrend?: boolean
}

export function StatCard({ icon: Icon, label, value, accent, prev, invertTrend }: Props) {
  const styles = ACCENT_STYLES[accent]
  const current = parseFloat(value.replace(/[^0-9.]/g, ''))

  let trendEl: React.ReactNode = null
  if (prev !== undefined && prev !== 0) {
    const change = ((current - prev) / Math.abs(prev)) * 100
    const isPositive = invertTrend ? change < 0 : change > 0
    const isNeutral = Math.abs(change) < 0.5
    const color = isNeutral ? 'text-app-muted' : isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
    const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
    trendEl = (
      <div className={`mt-1 flex items-center gap-0.5 text-[11px] font-semibold ${color}`}>
        <TrendIcon className="h-3 w-3" />
        <span>{Math.abs(change).toFixed(0)}% vs mes ant.</span>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-app-border border-l-4 bg-app-surface p-4 shadow-xs ${styles.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-xs font-medium text-app-muted">{label}</p>
          <p className="truncate text-xl font-bold text-app-text">{value}</p>
          {trendEl}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </div>
  )
}
