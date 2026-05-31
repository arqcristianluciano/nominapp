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

// delete y deleteMany registran auditoría vía approvalsService.log(...).catch(...).
// Lo mockeamos para no depender de su implementación real ni de su tabla.
const approvalsLogMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/services/approvalsService', () => ({
  approvalsService: {
    log: (...args: unknown[]) => approvalsLogMock(...args),
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

/**
 * Helper: dos cadenas seguidas para delete(id):
 *   1) from('budget_categories').select('*').eq('id', id).single()  -> { data: category }
 *   2) from('budget_categories').delete().eq('id', id)              -> { error }
 */
function mockDeleteByIdChains(categoryRow: unknown, deleteError: unknown = null, selectError: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data: categoryRow, error: selectError })
  const eqSelectMock = vi.fn().mockReturnValue({ single: singleMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqSelectMock })
  fromMock.mockReturnValueOnce({ select: selectMock })

  const eqDeleteMock = vi.fn().mockResolvedValue({ error: deleteError })
  const deleteMock = vi.fn().mockReturnValue({ eq: eqDeleteMock })
  fromMock.mockReturnValueOnce({ delete: deleteMock })

  return { selectMock, eqSelectMock, singleMock, deleteMock, eqDeleteMock }
}

/**
 * Helper: dos cadenas seguidas para deleteMany(ids):
 *   1) from('budget_categories').select('*').in('id', ids) -> { data: categories }
 *   2) from('budget_categories').delete().in('id', ids)    -> { error }
 */
function mockDeleteManyChains(categories: unknown, deleteError: unknown = null, selectError: unknown = null) {
  const inSelectMock = vi.fn().mockResolvedValue({ data: categories, error: selectError })
  const selectMock = vi.fn().mockReturnValue({ in: inSelectMock })
  fromMock.mockReturnValueOnce({ select: selectMock })

  const inDeleteMock = vi.fn().mockResolvedValue({ error: deleteError })
  const deleteMock = vi.fn().mockReturnValue({ in: inDeleteMock })
  fromMock.mockReturnValueOnce({ delete: deleteMock })

  return { selectMock, inSelectMock, deleteMock, inDeleteMock }
}

beforeEach(() => {
  fromMock.mockReset()
  approvalsLogMock.mockReset()
  approvalsLogMock.mockResolvedValue(undefined)
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

    const result = await budgetCategoryService.bulkCreate('pA', [{ code: '10', name: 'Acabados', sort_order: 10 }])

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
    await expect(budgetCategoryService.bulkCreate('pA', [{ code: '10', name: 'x', sort_order: 1 }])).rejects.toEqual({
      message: 'fail-insert',
    })
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

describe('budgetCategoryService.delete', () => {
  it('lee la partida previa, la borra por id y loguea auditoría', async () => {
    const category = {
      id: 'bc-del',
      project_id: 'pA',
      code: '02',
      name: 'Demoliciones',
      sort_order: 2,
      budgeted_amount: 0,
    }
    const { selectMock, eqSelectMock, singleMock, deleteMock, eqDeleteMock } = mockDeleteByIdChains(category)

    await budgetCategoryService.delete('bc-del')

    expect(fromMock).toHaveBeenCalledTimes(2)
    expect(fromMock).toHaveBeenNthCalledWith(1, 'budget_categories')
    expect(fromMock).toHaveBeenNthCalledWith(2, 'budget_categories')

    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqSelectMock).toHaveBeenCalledWith('id', 'bc-del')
    expect(singleMock).toHaveBeenCalledTimes(1)

    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(eqDeleteMock).toHaveBeenCalledWith('id', 'bc-del')

    expect(approvalsLogMock).toHaveBeenCalledTimes(1)
    expect(approvalsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'budget_category',
        entity_id: 'bc-del',
        action: 'delete',
        payload_before: category,
      }),
    )
  })

  it('propaga error si el delete falla y NO loguea', async () => {
    mockDeleteByIdChains({ id: 'bc-del' }, { message: 'delete fail' })
    await expect(budgetCategoryService.delete('bc-del')).rejects.toEqual({
      message: 'delete fail',
    })
    expect(approvalsLogMock).not.toHaveBeenCalled()
  })

  it('si el log de auditoría falla, NO propaga (sólo console.warn)', async () => {
    approvalsLogMock.mockRejectedValueOnce(new Error('audit down'))
    mockDeleteByIdChains({ id: 'bc-del' })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(budgetCategoryService.delete('bc-del')).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })
})

