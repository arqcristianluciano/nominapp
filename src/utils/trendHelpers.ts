/**
 * trendHelpers – funciones puras para preparar datos de tendencias.
 * No tienen dependencias de red ni de React: son fáciles de probar.
 */

import type { MonthlyCashFlowRow } from '@/services/cashFlowService'
import type { DataPoint } from '@/components/ui/charts/BarChart'

// Nombres cortos de mes en español para las etiquetas de las gráficas.
const MONTH_SHORT: Record<string, string> = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic',
}

/**
 * Convierte una clave de mes "YYYY-MM" a una etiqueta legible, p.ej. "Jun 25".
 */
export function monthLabel(ym: string): string {
  const month = ym.slice(5, 7)
  const year = ym.slice(2, 4)
  return `${MONTH_SHORT[month] ?? month} ${year}`
}

/**
 * Genera las claves de mes (YYYY-MM) para los últimos `count` meses
 * incluyendo el mes actual (basado en la fecha de referencia).
 */
export function lastNMonths(count: number, referenceDate?: Date): string[] {
  const ref = referenceDate ?? new Date()
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    keys.push(`${y}-${m}`)
  }
  return keys
}

/**
 * Transforma filas de proyección mensual en una serie de DataPoints para la gráfica
 * de "Gasto real por mes" (últimos `months` meses).
 *
 * - `field` indica qué columna usar: 'actual_outflow' | 'planned_outflow' | 'actual_inflow'
 */
export function cashFlowToSeries(
  rows: MonthlyCashFlowRow[],
  field: keyof Pick<MonthlyCashFlowRow, 'actual_outflow' | 'planned_outflow' | 'actual_inflow' | 'planned_inflow'>,
  months = 12,
  referenceDate?: Date,
): DataPoint[] {
  const keys = lastNMonths(months, referenceDate)
  const byMonth = new Map(rows.map((r) => [r.month, r]))
  return keys.map((ym) => ({
    label: monthLabel(ym),
    value: byMonth.get(ym)?.[field] ?? 0,
  }))
}

/**
 * Dado un registro de progreso por mes (formato {month: string, progress: number}[]),
 * devuelve una serie de DataPoints para los últimos `months` meses.
 */
export function progressToSeries(
  rows: Array<{ month: string; progress: number }>,
  months = 12,
  referenceDate?: Date,
): DataPoint[] {
  const keys = lastNMonths(months, referenceDate)
  const byMonth = new Map(rows.map((r) => [r.month, r.progress]))
  return keys.map((ym) => ({
    label: monthLabel(ym),
    value: byMonth.get(ym) ?? 0,
  }))
}
