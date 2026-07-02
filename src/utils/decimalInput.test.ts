import { describe, it, expect } from 'vitest'
import { parseDecimalInput, formatDecimalForInput } from './decimalInput'

describe('parseDecimalInput', () => {
  describe('plain numbers', () => {
    it('parses a simple integer', () => {
      expect(parseDecimalInput('1234')).toBe(1234)
    })

    it('parses a dot-decimal number ("1234.56")', () => {
      expect(parseDecimalInput('1234.56')).toBe(1234.56)
    })

    it('parses a comma-decimal number ("1234,56", RD plano)', () => {
      expect(parseDecimalInput('1234,56')).toBe(1234.56)
    })

    it('parses zero', () => {
      expect(parseDecimalInput('0')).toBe(0)
      expect(parseDecimalInput('0,00')).toBe(0)
      expect(parseDecimalInput('0.00')).toBe(0)
    })

    it('parses a single-digit decimal ("12,5")', () => {
      expect(parseDecimalInput('12,5')).toBe(12.5)
      expect(parseDecimalInput('12.5')).toBe(12.5)
    })

    it('lee "0,125" y "0.125" como decimales, no como 125 (nunca son miles)', () => {
      expect(parseDecimalInput('0,125')).toBe(0.125)
      expect(parseDecimalInput('0.125')).toBe(0.125)
    })

    it('lee "0,5" pequeños correctamente', () => {
      expect(parseDecimalInput('0,5')).toBe(0.5)
      expect(parseDecimalInput('0.5')).toBe(0.5)
    })
  })

  describe('US format ("1,234.56")', () => {
    it('parses a US-style thousands separator', () => {
      expect(parseDecimalInput('1,234.56')).toBe(1234.56)
    })

    it('parses multiple thousands groups ("1,234,567.89")', () => {
      expect(parseDecimalInput('1,234,567.89')).toBe(1234567.89)
    })

    it('parses thousands-only with no decimals ("1,234")', () => {
      expect(parseDecimalInput('1,234')).toBe(1234)
    })

    it('parses long thousands group ("1,234,567")', () => {
      expect(parseDecimalInput('1,234,567')).toBe(1234567)
    })
  })

  describe('RD format ("1.234,56")', () => {
    it('parses a RD-style thousands separator', () => {
      expect(parseDecimalInput('1.234,56')).toBe(1234.56)
    })

    it('parses multiple thousands groups ("1.234.567,89")', () => {
      expect(parseDecimalInput('1.234.567,89')).toBe(1234567.89)
    })

    it('parses thousands-only with no decimals ("1.234")', () => {
      expect(parseDecimalInput('1.234')).toBe(1234)
    })

    it('parses long RD-style thousands ("1.234.567")', () => {
      expect(parseDecimalInput('1.234.567')).toBe(1234567)
    })
  })

  describe('whitespace handling', () => {
    it('trims surrounding spaces', () => {
      expect(parseDecimalInput('  1234,56  ')).toBe(1234.56)
    })

    it('removes interior spaces (e.g. "1 234,56")', () => {
      expect(parseDecimalInput('1 234,56')).toBe(1234.56)
    })

    it('removes tabs', () => {
      expect(parseDecimalInput('\t1.234,56\t')).toBe(1234.56)
    })
  })

  describe('signed numbers', () => {
    it('parses a negative number with dot decimal', () => {
      expect(parseDecimalInput('-1234.56')).toBe(-1234.56)
    })

    it('parses a negative number with RD format', () => {
      expect(parseDecimalInput('-1.234,56')).toBe(-1234.56)
    })

    it('parses a negative number with US format', () => {
      expect(parseDecimalInput('-1,234.56')).toBe(-1234.56)
    })

    it('parses a negative plain comma number', () => {
      expect(parseDecimalInput('-1234,56')).toBe(-1234.56)
    })

    it('parses an explicit positive sign', () => {
      expect(parseDecimalInput('+1234,56')).toBe(1234.56)
    })
  })

  describe('edge cases', () => {
    it('returns null for an empty string', () => {
      expect(parseDecimalInput('')).toBeNull()
    })

    it('returns null for whitespace-only', () => {
      expect(parseDecimalInput('   ')).toBeNull()
    })

    it('returns null for non-numeric junk', () => {
      expect(parseDecimalInput('abc')).toBeNull()
      expect(parseDecimalInput('12abc')).toBeNull()
      expect(parseDecimalInput('NaN')).toBeNull()
    })

    it('returns null for a lone sign or separator', () => {
      expect(parseDecimalInput('-')).toBeNull()
      expect(parseDecimalInput('+')).toBeNull()
      expect(parseDecimalInput(',')).toBeNull()
      expect(parseDecimalInput('.')).toBeNull()
    })

    it('returns null for non-string input', () => {
      // @ts-expect-error – exercising defensive runtime guard
      expect(parseDecimalInput(null)).toBeNull()
      // @ts-expect-error – exercising defensive runtime guard
      expect(parseDecimalInput(undefined)).toBeNull()
      // @ts-expect-error – exercising defensive runtime guard
      expect(parseDecimalInput(1234)).toBeNull()
    })

    it('returns null for clearly malformed numbers', () => {
      expect(parseDecimalInput('1..2')).toBeNull()
      expect(parseDecimalInput('1,,2')).toBeNull()
      expect(parseDecimalInput('1.2.3.4')).toBeNull()
    })
  })
})

