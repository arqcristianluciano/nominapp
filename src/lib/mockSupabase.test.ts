import { describe, expect, it } from 'vitest'
import { mockSupabase } from './mockSupabase'

describe('mockSupabase filtros encadenados', () => {
  it('soporta ilike + gt + lte en transacciones', async () => {
    const marker = `TEST-ILIKE-${Date.now()}`
    const baseDate = '2026-03-01'
    const olderDate = '2026-01-01'

    await mockSupabase.from('transactions').insert([
      {
        id: `${marker}-1`,
        description: marker,
        payment_condition: 'Credito 30 dias',
        date: olderDate,
        total: 100,
        project_id: 'p0000000-0000-0000-0000-000000000001',
      },
      {
        id: `${marker}-2`,
        description: marker,
        payment_condition: 'CONTADO',
        date: olderDate,
        total: 100,
        project_id: 'p0000000-0000-0000-0000-000000000001',
      },
      {
        id: `${marker}-3`,
        description: marker,
        payment_condition: 'Credito 15 dias',
        date: baseDate,
        total: 100,
        project_id: 'p0000000-0000-0000-0000-000000000001',
      },
    ])

    const res = await mockSupabase
      .from('transactions')
      .select('id, description, payment_condition, date')
      .eq('description', marker)
      .ilike('payment_condition', '%credito%')
      .lte('date', baseDate)
      .gt('date', '2025-12-31')

    expect(res.error).toBeNull()
    expect((res.data as Array<{ id: string }>).map((r) => r.id).sort()).toEqual([`${marker}-1`, `${marker}-3`])
  })

  it('soporta filtro is para null', async () => {
    const marker = `TEST-IS-${Date.now()}`

    await mockSupabase.from('quality_control').insert([
      {
        id: `${marker}-1`,
        element: marker,
        pour_date: '2026-01-10',
        test_date: null,
        status: 'pending',
        project_id: 'p0000000-0000-0000-0000-000000000001',
      },
      {
        id: `${marker}-2`,
        element: marker,
        pour_date: '2026-01-10',
        test_date: '2026-01-20',
        status: 'passed',
        project_id: 'p0000000-0000-0000-0000-000000000001',
      },
    ])

    const res = await mockSupabase
      .from('quality_control')
      .select('id, element, test_date')
      .eq('element', marker)
      .is('test_date', null)

    expect(res.error).toBeNull()
    expect((res.data as Array<{ id: string }>).map((r) => r.id)).toEqual([`${marker}-1`])
  })
})
