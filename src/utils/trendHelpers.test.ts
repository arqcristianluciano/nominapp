import { describe, expect, it } from 'vitest'
import type { MonthlyCashFlowRow } from '@/services/cashFlowService'
import { cashFlowToSeries, lastNMonths, monthLabel, progressToSeries } from './trendHelpers'

// Fecha de referencia fija para pruebas deterministas.
const REF = new Date(2026, 5, 8) // 8 de junio de 2026 (meses 0-based: 5 = junio)

describe('monthLabel', () => {
  it('convierte "2026-06" en "Jun 26"', () => {
    expect(monthLabel('2026-06')).toBe('Jun 26')
  })
  it('convierte "2025-01" en "Ene 25"', () => {
    expect(monthLabel('2025-01')).toBe('Ene 25')
  })
  it('convierte "2025-12" en "Dic 25"', () => {
    expect(monthLabel('2025-12')).toBe('Dic 25')
  })
})

describe('lastNMonths', () => {
  it('devuelve 6 meses terminando en el mes de referencia', () => {
    const result = lastNMonths(6, REF)
    expect(result).toHaveLength(6)
    expect(result[result.length - 1]).toBe('2026-06')
    expect(result[0]).toBe('2026-01')
  })

  it('devuelve 12 meses terminando en el mes de referencia', () => {
    const result = lastNMonths(12, REF)
    expect(result).toHaveLength(12)
    expect(result[result.length - 1]).toBe('2026-06')
    expect(result[0]).toBe('2025-07')
  })

  it('cruza correctamente el año anterior', () => {
    const ref = new Date(2026, 1, 1) // febrero 2026
    const result = lastNMonths(3, ref)
    expect(result).toEqual(['2025-12', '2026-01', '2026-02'])
  })
})

describe('cashFlowToSeries', () => {
  const rows: MonthlyCashFlowRow[] = [
    {
      month: '2026-04',
      planned_outflow: 1000,
      actual_outflow: 900,
      planned_inflow: 2000,
      actual_inflow: 0,
      net_planned: 1000,
      net_actual: -900,
    },
    {
      month: '2026-06',
      planned_outflow: 3000,
      actual_outflow: 2500,
      planned_inflow: 0,
      actual_inflow: 0,
      net_planned: -3000,
      net_actual: -2500,
    },
  ]

  it('rellena meses sin datos con 0', () => {
    const series = cashFlowToSeries(rows, 'actual_outflow', 6, REF)
    expect(series).toHaveLength(6)

    // Enero a marzo: no hay datos → 0
    const jan = series.find((d) => d.label === 'Ene 26')
    expect(jan?.value).toBe(0)

    // Abril: 900
    const apr = series.find((d) => d.label === 'Abr 26')
    expect(apr?.value).toBe(900)

    // Mayo: no hay datos → 0
    const may = series.find((d) => d.label === 'May 26')
    expect(may?.value).toBe(0)

    // Junio: 2500
    const jun = series.find((d) => d.label === 'Jun 26')
    expect(jun?.value).toBe(2500)
  })

  it('usa el campo indicado (planned_outflow)', () => {
    const series = cashFlowToSeries(rows, 'planned_outflow', 6, REF)
    const apr = series.find((d) => d.label === 'Abr 26')
    expect(apr?.value).toBe(1000)
  })

  it('devuelve array vacío si months = 0', () => {
    const series = cashFlowToSeries(rows, 'actual_outflow', 0, REF)
    expect(series).toHaveLength(0)
  })

  it('todos 0 si no hay filas', () => {
    const series = cashFlowToSeries([], 'actual_outflow', 3, REF)
    expect(series.every((d) => d.value === 0)).toBe(true)
    expect(series).toHaveLength(3)
  })
})

describe('progressToSeries', () => {
  it('devuelve 0 para meses sin datos', () => {
    const rows = [
      { month: '2026-04', progress: 30 },
      { month: '2026-06', progress: 65 },
    ]
    const series = progressToSeries(rows, 6, REF)
    expect(series).toHaveLength(6)

    const apr = series.find((d) => d.label === 'Abr 26')
    expect(apr?.value).toBe(30)

    const may = series.find((d) => d.label === 'May 26')
    expect(may?.value).toBe(0)

    const jun = series.find((d) => d.label === 'Jun 26')
    expect(jun?.value).toBe(65)
  })
})
