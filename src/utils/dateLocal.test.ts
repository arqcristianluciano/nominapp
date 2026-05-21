import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { todayISO, parseDateLocal } from './dateLocal'

describe('todayISO', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devuelve YYYY-MM-DD del día actual local', () => {
    // 21 de mayo 2026, 10:30 hora local
    vi.setSystemTime(new Date(2026, 4, 21, 10, 30, 0))
    expect(todayISO()).toBe('2026-05-21')
  })

  it('aplica padding de ceros a mes y día (mes 1 dígito)', () => {
    // 3 de enero 2026
    vi.setSystemTime(new Date(2026, 0, 3, 12, 0, 0))
    expect(todayISO()).toBe('2026-01-03')
  })

  it('aplica padding de ceros (día 1 dígito, mes 2 dígitos)', () => {
    // 9 de diciembre 2025
    vi.setSystemTime(new Date(2025, 11, 9, 23, 59, 59))
    expect(todayISO()).toBe('2025-12-09')
  })

  it('usa fecha local, no UTC (cerca de medianoche)', () => {
    // 21 de mayo 2026, 00:30 hora local — debe ser '2026-05-21' aunque UTC pueda ser otro día
    vi.setSystemTime(new Date(2026, 4, 21, 0, 30, 0))
    expect(todayISO()).toBe('2026-05-21')
  })
})

describe('parseDateLocal', () => {
  it('parsea "2026-05-21" como fecha local (año=2026, mes=4, día=21)', () => {
    const d = parseDateLocal('2026-05-21')
    expect(d.getFullYear()).toBe(2026)
    // Mes 0-indexed: mayo = 4
    expect(d.getMonth()).toBe(4)
    expect(d.getDate()).toBe(21)
  })

  it('NO se interpreta como UTC (no hay corrimiento de día)', () => {
    // Si se interpretara como UTC, en zonas con offset negativo (UTC-X)
    // getDate() devolvería 20. Validamos que devuelve 21 (día local).
    const d = parseDateLocal('2026-05-21')
    expect(d.getDate()).toBe(21)
    expect(d.getMonth()).toBe(4)
    expect(d.getFullYear()).toBe(2026)
  })

  it('parsea correctamente fechas de inicio de año', () => {
    const d = parseDateLocal('2026-01-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(1)
  })

  it('parsea correctamente fechas de fin de año', () => {
    const d = parseDateLocal('2025-12-31')
    expect(d.getFullYear()).toBe(2025)
    expect(d.getMonth()).toBe(11)
    expect(d.getDate()).toBe(31)
  })

  it('string mal formado retorna Invalid Date', () => {
    const d = parseDateLocal('not-a-date')
    expect(d).toBeInstanceOf(Date)
    expect(Number.isNaN(d.getTime())).toBe(true)
  })

  it('string vacío retorna Invalid Date', () => {
    const d = parseDateLocal('')
    expect(Number.isNaN(d.getTime())).toBe(true)
  })

  it('string con formato distinto retorna Invalid Date', () => {
    const d = parseDateLocal('21/05/2026')
    expect(Number.isNaN(d.getTime())).toBe(true)
  })
})

describe('todayISO + parseDateLocal: equivalencia (round-trip)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('todayISO() parseado por parseDateLocal → mismo día/mes/año', () => {
    vi.setSystemTime(new Date(2026, 4, 21, 14, 30, 0))
    const iso = todayISO()
    const parsed = parseDateLocal(iso)
    const now = new Date()
    expect(parsed.getFullYear()).toBe(now.getFullYear())
    expect(parsed.getMonth()).toBe(now.getMonth())
    expect(parsed.getDate()).toBe(now.getDate())
  })

  it('round-trip estable en distintas fechas del año', () => {
    const fechas: Array<[number, number, number]> = [
      [2026, 0, 1],   // 1 enero
      [2026, 4, 21],  // 21 mayo
      [2025, 11, 31], // 31 diciembre
      [2024, 1, 29],  // 29 febrero (bisiesto)
    ]
    for (const [y, m, d] of fechas) {
      vi.setSystemTime(new Date(y, m, d, 10, 0, 0))
      const iso = todayISO()
      const parsed = parseDateLocal(iso)
      expect(parsed.getFullYear()).toBe(y)
      expect(parsed.getMonth()).toBe(m)
      expect(parsed.getDate()).toBe(d)
    }
  })
})
