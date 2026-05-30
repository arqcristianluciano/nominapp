import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @/lib/supabase ANTES de importar el service.
// Cada método de budgetItemService arma una cadena distinta sobre
// supabase.from(...). Cada test re-define el último eslabón con {data, error}.
const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

// Mock approvalsService.log: budgetItemService.delete y deleteByCategory
// llaman a approvalsService.log(...).catch(...) tras borrar. No queremos
// que las pruebas dependan de su implementación real ni de su tabla.
const approvalsLogMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/services/approvalsService', () => ({
  approvalsService: {
    log: (...args: unknown[]) => approvalsLogMock(...args),
  },
}))

import { budgetItemService } from './budgetItemService'

/**
 * Helper: arma la cadena de getByCategoryId:
 *   from('budget_items').select('*').eq('budget_category_id', id).order('sort_order')
 */
function mockGetByCategoryChain(data: unknown, error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock, orderMock }
}

/**
 * Helper: arma la cadena de create:
 *   from('budget_items').insert(item).select().single()
 */
function mockCreateChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const insertMock = vi.fn().mockReturnValue({ select: selectMock })
  fromMock.mockReturnValueOnce({ insert: insertMock })
  return { insertMock, selectMock, singleMock }
}

/**
 * Helper: arma la cadena de update:
 *   from('budget_items').update(changes).eq('id', id).select().single()
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
 * Helper: arma DOS cadenas seguidas (en este orden) para delete(id):
 *   1) from('budget_items').select('*').eq('id', id).single()  -> { data: item }
 *   2) from('budget_items').delete().eq('id', id)               -> { error }
 */
function mockDeleteByIdChains(itemRow: unknown, deleteError: unknown = null, selectError: unknown = null) {
  // Cadena 1: select del item antes de borrar.
  const singleMock = vi.fn().mockResolvedValue({ data: itemRow, error: selectError })
  const eqSelectMock = vi.fn().mockReturnValue({ single: singleMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqSelectMock })
  fromMock.mockReturnValueOnce({ select: selectMock })

  // Cadena 2: delete con filtro por id.
  const eqDeleteMock = vi.fn().mockResolvedValue({ error: deleteError })
  const deleteMock = vi.fn().mockReturnValue({ eq: eqDeleteMock })
  fromMock.mockReturnValueOnce({ delete: deleteMock })

  return { selectMock, eqSelectMock, singleMock, deleteMock, eqDeleteMock }
}

/**
 * Helper: dos cadenas seguidas para deleteByCategory(categoryId):
 *   1) from('budget_items').select('*').eq('budget_category_id', categoryId) -> { data: items }
 *   2) from('budget_items').delete().eq('budget_category_id', categoryId)    -> { error }
 */
function mockDeleteByCategoryChains(items: unknown, deleteError: unknown = null, selectError: unknown = null) {
  // Cadena 1: select de los items (resuelve como thenable en el eslabón .eq).
  const eqSelectMock = vi.fn().mockResolvedValue({ data: items, error: selectError })
  const selectMock = vi.fn().mockReturnValue({ eq: eqSelectMock })
  fromMock.mockReturnValueOnce({ select: selectMock })

  // Cadena 2: delete + eq.
  const eqDeleteMock = vi.fn().mockResolvedValue({ error: deleteError })
  const deleteMock = vi.fn().mockReturnValue({ eq: eqDeleteMock })
  fromMock.mockReturnValueOnce({ delete: deleteMock })

  return { selectMock, eqSelectMock, deleteMock, eqDeleteMock }
}

/**
 * Helper: cadena de bulkCreate:
 *   from('budget_items').insert(items).select()
 */
function mockBulkCreateChain(data: unknown, error: unknown = null) {
  const selectMock = vi.fn().mockResolvedValue({ data, error })
  const insertMock = vi.fn().mockReturnValue({ select: selectMock })
  fromMock.mockReturnValueOnce({ insert: insertMock })
  return { insertMock, selectMock }
}