describe('budgetCategoryService.deleteMany', () => {
  it('con ids vacío retorna [] sin tocar supabase ni loguear', async () => {
    const result = await budgetCategoryService.deleteMany([])
    expect(result).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
    expect(approvalsLogMock).not.toHaveBeenCalled()
  })

  it('borra el set por id con .in(...), loguea por partida y devuelve las filas borradas', async () => {
    const categories = [
      { id: 'bc1', name: 'Demoliciones' },
      { id: 'bc2', name: 'Estructura' },
    ]
    const { selectMock, inSelectMock, deleteMock, inDeleteMock } = mockDeleteManyChains(categories)

    const result = await budgetCategoryService.deleteMany(['bc1', 'bc2'])

    expect(fromMock).toHaveBeenCalledTimes(2)
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(inSelectMock).toHaveBeenCalledWith('id', ['bc1', 'bc2'])

    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(inDeleteMock).toHaveBeenCalledWith('id', ['bc1', 'bc2'])

    // Una entrada de auditoría por cada partida borrada.
    expect(approvalsLogMock).toHaveBeenCalledTimes(2)
    expect(approvalsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'budget_category',
        entity_id: 'bc1',
        action: 'delete',
        payload_before: categories[0],
      }),
    )
    expect(approvalsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: 'bc2', payload_before: categories[1] }),
    )

    // Devuelve las filas borradas (para poder "deshacer").
    expect(result).toEqual(categories)
  })

  it('propaga error si el delete falla y NO loguea', async () => {
    mockDeleteManyChains([{ id: 'bc1' }], { message: 'bulk delete fail' })
    await expect(budgetCategoryService.deleteMany(['bc1'])).rejects.toEqual({
      message: 'bulk delete fail',
    })
    expect(approvalsLogMock).not.toHaveBeenCalled()
  })

  it('si el log de auditoría falla, NO propaga (sólo console.warn)', async () => {
    approvalsLogMock.mockRejectedValue(new Error('audit down'))
    mockDeleteManyChains([{ id: 'bc1' }])
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(budgetCategoryService.deleteMany(['bc1'])).resolves.toEqual([{ id: 'bc1' }])
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })
})

describe('budgetCategoryService.restore', () => {
  it('con lista vacía retorna [] y NO toca supabase', async () => {
    const result = await budgetCategoryService.restore('pA', [])
    expect(result).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('reinserta las partidas con project_id y sus datos, y loguea create (undo)', async () => {
    const toRestore = [
      {
        code: '2 - DEMOLICIONES',
        name: 'Demoliciones',
        sort_order: 2,
        budgeted_amount: 0,
        start_date: null,
        end_date: null,
      },
    ]
    const created = [{ id: 'bc-new', project_id: 'pA', ...toRestore[0] }]
    const { insertMock, selectMock } = mockInsertChain(created)

    const result = await budgetCategoryService.restore('pA', toRestore)

    expect(fromMock).toHaveBeenCalledWith('budget_categories')
    expect(insertMock).toHaveBeenCalledWith([
      {
        project_id: 'pA',
        code: '2 - DEMOLICIONES',
        name: 'Demoliciones',
        sort_order: 2,
        budgeted_amount: 0,
        start_date: null,
        end_date: null,
      },
    ])
    expect(selectMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(created)

    expect(approvalsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'budget_category',
        entity_id: 'bc-new',
        action: 'create',
        metadata: { undo: true },
      }),
    )
  })

  it('propaga error de supabase', async () => {
    mockInsertChain(null, { message: 'restore fail' })
    await expect(
      budgetCategoryService.restore('pA', [
        { code: 'x', name: 'x', sort_order: 1, budgeted_amount: 0, start_date: null, end_date: null },
      ]),
    ).rejects.toEqual({ message: 'restore fail' })
  })
})
