import { describe, expect, it } from 'vitest'
import {
  buildBudgetBreakdownSection,
  type BudgetBreakdownInput,
} from './budgetBreakdown'

function baseInput(): BudgetBreakdownInput {
  return {
    categories: [
      {
        code: '01',
        name: 'Obra gruesa',
        budgeted: 500_000,
        actual: 480_000,
        items: [
          {
            code: '01.01',
            name: 'Excavaciones',
            budgeted: 100_000,
            actual: 95_000,
          },
        ],
      },
      {
        code: '02',
        name: 'Terminaciones',
        budgeted: 300_000,
        actual: 340_000,
        items: [],
      },
    ],
  }
}

interface StackNode {
  stack?: Array<{ text?: string }>
}

describe('buildBudgetBreakdownSection', () => {
  it('returns a non-empty content node (stack)', () => {
    const result = buildBudgetBreakdownSection(baseInput()) as StackNode

    expect(result).toBeDefined()
    expect(Array.isArray(result.stack)).toBe(true)
    expect(result.stack!.length).toBeGreaterThan(0)
  })

  it('first stack element has the expected heading text', () => {
    const result = buildBudgetBreakdownSection(baseInput()) as StackNode
    const first = result.stack?.[0]

    expect(first?.text).toBe('Desglose por capitulo/partida')
  })

  it('uses "$" currency formatting (en-US style)', () => {
    const result = buildBudgetBreakdownSection(baseInput())
    const json = JSON.stringify(result)

    expect(json).toContain('$')
    expect(json).not.toContain('US$')
    // formatCurrency outputs e.g. "$500,000.00"
    expect(json).toMatch(/\$\d/)
  })

  it('handles zero values without NaN or Infinity (avoids division-by-zero)', () => {
    const result = buildBudgetBreakdownSection({
      categories: [
        {
          code: '01',
          name: 'Empty',
          budgeted: 0,
          actual: 0,
          items: [
            { code: '01.01', name: 'Sub', budgeted: 0, actual: 0 },
          ],
        },
      ],
    })
    const json = JSON.stringify(result)

    expect(json).not.toMatch(/NaN/)
    expect(json).not.toMatch(/Infinity/)
  })

  it('handles an empty categories array without crashing', () => {
    const result = buildBudgetBreakdownSection({ categories: [] }) as StackNode
    const json = JSON.stringify(result)

    expect(result.stack?.[0]?.text).toBe('Desglose por capitulo/partida')
    expect(json).not.toMatch(/NaN/)
    expect(json).not.toMatch(/Infinity/)
  })
})
