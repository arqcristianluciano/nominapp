import { describe, expect, it } from 'vitest'
import { buildExecutiveSummarySection, type ExecutiveSummaryInput } from './executiveSummary'

function baseInput(overrides: Partial<ExecutiveSummaryInput> = {}): ExecutiveSummaryInput {
  return {
    totalBudget: 1_000_000,
    totalInvested: 750_000,
    variance: 250_000,
    progressPercent: 75,
    projectGrandTotal: 1_200_000,
    daysWorked: 90,
    activeContractors: 12,
    partidasInProgress: 8,
    materialsReceived: 34,
    monthlyTransactions: 120,
    ...overrides,
  }
}

interface TextNode {
  text?: string
}

interface TableNode {
  table?: {
    body?: TableCell[][]
  }
}

interface TableCell {
  text?: string
  color?: string
}

describe('buildExecutiveSummarySection', () => {
  it('returns a non-empty Content array', () => {
    const result = buildExecutiveSummarySection(baseInput())

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('first element has the expected heading text', () => {
    const result = buildExecutiveSummarySection(baseInput())
    const first = result[0] as TextNode

    expect(first.text).toBe('Resumen ejecutivo')
  })

  it('respects USD + en-US producing "$" not "US$"', () => {
    const result = buildExecutiveSummarySection(baseInput({ currency: 'USD', locale: 'en-US' }))
    const json = JSON.stringify(result)

    expect(json).toContain('$')
    expect(json).not.toContain('US$')
  })

  it('handles zero values without producing NaN or Infinity', () => {
    const result = buildExecutiveSummarySection(
      baseInput({
        totalBudget: 0,
        totalInvested: 0,
        variance: 0,
        progressPercent: 0,
        projectGrandTotal: 0,
        daysWorked: 0,
        activeContractors: 0,
        partidasInProgress: 0,
        materialsReceived: 0,
        monthlyTransactions: 0,
      }),
    )
    const json = JSON.stringify(result)

    expect(json).not.toMatch(/NaN/)
    expect(json).not.toMatch(/Infinity/)
    expect(Array.isArray(result)).toBe(true)
  })

  it('uses red color (#d93025) for negative variance', () => {
    const result = buildExecutiveSummarySection(baseInput({ variance: -50_000 }))
    const summaryTable = result[1] as TableNode
    const rows = summaryTable.table?.body ?? []
    const varianceRow = rows.find((row) => row.some((cell) => cell.text === 'Variance'))
    expect(varianceRow).toBeDefined()
    const valueCell = varianceRow?.[1] as TableCell

    expect(valueCell.color).toBe('#d93025')
  })

  it('uses green color (#0f9d58) for positive variance', () => {
    const result = buildExecutiveSummarySection(baseInput({ variance: 50_000 }))
    const summaryTable = result[1] as TableNode
    const rows = summaryTable.table?.body ?? []
    const varianceRow = rows.find((row) => row.some((cell) => cell.text === 'Variance'))
    const valueCell = varianceRow?.[1] as TableCell

    expect(valueCell.color).toBe('#0f9d58')
  })
})
