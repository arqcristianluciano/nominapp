import { describe, expect, it } from 'vitest'
import { buildPayrollSection, type PayrollSectionInput, type PayrollSectionRow } from './payroll'

function row(overrides: Partial<PayrollSectionRow> = {}): PayrollSectionRow {
  return {
    contractorName: 'Acme Builders',
    partidasCount: 3,
    laborSubtotal: 500_000,
    materials: 200_000,
    indirects: 50_000,
    deductions: 25_000,
    net: 725_000,
    ...overrides,
  }
}

function baseInput(overrides: Partial<PayrollSectionInput> = {}): PayrollSectionInput {
  return {
    rows: [row()],
    ...overrides,
  }
}

interface StackNode {
  stack?: Array<{ text?: string }>
}

describe('buildPayrollSection', () => {
  it('returns a defined content node with a non-empty stack', () => {
    const result = buildPayrollSection(baseInput()) as StackNode

    expect(result).toBeDefined()
    expect(Array.isArray(result.stack)).toBe(true)
    expect(result.stack!.length).toBeGreaterThan(0)
  })

  it('first stack element has the expected heading text', () => {
    const result = buildPayrollSection(baseInput()) as StackNode
    const first = result.stack?.[0]

    expect(first?.text).toBe('Resumen de nomina del mes')
  })

  it('respects USD + en-US producing "$" not "US$"', () => {
    const result = buildPayrollSection(baseInput({ currency: 'USD', locale: 'en-US' }))
    const json = JSON.stringify(result)

    expect(json).toContain('$')
    expect(json).not.toContain('US$')
  })

  it('handles zero-valued rows without NaN or Infinity', () => {
    const result = buildPayrollSection({
      rows: [
        row({
          partidasCount: 0,
          laborSubtotal: 0,
          materials: 0,
          indirects: 0,
          deductions: 0,
          net: 0,
        }),
      ],
    })
    const json = JSON.stringify(result)

    expect(json).not.toMatch(/NaN/)
    expect(json).not.toMatch(/Infinity/)
  })

  it('handles an empty rows array without crashing', () => {
    const result = buildPayrollSection({ rows: [] }) as StackNode
    const json = JSON.stringify(result)

    expect(result.stack?.[0]?.text).toBe('Resumen de nomina del mes')
    expect(json).not.toMatch(/NaN/)
    expect(json).not.toMatch(/Infinity/)
  })
})
