import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @/lib/supabase ANTES de importar el service.
// Replica el patrón de transactionService.test.ts: cada método del service
// arma una cadena distinta sobre supabase.from(...). Aquí construimos mocks
// reconfigurables por test que devuelvan {data, error} en el último eslabón
// (normalmente .order(...), .single() o .select() según el caso).
const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

import { budgetCategoryService } from './budgetCategoryService'

/**
 * Helper: cadena from('budget_categories').select('*').eq('project_id', id).order('sort_order').
 */
function mockGetByProjectChain(data: unknown, error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock, orderMock }
}

/**
 * Helper: cadena from('budget_categories').select('*').in('project_id', ids).order('sort_order').
 */
function mockGetByProjectsChain(data: unknown, error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const inMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ in: inMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, inMock, orderMock }
}

/**
 * Helper: cadena from('budget_categories').update({...}).eq('id', id).select().single().
 * El service tiene `updateBudgetAmount` (no `update` genérico).
 */
function mockUpdateChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const eqMock = vi.fn().mockReturnValue({ select: selectMock })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ update: updateMock })
  return { updateMock, eqMock, selectMock, singleMock }
}

/**
 * Helper: cadena from('budget_categories').insert(rows).select().
 * El service tiene `bulkCreate` (no `create` simple).
 */
function mockInsertChain(data: unknown, error: unknown = null) {
  const selectMock = vi.fn().mockResolvedValue({ data, error })
  const insertMock = vi.fn().mockReturnValue({ select: selectMock })
  fromMock.mockReturnValueOnce({ insert: insertMock })
  return { insertMock, selectMock }
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('budgetCategoryService.getByProject', () => {
  it('filtra por project_id y ordena por sort_order', async () => {
    const rows = [
      {
        id: 'bc1',
        project_id: 'pA',
        code: '01',
        name: 'Preliminares',
        sort_order: 1,
        budgeted_amount: 0,
        start_date: null,
        end_date: null,
      },
      {
        id: 'bc2',
        project_id: 'pA',
        code: '02',
        name: 'Estructura',
        sort_order: 2,
        budgeted_amount: 50000,
        start_date: null,
        end_date: null,
      },
    ]
    const { selectMock, eqMock, orderMock } = mockGetByProjectChain(rows)

    const result = await budgetCategoryService.getByProject('pA')

    expect(fromMock).toHaveBeenCalledWith('budget_categories')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqMock).toHaveBeenCalledWith('project_id', 'pA')
    expect(orderMock).toHaveBeenCalledWith('sort_order')

    expect(result).toEqual(rows)
    expect(result).toHaveLength(2)
  })

  it('propaga error de supabase', async () => {
    mockGetByProjectChain(null, { message: 'fail-getByProject' })
    await expect(budgetCategoryService.getByProject('pA')).rejects.toEqual({
      message: 'fail-getByProject',
    })
  })
})

describe('budgetCategoryService.getByProjects', () => {
  it('con array vacío retorna [] y NO toca supabase', async () => {
    const result = await budgetCategoryService.getByProjects([])
    expect(result).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it("con ids hace 1 sola query usando .in('project_id', ids)", async () => {
    const rows = [
      {
        id: 'bc1',
        project_id: 'p1',
        code: '01',
        name: 'Preliminares',
        sort_order: 1,
        budgeted_amount: 0,
        start_date: null,
        end_date: null,
      },
      {
        id: 'bc2',
        project_id: 'p2',
        code: '02',
        name: 'Estructura',
        sort_order: 2,
        budgeted_amount: 100,
        start_date: null,
        end_date: null,
      },
    ]
    const { selectMock, inMock, orderMock } = mockGetByProjectsChain(rows)

    const result = await budgetCategoryService.getByProjects(['p1', 'p2'])

    // Una sola llamada a supabase.from (bulk), no una por proyecto.
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('budget_categories')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(inMock).toHaveBeenCalledTimes(1)
    expect(inMock).toHaveBeenCalledWith('project_id', ['p1', 'p2'])
    expect(orderMock).toHaveBeenCalledWith('sort_order')

    expect(result).toEqual(rows)
  })

  it('propaga error de supabase', async () => {
    mockGetByProjectsChain(null, { message: 'fail-getByProjects' })
    await expect(budgetCategoryService.getByProjects(['p1'])).rejects.toEqual({
      message: 'fail-getByProjects',
    })
  })
})

describe('budgetCategoryService.bulkCreate (create)', () => {
  it('con items vacío retorna [] y NO toca supabase', async () => {
    const result = await budgetCategoryService.bulkCreate('pA', [])
    expect(result).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('inserta filas mapeadas con project_id y budgeted_amount=0', async () => {
    const created = [
      {
        id: 'bc-new-1',
        project_id: 'pA',
        code: '10',
        name: 'Acabados',
        sort_order: 10,
        budgeted_amount: 0,
        start_date: null,
        end_date: null,
      },
    ]
    const { insertMock, selectMock } = mockInsertChain(created)

    const result = await budgetCategoryService.bulkCreate('pA', [
      { code: '10', name: 'Acabados', sort_order: 10 },
    ])

    expect(fromMock).toHaveBeenCalledWith('budget_categories')
    expect(insertMock).toHaveBeenCalledWith([
      {
        project_id: 'pA',
        code: '10',
        name: 'Acabados',
        sort_order: 10,
        budgeted_amount: 0,
      },
    ])
    expect(selectMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(created)
  })

  it('propaga error de supabase', async () => {
    mockInsertChain(null, { message: 'fail-insert' })
    await expect(
      budgetCategoryService.bulkCreate('pA', [{ code: '10', name: 'x', sort_order: 1 }]),
    ).rejects.toEqual({ message: 'fail-insert' })
  })
})

describe('budgetCategoryService.updateBudgetAmount (update)', () => {
  it('hace update de budgeted_amount, filtra por id y retorna la fila', async () => {
    const updated = {
      id: 'bc1',
      project_id: 'pA',
      code: '01',
      name: 'Preliminares',
      sort_order: 1,
      budgeted_amount: 12345,
      start_date: null,
      end_date: null,
    }
    const { updateMock, eqMock, selectMock, singleMock } = mockUpdateChain(updated)

    const result = await budgetCategoryService.updateBudgetAmount('bc1', 12345)

    expect(fromMock).toHaveBeenCalledWith('budget_categories')
    expect(updateMock).toHaveBeenCalledWith({ budgeted_amount: 12345 })
    expect(eqMock).toHaveBeenCalledWith('id', 'bc1')
    expect(selectMock).toHaveBeenCalledTimes(1)
    expect(singleMock).toHaveBeenCalledTimes(1)

    expect(result).toEqual(updated)
    expect(result.budgeted_amount).toBe(12345)
  })

  it('propaga error de supabase', async () => {
    mockUpdateChain(null, { message: 'fail-update' })
    await expect(budgetCategoryService.updateBudgetAmount('bc1', 99)).rejects.toEqual({
      message: 'fail-update',
    })
  })
})
