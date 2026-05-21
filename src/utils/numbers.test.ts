import { describe, it, expect } from 'vitest'
import { formatPercent, formatQuantity } from './numbers'

describe('formatPercent', () => {
  it('formatea con 1 decimal por defecto', () => {
    expect(formatPercent(12.5)).toBe('12.5%')
  })

  it('redondea al número de decimales pedido', () => {
    expect(formatPercent(12.345, 2)).toBe('12.35%')
    expect(formatPercent(12.345, 0)).toBe('12%')
  })

  it('soporta enteros y ceros', () => {
    expect(formatPercent(0)).toBe('0.0%')
    expect(formatPercent(100)).toBe('100.0%')
  })

  it('soporta valores negativos', () => {
    expect(formatPercent(-5.5)).toBe('-5.5%')
  })

  it('devuelve "—" para null', () => {
    expect(formatPercent(null)).toBe('—')
  })

  it('devuelve "—" para undefined', () => {
    expect(formatPercent(undefined)).toBe('—')
  })

  it('devuelve "—" para NaN/Infinity (no finito)', () => {
    expect(formatPercent(NaN)).toBe('—')
    expect(formatPercent(Infinity)).toBe('—')
    expect(formatPercent(-Infinity)).toBe('—')
  })
})

describe('formatQuantity', () => {
  it('formatea con separadores RD por defecto (2 decimales)', () => {
    expect(formatQuantity(1234.56)).toBe('1,234.56')
  })

  it('respeta el número de decimales pedido', () => {
    expect(formatQuantity(1234.5, 0)).toBe('1,235')
    expect(formatQuantity(1234.5678, 3)).toBe('1,234.568')
  })

  it('formatea cantidades grandes con miles', () => {
    expect(formatQuantity(1000000)).toBe('1,000,000.00')
  })

  it('soporta cero y negativos', () => {
    expect(formatQuantity(0)).toBe('0.00')
    expect(formatQuantity(-1234.5)).toBe('-1,234.50')
  })

  it('no incluye símbolo de moneda', () => {
    const out = formatQuantity(100)
    expect(out).not.toMatch(/RD/)
    expect(out).not.toMatch(/\$/)
  })

  it('devuelve "—" para null', () => {
    expect(formatQuantity(null)).toBe('—')
  })

  it('devuelve "—" para undefined', () => {
    expect(formatQuantity(undefined)).toBe('—')
  })

  it('devuelve "—" para NaN/Infinity (no finito)', () => {
    expect(formatQuantity(NaN)).toBe('—')
    expect(formatQuantity(Infinity)).toBe('—')
    expect(formatQuantity(-Infinity)).toBe('—')
  })
})
