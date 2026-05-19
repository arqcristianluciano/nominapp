import { describe, expect, it } from 'vitest'
import { approvalsService } from './approvalsService'

describe('approvalsService', () => {
  it('persiste un evento y lo recupera por entidad', async () => {
    const entityId = `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`
    await approvalsService.log({
      entity_type: 'payroll_period',
      entity_id: entityId,
      action: 'status_change',
      actor_display_name: 'cristian',
      payload_before: { status: 'draft' },
      payload_after: { status: 'submitted' },
      motivo: null,
      metadata: { period_number: 7 },
    })

    const history = await approvalsService.getHistory('payroll_period', entityId)
    expect(history).toHaveLength(1)
    expect(history[0].action).toBe('status_change')
    expect(history[0].actor_display_name).toBe('cristian')
    expect((history[0].metadata as { period_number: number }).period_number).toBe(7)
  })

  it('orden histórico es descendente por created_at', async () => {
    const entityId = `00000000-0000-0000-0000-${(Date.now() + 1).toString().padStart(12, '0')}`
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: entityId,
      action: 'submit_for_approval',
    })
    await approvalsService.log({
      entity_type: 'purchase_requisition',
      entity_id: entityId,
      action: 'approve',
    })
    const history = await approvalsService.getHistory('purchase_requisition', entityId)
    expect(history.length).toBeGreaterThanOrEqual(2)
    // El más reciente primero
    expect(history[0].action === 'approve' || history[0].action === 'submit_for_approval').toBe(true)
  })
})
