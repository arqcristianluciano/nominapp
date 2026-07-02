import { describe, it, expect } from 'vitest'
import { parseExcelNumber, sanitizeExcelCell } from './excel'

describe('parseExcelNumber', () => {
  it('devuelve el número tal cual cuando la celda ya es numérica', () => {
    expect(parseExcelNumber(1500)).toBe(1500)
    expect(parseExcelNumber(2.375)).toBe(2.375)
  })

  it('"1,500" es mil quinientos, no 1.5', () => {
    expect(parseExcelNumber('1,500')).toBe(1500)
  })

  it('lee decimales dominicanos con coma ("1234,56")', () => {
    expect(parseExcelNumber('1234,56')).toBe(1234.56)
  })

  it('lee formato US y RD completos', () => {
    expect(parseExcelNumber('1,234.56')).toBe(1234.56)
    expect(parseExcelNumber('1.234,56')).toBe(1234.56)
  })

  it('lee "0,125" como 0.125 (no 125)', () => {
    expect(parseExcelNumber('0,125')).toBe(0.125)
  })

  it('ignora un "=" inicial de fórmula', () => {
    expect(parseExcelNumber('=123')).toBe(123)
  })

  it('devuelve NaN para vacío o basura', () => {
    expect(Number.isNaN(parseExcelNumber(''))).toBe(true)
    expect(Number.isNaN(parseExcelNumber(null))).toBe(true)
    expect(Number.isNaN(parseExcelNumber('abc'))).toBe(true)
  })
})

describe('sanitizeExcelCell', () => {
  it('antepone apóstrofe a celdas que empiezan como fórmula', () => {
    expect(sanitizeExcelCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
    expect(sanitizeExcelCell('+1')).toBe("'+1")
    expect(sanitizeExcelCell('-1')).toBe("'-1")
    expect(sanitizeExcelCell('@x')).toBe("'@x")
  })

  it('deja el texto normal sin cambios', () => {
    expect(sanitizeExcelCell('Cemento')).toBe('Cemento')
    expect(sanitizeExcelCell(123)).toBe('123')
    expect(sanitizeExcelCell(null)).toBe('')
  })
})
