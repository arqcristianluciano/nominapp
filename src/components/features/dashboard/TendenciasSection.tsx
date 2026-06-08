/**
 * TendenciasSection – Sección de gráficas de tendencia en el Dashboard global.
 * Muestra el gasto mensual consolidado de todos los proyectos (últimos 12 meses).
 */

import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { dashboardService } from '@/services/dashboardService'
import { BarChart } from '@/components/ui/charts/BarChart'
import { cashFlowToSeries, lastNMonths, monthLabel } from '@/utils/trendHelpers'
import { formatRD } from '@/utils/currency'
import type { MonthlyCashFlowRow } from '@/services/cashFlowService'

const MONTHS = 12

/** Convierte los datos de getMonthlySpend en el formato de MonthlyCashFlowRow
 *  que espera cashFlowToSeries (solo usamos actual_outflow). */
function spendToFlowRows(data: Array<{ month: string; spend: number }>): MonthlyCashFlowRow[] {
  return data.map((d) => ({
    month: d.month,
    planned_outflow: 0,
    actual_outflow: d.spend,
    planned_inflow: 0,
    actual_inflow: 0,
    net_planned: 0,
    net_actual: -d.spend,
  }))
}

export function TendenciasSection() {
  const [rows, setRows] = useState<Array<{ month: string; spend: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    dashboardService
      .getMonthlySpend(MONTHS)
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch(() => {
        // Falla silenciosa: mostrará "Sin datos"
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Construir serie con todos los meses del rango (rellena 0 donde no hay datos)
  const flowRows = spendToFlowRows(rows)
  const series = cashFlowToSeries(flowRows, 'actual_outflow', MONTHS)

  // Total del periodo
  const total = rows.reduce((sum, r) => sum + r.spend, 0)

  // Mes con mayor gasto
  const peakMonth = rows.reduce<{ month: string; spend: number } | null>((max, r) => {
    return !max || r.spend > max.spend ? r : max
  }, null)

  // Etiqueta para el mes pico
  const peakLabel = peakMonth ? monthLabel(peakMonth.month) : '—'

  // Verificar si hay datos reales (algún mes con gasto > 0)
  const hasData = rows.some((r) => r.spend > 0)

  // Rango de meses mostrado
  const monthKeys = lastNMonths(MONTHS)
  const rangeStart = monthLabel(monthKeys[0])
  const rangeEnd = monthLabel(monthKeys[monthKeys.length - 1])

  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-4 py-3 border-b border-app-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />
          <h2 className="text-sm font-semibold text-app-text">Tendencias de gasto</h2>
        </div>
        <span className="text-[11px] text-app-subtle">
          {rangeStart} – {rangeEnd}
        </span>
      </div>

      {/* Resumen rápido */}
      {!loading && hasData && (
        <div className="grid grid-cols-2 divide-x divide-app-border border-b border-app-border">
          <div className="px-4 py-2.5">
            <p className="text-[10px] text-app-muted mb-0.5">Total en el periodo</p>
            <p className="text-sm font-semibold text-app-text">{formatRD(total)}</p>
          </div>
          <div className="px-4 py-2.5">
            <p className="text-[10px] text-app-muted mb-0.5">Mes con mayor gasto</p>
            <p className="text-sm font-semibold text-app-text">{peakLabel}</p>
          </div>
        </div>
      )}

      {/* Gráfica */}
      <div className="px-3 pt-2 pb-3">
        {loading ? (
          <div className="flex items-center justify-center text-xs text-app-muted" style={{ height: 208 }}>
            Cargando datos…
          </div>
        ) : (
          <BarChart
            series={series}
            height={160}
            color="#3b82f6"
            formatY={(v) => (v === 0 ? '0' : formatRD(v))}
            emptyMessage="Sin datos de gasto registrados aún"
          />
        )}
      </div>
    </div>
  )
}