describe('formatDecimalForInput', () => {
  describe('basic formatting', () => {
    it('formats with 2 decimals by default (RD style)', () => {
      expect(formatDecimalForInput(1234.56)).toBe('1.234,56')
    })

    it('formats large numbers with multiple thousands groups', () => {
      expect(formatDecimalForInput(1234567.89)).toBe('1.234.567,89')
    })

    it('formats whole numbers padding decimals', () => {
      expect(formatDecimalForInput(1234)).toBe('1.234,00')
    })

    it('formats numbers below 1000 without grouping', () => {
      expect(formatDecimalForInput(123.4)).toBe('123,40')
      expect(formatDecimalForInput(7)).toBe('7,00')
    })

    it('formats zero', () => {
      expect(formatDecimalForInput(0)).toBe('0,00')
    })
  })

  describe('decimal precision', () => {
    it('respects custom decimal count', () => {
      expect(formatDecimalForInput(1234.5678, 4)).toBe('1.234,5678')
    })

    it('omits the decimal separator when decimals = 0', () => {
      expect(formatDecimalForInput(1234.56, 0)).toBe('1.235')
      expect(formatDecimalForInput(1234, 0)).toBe('1.234')
    })

    it('rounds to the requested decimals', () => {
      expect(formatDecimalForInput(1.005, 2)).toBe('1,00')
      expect(formatDecimalForInput(1.5)).toBe('1,50')
    })
  })

  describe('negative numbers', () => {
    it('preserves the leading minus sign', () => {
      expect(formatDecimalForInput(-1234.56)).toBe('-1.234,56')
    })

    it('formats small negatives correctly', () => {
      expect(formatDecimalForInput(-7.5)).toBe('-7,50')
    })
  })

  describe('null / undefined / NaN', () => {
    it('returns empty string for null', () => {
      expect(formatDecimalForInput(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(formatDecimalForInput(undefined)).toBe('')
    })

    it('returns empty string for NaN', () => {
      expect(formatDecimalForInput(NaN)).toBe('')
    })

    it('returns empty string for Infinity / -Infinity', () => {
      expect(formatDecimalForInput(Infinity)).toBe('')
      expect(formatDecimalForInput(-Infinity)).toBe('')
    })
  })

  describe('round-trip with parseDecimalInput', () => {
    it('format -> parse recovers the original value', () => {
      const value = 1234567.89
      const parsed = parseDecimalInput(formatDecimalForInput(value))
      expect(parsed).toBe(value)
    })

    it('round-trips negatives', () => {
      const value = -42.5
      const parsed = parseDecimalInput(formatDecimalForInput(value))
      expect(parsed).toBe(value)
    })
  })
})
