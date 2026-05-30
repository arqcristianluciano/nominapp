import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @/lib/supabase ANTES de importar el service.
// Cada método arma una cadena distinta sobre supabase.from(...); construimos
// mocks reconfigurables por test que devuelvan {data, error} en el último eslabón.
const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

// payrollService importa muchas cosas (supabase incluido); lo mockeamos para
// quedarnos sólo con la constante que usa cashFlowService.
vi.mock('@/services/payrollService', () => ({
  COMMITTED_PAYROLL_STATUSES: ['approved', 'paid'],
}))

import { cashFlowService } from './cashFlowService'

/**
 * Helper: cadena from(table).select(cols).eq(col, val).order(col, opts).
 * Resuelve la cadena (thenable porque .order devuelve un PromiseLike) a {data, error}.
 */
function mockSelectEqOrderChain(data: unknown, error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock, orderMock }
}

/**
 * Helper: cadena from(table).insert(input).select().single().
 */
function mockInsertChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const insertMock = vi.fn().mockReturnValue({ select: selectMock })
  fromMock.mockReturnValueOnce({ insert: insertMock })
  return { insertMock, selectMock, singleMock }
}

/**
 * Helper: cadena from(table).delete().eq(col, val).
 */
function mockDeleteEqChain(error: unknown = null) {
  const eqMock = vi.fn().mockResolvedValue({ error })
  const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ delete: deleteMock })
  return { deleteMock, eqMock }
}

/**
 * Helper: cadena from(table).select(cols).eq(col, val). (sin .order)
 * Usada por budget_categories y transactions en getMonthlyProjection.
 */
function mockSelectEqChain(data: unknown, error: unknown = null) {
  const eqMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock }
}

/**
 * Helper: cadena from(table).select(cols).in(col, ids).
 * Usada por budget_items en getMonthlyProjection.
 */
function mockSelectInChain(data: unknown, error: unknown = null) {
  const inMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ in: inMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, inMock }
}

/**
 * Helper: cadena from(table).select(cols).eq(col, val).in(col2, vals2).
 * Usada por payroll_periods en getMonthlyProjection.
 */
function mockSelectEqInChain(data: unknown, error: unknown = null) {
  const inMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ in: inMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock, inMock }
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('cashFlowService.listExpectedInflows', () => {
  it('happy: retorna filas ordenadas por expected_date asc filtradas por project_id', async () => {
    const rows = [
      {
        id: 'i1',
        project_id: 'p1',
        expected_date: '2026-06-01',
        amount: 100000,
        concept: 'Cuota 1',
        source: 'manual',
        external_ref: null,
        notes: null,
        created_by: 'cristian',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 'i2',
        project_id: 'p1',
        expected_date: '2026-07-01',
        amount: 200000,
        concept: 'Cuota 2',
        source: 'contract',
        external_ref: 'CT-1',
        notes: null,
        created_by: 'cristian',
        created_at: '2026-05-02T00:00:00Z',
      },
    ]
    const { selectMock, eqMock, orderMock } = mockSelectEqOrderChain(rows)

    const result = await cashFlowService.listExpectedInflows('p1')

    expect(fromMock).toHaveBeenCalledWith('expected_cash_inflows')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqMock).toHaveBeenCalledWith('project_id', 'p1')
    expect(orderMock).toHaveBeenCalledWith('expected_date', { ascending: true })
    expect(result).toEqual(rows)
  })

  it('data null se normaliza a []', async () => {
    mockSelectEqOrderChain(null)
    const result = await cashFlowService.listExpectedInflows('p1')
    expect(result).toEqual([])
  })

  it('error: propaga el error de supabase', async () => {
    mockSelectEqOrderChain(null, { message: 'boom' })
    await expect(cashFlowService.listExpectedInflows('p1')).rejects.toEqual({ message: 'boom' })
  })
})

