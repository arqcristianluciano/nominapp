import { describe, expect, it } from 'vitest'
import { cashFlowService } from './cashFlowService'

const projectId = `p_cf_${Date.now()}`

describe('cashFlowService', () => {
  it('addExpectedInflow guarda y listExpectedInflows lo retorna', async () => {
    const inflow = await cashFlowService.addExpectedInflow({
      project_id: projectId,
      expected_date: '2026-06-15',
      amount: 100000,
      concept: 'Cuota cubierta unidad 301',
      source: 'manual',
      external_ref: null,
      notes: null,
      created_by: 'cristian',
    })
    expect(inflow.amount).toBe(100000)
    const all = await cashFlowService.listExpectedInflows(projectId)
    expect(all.length).toBeGreaterThanOrEqual(1)
  })

  it('getMonthlyProjection produce filas con planned_inflow desde expected_cash_inflows', async () => {
    const rows = await cashFlowService.getMonthlyProjection(projectId)
    const june = rows.find((r) => r.month === '2026-06')
    expect(june).toBeDefined()
    expect(june!.planned_inflow).toBeGreaterThanOrEqual(100000)
  })
})