beforeEach(() => {
  fromMock.mockReset()
  approvalsLogMock.mockReset()
  approvalsLogMock.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// getByCategoryId  (el "getByCategory" del enunciado)
// ---------------------------------------------------------------------------
describe('budgetItemService.getByCategoryId', () => {
  it('consulta budget_items filtrando por budget_category_id y ordena por sort_order', async () => {
    const rows = [
      {
        id: 'it1',
        budget_category_id: 'cat-1',
        code: '001',
        description: 'Hormigón H30',
        unit: 'm3',
        quantity: 10,
        unit_price: 100000,
        sort_order: 0,
        notes: null,
        start_date: null,
        end_date: null,
      },
      {
        id: 'it2',
        budget_category_id: 'cat-1',
        code: '002',
        description: 'Acero A630',
        unit: 'kg',
        quantity: 500,
        unit_price: 1200,
        sort_order: 1,
        notes: null,
        start_date: null,
        end_date: null,
      },
    ]
    const { selectMock, eqMock, orderMock } = mockGetByCategoryChain(rows)

    const result = await budgetItemService.getByCategoryId('cat-1')

    expect(fromMock).toHaveBeenCalledWith('budget_items')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqMock).toHaveBeenCalledWith('budget_category_id', 'cat-1')
    expect(orderMock).toHaveBeenCalledWith('sort_order')

    expect(result).toEqual(rows)
    expect(result).toHaveLength(2)
  })

  it('propaga error de supabase cuando error !== null', async () => {
    mockGetByCategoryChain(null, { message: 'select boom' })

    await expect(budgetItemService.getByCategoryId('cat-1')).rejects.toEqual({
      message: 'select boom',
    })
  })
})

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe('budgetItemService.create', () => {
  const newItem = {
    budget_category_id: 'cat-1',
    code: '003',
    description: 'Mano de obra encofrado',
    unit: 'm2',
    quantity: 20,
    unit_price: 5000,
    sort_order: 2,
    notes: null,
    start_date: null,
    end_date: null,
  }

  it('inserta en budget_items, pide select() + single() y retorna el row creado', async () => {
    const created = { id: 'it-new', ...newItem }
    const { insertMock, selectMock, singleMock } = mockCreateChain(created)

    const result = await budgetItemService.create(newItem)

    expect(fromMock).toHaveBeenCalledWith('budget_items')
    expect(insertMock).toHaveBeenCalledWith(newItem)
    expect(selectMock).toHaveBeenCalledTimes(1)
    expect(singleMock).toHaveBeenCalledTimes(1)

    expect(result).toEqual(created)
    expect(result.id).toBe('it-new')
  })

  it('propaga error de supabase si error !== null', async () => {
    mockCreateChain(null, { message: 'insert fail' })

    await expect(budgetItemService.create(newItem)).rejects.toEqual({ message: 'insert fail' })
  })
})

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
describe('budgetItemService.update', () => {
  it('hace update con los cambios, filtra por id y devuelve la fila', async () => {
    const changes = { quantity: 30, unit_price: 4500 }
    const updated = {
      id: 'it-upd',
      budget_category_id: 'cat-1',
      code: '003',
      description: 'Mano de obra encofrado',
      unit: 'm2',
      quantity: 30,
      unit_price: 4500,
      sort_order: 2,
      notes: null,
      start_date: null,
      end_date: null,
    }
    const { updateMock, eqMock, selectMock, singleMock } = mockUpdateChain(updated)

    const result = await budgetItemService.update('it-upd', changes)

    expect(fromMock).toHaveBeenCalledWith('budget_items')
    expect(updateMock).toHaveBeenCalledWith(changes)
    expect(eqMock).toHaveBeenCalledWith('id', 'it-upd')
    expect(selectMock).toHaveBeenCalledTimes(1)
    expect(singleMock).toHaveBeenCalledTimes(1)

    expect(result).toEqual(updated)
    expect(result.quantity).toBe(30)
    expect(result.unit_price).toBe(4500)
  })

  it('propaga error de supabase', async () => {
    mockUpdateChain(null, { message: 'update fail' })

    await expect(budgetItemService.update('it-upd', { quantity: 1 })).rejects.toEqual({
      message: 'update fail',
    })
  })
})

// ---------------------------------------------------------------------------
// delete (por id)
// ---------------------------------------------------------------------------
describe('budgetItemService.delete', () => {
  it('lee el item previo, lo borra por id y loguea aprobación', async () => {
    const item = {
      id: 'it-del',
      budget_category_id: 'cat-1',
      description: 'Item a borrar',
      unit: 'm2',
      quantity: 1,
      unit_price: 1000,
      sort_order: 0,
    }
    const { selectMock, eqSelectMock, singleMock, deleteMock, eqDeleteMock } = mockDeleteByIdChains(item)

    await budgetItemService.delete('it-del')

    // Ambas cadenas apuntan a la misma tabla.
    expect(fromMock).toHaveBeenCalledTimes(2)
    expect(fromMock).toHaveBeenNthCalledWith(1, 'budget_items')
    expect(fromMock).toHaveBeenNthCalledWith(2, 'budget_items')

    // Select previo.
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqSelectMock).toHaveBeenCalledWith('id', 'it-del')
    expect(singleMock).toHaveBeenCalledTimes(1)

    // Delete.
    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(eqDeleteMock).toHaveBeenCalledWith('id', 'it-del')

    // Audit log.
    expect(approvalsLogMock).toHaveBeenCalledTimes(1)
    expect(approvalsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'budget_item',
        entity_id: 'it-del',
        action: 'delete',
        payload_before: item,
      }),
    )
  })

  it('propaga error si el delete falla', async () => {
    mockDeleteByIdChains({ id: 'it-del' }, { message: 'delete fail' })

    await expect(budgetItemService.delete('it-del')).rejects.toEqual({ message: 'delete fail' })
    // Si el delete revienta antes de loguear, approvals.log no debe llamarse.
    expect(approvalsLogMock).not.toHaveBeenCalled()
  })

  it('si el log de auditoría falla, NO propaga (sólo console.warn)', async () => {
    approvalsLogMock.mockRejectedValueOnce(new Error('audit down'))
    mockDeleteByIdChains({ id: 'it-del' })
    // Silenciar console.warn para no contaminar el output.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(budgetItemService.delete('it-del')).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// deleteByCategory (cascada por budget_category_id)
// ---------------------------------------------------------------------------
describe('budgetItemService.deleteByCategory', () => {
  it('lee los items del capítulo, los borra en cascada y loguea cantidad en metadata', async () => {
    const items = [
      { id: 'it1', budget_category_id: 'cat-9' },
      { id: 'it2', budget_category_id: 'cat-9' },
      { id: 'it3', budget_category_id: 'cat-9' },
    ]
    const { selectMock, eqSelectMock, deleteMock, eqDeleteMock } = mockDeleteByCategoryChains(items)

    await budgetItemService.deleteByCategory('cat-9')

    expect(fromMock).toHaveBeenCalledTimes(2)
    expect(fromMock).toHaveBeenNthCalledWith(1, 'budget_items')
    expect(fromMock).toHaveBeenNthCalledWith(2, 'budget_items')

    // Select previo (sin .single porque pueden ser N filas).
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqSelectMock).toHaveBeenCalledWith('budget_category_id', 'cat-9')

    // Delete en cascada.
    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(eqDeleteMock).toHaveBeenCalledWith('budget_category_id', 'cat-9')

    // Audit log con conteo.
    expect(approvalsLogMock).toHaveBeenCalledTimes(1)
    expect(approvalsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'budget_category_items',
        entity_id: 'cat-9',
        action: 'delete_cascade',
        payload_before: items,
        metadata: { count: 3, budget_category_id: 'cat-9' },
      }),
    )
  })

  it('count=0 cuando no hay items y aun así loguea', async () => {
    mockDeleteByCategoryChains([])

    await budgetItemService.deleteByCategory('cat-vacio')

    expect(approvalsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { count: 0, budget_category_id: 'cat-vacio' },
      }),
    )
  })

  it('propaga error si el delete falla', async () => {
    mockDeleteByCategoryChains([{ id: 'it1' }], { message: 'cascade fail' })

    await expect(budgetItemService.deleteByCategory('cat-9')).rejects.toEqual({
      message: 'cascade fail',
    })
    expect(approvalsLogMock).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// bulkCreate
// ---------------------------------------------------------------------------
describe('budgetItemService.bulkCreate', () => {
  it('con array vacío retorna [] y NO toca supabase', async () => {
    const result = await budgetItemService.bulkCreate([])
    expect(result).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('inserta el ARRAY COMPLETO en una sola query (1 from + 1 insert)', async () => {
    const items = [
      {
        budget_category_id: 'cat-bulk',
        code: '001',
        description: 'Item A',
        unit: 'm2',
        quantity: 1,
        unit_price: 100,
        sort_order: 0,
        notes: null,
        start_date: null,
        end_date: null,
      },
      {
        budget_category_id: 'cat-bulk',
        code: '002',
        description: 'Item B',
        unit: 'm3',
        quantity: 2,
        unit_price: 200,
        sort_order: 1,
        notes: null,
        start_date: null,
        end_date: null,
      },
      {
        budget_category_id: 'cat-bulk',
        code: '003',
        description: 'Item C',
        unit: 'kg',
        quantity: 3,
        unit_price: 300,
        sort_order: 2,
        notes: null,
        start_date: null,
        end_date: null,
      },
    ]
    const created = items.map((it, i) => ({ id: `bulk-${i + 1}`, ...it }))
    const { insertMock, selectMock } = mockBulkCreateChain(created)

    const result = await budgetItemService.bulkCreate(items)

    // 1 sola query: 1 sola llamada a from, 1 sola a insert con el array entero.
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('budget_items')
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(insertMock).toHaveBeenCalledWith(items)
    // El argumento debe ser EXACTAMENTE el array completo (mismas N filas).
    const [insertedArg] = insertMock.mock.calls[0]
    expect(Array.isArray(insertedArg)).toBe(true)
    expect((insertedArg as unknown[]).length).toBe(items.length)
    expect(selectMock).toHaveBeenCalledTimes(1)

    expect(result).toEqual(created)
    expect(result).toHaveLength(3)
  })

  it('propaga error de supabase', async () => {
    mockBulkCreateChain(null, { message: 'bulk fail' })

    await expect(
      budgetItemService.bulkCreate([
        {
          budget_category_id: 'cat-bulk',
          code: null,
          description: 'X',
          unit: 'u',
          quantity: 1,
          unit_price: 1,
          sort_order: 0,
          notes: null,
          start_date: null,
          end_date: null,
        },
      ]),
    ).rejects.toEqual({ message: 'bulk fail' })
  })
})