describe('cashFlowService.addExpectedInflow', () => {
  const input = {
    project_id: 'p1',
    expected_date: '2026-06-15',
    amount: 100000,
    concept: 'Cuota cubierta unidad 301',
    source: 'manual' as const,
    external_ref: null,
    notes: null,
    created_by: 'cristian',
  }

  it('happy: inserta y retorna la fila creada', async () => {
    const created = { ...input, id: 'i-new', created_at: '2026-05-01T00:00:00Z' }
    const { insertMock, selectMock, singleMock } = mockInsertChain(created)

    const result = await cashFlowService.addExpectedInflow(input)

    expect(fromMock).toHaveBeenCalledWith('expected_cash_inflows')
    expect(insertMock).toHaveBeenCalledWith(input)
    expect(selectMock).toHaveBeenCalledTimes(1)
    expect(singleMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(created)
    expect(result.amount).toBe(100000)
  })

  it('error: propaga el error de supabase', async () => {
    mockInsertChain(null, { message: 'insert fail' })
    await expect(cashFlowService.addExpectedInflow(input)).rejects.toEqual({
      message: 'insert fail',
    })
  })
})

describe('cashFlowService.deleteExpectedInflow', () => {
  it('happy: borra por id sin retornar nada', async () => {
    const { deleteMock, eqMock } = mockDeleteEqChain()

    await expect(cashFlowService.deleteExpectedInflow('i-del')).resolves.toBeUndefined()

    expect(fromMock).toHaveBeenCalledWith('expected_cash_inflows')
    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(eqMock).toHaveBeenCalledWith('id', 'i-del')
  })

  it('error: propaga el error de supabase', async () => {
    mockDeleteEqChain({ message: 'delete fail' })
    await expect(cashFlowService.deleteExpectedInflow('i-del')).rejects.toEqual({
      message: 'delete fail',
    })
  })
})

describe('cashFlowService.getMonthlyProjection', () => {
  it('happy: agrega planificado (budget_items), real (payrolls+transactions) e ingresos por mes', async () => {
    // Orden de calls dentro del service:
    // 1. budget_categories.select('id').eq('project_id', ...)
    // 2. budget_items.select(...).in('budget_category_id', ...)
    // 3. payroll_periods.select(...).eq('project_id', ...).in('status', ...)
    // 4. transactions.select(...).eq('project_id', ...)
    // 5. listExpectedInflows -> expected_cash_inflows.select('*').eq('project_id', ...).order(...)
    mockSelectEqChain([{ id: 'cat1' }, { id: 'cat2' }])
    mockSelectInChain([
      { quantity: 10, unit_price: 1000, start_date: '2026-06-15' }, // 10000 en 2026-06
      { quantity: 2, unit_price: 500, start_date: '2026-06-20' }, // 1000 en 2026-06
      { quantity: 4, unit_price: 250, start_date: '2026-07-05' }, // 1000 en 2026-07
      { quantity: 1, unit_price: 999, start_date: null }, // se ignora (sin mes)
    ])
    mockSelectEqInChain([
      { grand_total: 5000, report_date: '2026-06-30' },
      { grand_total: 3000, report_date: '2026-07-15' },
      { grand_total: 1234, report_date: null }, // se ignora
    ])
    mockSelectEqChain([
      { total: 200, date: '2026-06-10' },
      { total: 800, date: '2026-07-20' },
      { total: 50, date: null }, // se ignora
    ])
    mockSelectEqOrderChain([
      {
        id: 'i1',
        project_id: 'p1',
        expected_date: '2026-06-15',
        amount: 100000,
        concept: 'Cuota A',
        source: 'manual',
        external_ref: null,
        notes: null,
        created_by: null,
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 'i2',
        project_id: 'p1',
        expected_date: '2026-07-01',
        amount: 50000,
        concept: 'Cuota B',
        source: 'manual',
        external_ref: null,
        notes: null,
        created_by: null,
        created_at: '2026-05-02T00:00:00Z',
      },
    ])

    const rows = await cashFlowService.getMonthlyProjection('p1')

    // Verifica orden ascendente por mes.
    expect(rows.map((r) => r.month)).toEqual(['2026-06', '2026-07'])

    const june = rows.find((r) => r.month === '2026-06')!
    expect(june.planned_outflow).toBe(11000) // 10000 + 1000
    expect(june.actual_outflow).toBe(5200) // 5000 (payroll) + 200 (transaction)
    expect(june.planned_inflow).toBe(100000)
    expect(june.actual_inflow).toBe(0) // placeholder
    expect(june.net_planned).toBe(100000 - 11000)
    expect(june.net_actual).toBe(0 - 5200)

    const july = rows.find((r) => r.month === '2026-07')!
    expect(july.planned_outflow).toBe(1000)
    expect(july.actual_outflow).toBe(3800) // 3000 + 800
    expect(july.planned_inflow).toBe(50000)
    expect(july.net_planned).toBe(50000 - 1000)
    expect(july.net_actual).toBe(0 - 3800)
  })

  it('sin categorías: salta el query a budget_items', async () => {
    mockSelectEqChain([]) // budget_categories vacío
    // NO se mockea budget_items porque el service no debe llamarlo.
    mockSelectEqInChain([{ grand_total: 1000, report_date: '2026-06-15' }])
    mockSelectEqChain([]) // transactions vacío
    mockSelectEqOrderChain([]) // sin inflows

    const rows = await cashFlowService.getMonthlyProjection('p1')

    expect(rows).toHaveLength(1)
    expect(rows[0].month).toBe('2026-06')
    expect(rows[0].planned_outflow).toBe(0)
    expect(rows[0].actual_outflow).toBe(1000)
    expect(rows[0].planned_inflow).toBe(0)

    // Confirma que sólo se hicieron 4 calls a from(), NO 5.
    expect(fromMock).toHaveBeenCalledTimes(4)
    expect(fromMock).toHaveBeenNthCalledWith(1, 'budget_categories')
    expect(fromMock).toHaveBeenNthCalledWith(2, 'payroll_periods')
    expect(fromMock).toHaveBeenNthCalledWith(3, 'transactions')
    expect(fromMock).toHaveBeenNthCalledWith(4, 'expected_cash_inflows')
  })

  it('datos nulos/vacíos en todos los queries: retorna []', async () => {
    mockSelectEqChain(null) // budget_categories null
    mockSelectEqInChain(null) // payrolls null
    mockSelectEqChain(null) // transactions null
    mockSelectEqOrderChain(null) // inflows null

    const rows = await cashFlowService.getMonthlyProjection('p1')
    expect(rows).toEqual([])
  })

  it('error: propaga error de listExpectedInflows (último paso)', async () => {
    mockSelectEqChain([]) // budget_categories
    mockSelectEqInChain([]) // payrolls
    mockSelectEqChain([]) // transactions
    mockSelectEqOrderChain(null, { message: 'inflows fail' })

    await expect(cashFlowService.getMonthlyProjection('p1')).rejects.toEqual({
      message: 'inflows fail',
    })
  })
})
