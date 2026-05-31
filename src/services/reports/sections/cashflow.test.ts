import { describe, expect, it } from 'vitest'
import { buildCashflowSection, type CashflowInput } from './cashflow'

function baseInput(overrides: Partial<CashflowInput> = {}): CashflowInput {
  return {
    collections: { expected: 1_000_000, actual: 950_000 },
    contractorPayments: { expected: 400_000, actual: 410_000 },
    supplierPayments: { expected: 200_000, actual: 180_000 },
    releasedPurchaseOrders: { expected: 100_000, actual: 90_000 },
    indirects: { expected: 50_000, actual: 55_000 },
    ...overrides,
  }
}

interface StackNode {
  stack?: Array<{ text?: string }>
}

describe('buildCashflowSection', () => {
  it('returns a defined content node with a non-empty stack', () => {
    const result = buildCashflowSection(baseInput()) as StackNode

    expect(result).toBeDefined()
    expect(Array.isArray(result.stack)).toBe(true)
    expect(result.stack!.length).toBeGreaterThan(0)
  })

  it('first stack element has the expected heading text', () => {
    const result = buildCashflowSection(baseInput()) as StackNode
    const first = result.stack?.[0]

    expect(first?.text).toBe('Flujo de caja mensual')
  })

  it('uses "$" currency formatting (en-US style)', () => {
    const result = buildCashflowSection(baseInput())
    const json = JSON.stringify(result)

    expect(json).toContain('$')
    expect(json).not.toContain('US$')
    expect(json).toMatch(/\$\d/)
  })

  it('handles zero values without NaN or Infinity', () => {
    const result = buildCashflowSection({
      collections: { expected: 0, actual: 0 },
      contractorPayments: { expected: 0, actual: 0 },
      supplierPayments: { expected: 0, actual: 0 },
      releasedPurchaseOrders: { expected: 0, actual: 0 },
      indirects: { expected: 0, actual: 0 },
    })
    const json = JSON.stringify(result)

    expect(json).not.toMatch(/NaN/)
    expect(json).not.toMatch(/Infinity/)
  })

  it('handles negative values (formatted with a leading "-")', () => {
    const result = buildCashflowSection(baseInput({ collections: { expected: -100, actual: -200 } }))
    const json = JSON.stringify(result)

    expect(json).not.toMatch(/NaN/)
    expect(json).toContain('-$')
  })
})
