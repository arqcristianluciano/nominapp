import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @/lib/supabase ANTES de importar el service.
// Replica el patrón de loanService.test.ts: cada método del service arma una
// cadena distinta sobre supabase.from(...). Aquí construimos mocks
// reconfigurables por test que devuelvan {data, error} en el último eslabón.
const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

import { transactionService } from './transactionService'

/**
 * Helper: arma la cadena from('transactions').select(...).in('project_id', ids).order('date', ...)
 * Resuelve la cadena (que es thenable porque .order devuelve un PromiseLike) a {data, error}.
 */
function mockGetByProjectsChain(data: unknown, error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const inMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ in: inMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, inMock, orderMock }
}

/**
 * Helper: cadena from('transactions').select(...).eq('project_id', id).order('date', ...).
 */
function mockGetByProjectChain(data: unknown, error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock, orderMock }
}

/**
 * Helper: cadena from('transactions').update(updates).eq('id', id).select(...).single().
 */
function mockUpdateChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const eqMock = vi.fn().mockReturnValue({ select: selectMock })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ update: updateMock })
  return { updateMock, eqMock, selectMock, singleMock }
}

const SELECT_WITH_JOINS =
  '*, supplier:suppliers(id, name), budget_category:budget_categories(id, code, name), budget_item:budget_items(id, code, description)'

beforeEach(() => {
  fromMock.mockReset()
})

describe('transactionService.getByProjects', () => {
  it('con array vacío retorna [] y NO toca supabase', async () => {
    const result = await transactionService.getByProjects([])
    expect(result).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it("retorna filas con join supplier + budget_category para ['p1','p2']", async () => {
    const rows = [
      {
        id: 'tx1',
        project_id: 'p1',
        supplier_id: 'sp1',
        budget_category_id: 'bc1',
        date: '2026-05-10',
        total: 5000,
        supplier: { id: 'sp1', name: 'Proveedor 1' },
        budget_category: { id: 'bc1', code: '01', name: 'Estructura' },
      },
      {
        id: 'tx2',
        project_id: 'p2',
        supplier_id: 'sp2',
        budget_category_id: 'bc2',
        date: '2026-05-12',
        total: 10000,
        supplier: { id: 'sp2', name: 'Proveedor 2' },
        budget_category: { id: 'bc2', code: '02', name: 'Acabados' },
      },
    ]
    const { selectMock, inMock, orderMock } = mockGetByProjectsChain(rows)

    const result = await transactionService.getByProjects(['p1', 'p2'])

    expect(fromMock).toHaveBeenCalledWith('transactions')
    expect(selectMock).toHaveBeenCalledWith(SELECT_WITH_JOINS)
    expect(inMock).toHaveBeenCalledWith('project_id', ['p1', 'p2'])
    expect(orderMock).toHaveBeenCalledWith('date', { ascending: false })

    expect(result).toEqual(rows)
    expect(result).toHaveLength(2)
    // Cada fila trae los joins
    for (const row of result) {
      expect(row).toHaveProperty('supplier')
      expect(row).toHaveProperty('budget_category')
    }
    expect(result[0].supplier).toMatchObject({ id: 'sp1', name: 'Proveedor 1' })
    expect(result[1].budget_category).toMatchObject({ id: 'bc2', code: '02' })
  })

  it('propaga error de supabase', async () => {
    mockGetByProjectsChain(null, { message: 'boom' })
    await expect(transactionService.getByProjects(['p1'])).rejects.toEqual({ message: 'boom' })
  })
})

describe('transactionService.getByProject', () => {
  it('filtra por project_id, pide join supplier + budget_category y ordena por fecha desc', async () => {
    const rows = [
      {
        id: 'tx1',
        project_id: 'pX',
        supplier_id: 'sp1',
        budget_category_id: 'bc1',
        date: '2026-05-15',
        total: 1000,
        supplier: { id: 'sp1', name: 'Proveedor X' },
        budget_category: { id: 'bc1', code: '01', name: 'Cat X' },
      },
      {
        id: 'tx2',
        project_id: 'pX',
        supplier_id: 'sp1',
        budget_category_id: 'bc1',
        date: '2026-05-10',
        total: 500,
        supplier: { id: 'sp1', name: 'Proveedor X' },
        budget_category: { id: 'bc1', code: '01', name: 'Cat X' },
      },
    ]
    const { selectMock, eqMock, orderMock } = mockGetByProjectChain(rows)

    const result = await transactionService.getByProject('pX')

    expect(fromMock).toHaveBeenCalledWith('transactions')
    expect(selectMock).toHaveBeenCalledWith(SELECT_WITH_JOINS)
    expect(eqMock).toHaveBeenCalledWith('project_id', 'pX')
    expect(orderMock).toHaveBeenCalledWith('date', { ascending: false })

    expect(result).toEqual(rows)
    for (const row of result) {
      expect(row.project_id).toBe('pX')
      expect(row.supplier).toMatchObject({ id: 'sp1' })
      expect(row.budget_category).toMatchObject({ id: 'bc1' })
    }
  })

  it('propaga error de supabase', async () => {
    mockGetByProjectChain(null, { message: 'fail' })
    await expect(transactionService.getByProject('pX')).rejects.toEqual({ message: 'fail' })
  })
})

describe('transactionService.update', () => {
  it('hace update con los campos pasados, filtra por id y retorna la fila con joins', async () => {
    const updates = { description: 'Descripción actualizada', total: 250 }
    const updated = {
      id: 'tx-upd',
      project_id: 'p1',
      supplier_id: 'sp1',
      budget_category_id: 'bc1',
      description: 'Descripción actualizada',
      total: 250,
      supplier: { id: 'sp1', name: 'Proveedor 1' },
      budget_category: { id: 'bc1', code: '01', name: 'Cat 1' },
    }
    const { updateMock, eqMock, selectMock, singleMock } = mockUpdateChain(updated)

    const result = await transactionService.update('tx-upd', updates)

    expect(fromMock).toHaveBeenCalledWith('transactions')
    expect(updateMock).toHaveBeenCalledWith(updates)
    expect(eqMock).toHaveBeenCalledWith('id', 'tx-upd')
    expect(selectMock).toHaveBeenCalledWith(SELECT_WITH_JOINS)
    expect(singleMock).toHaveBeenCalledTimes(1)

    expect(result).toEqual(updated)
    expect(result.description).toBe('Descripción actualizada')
    expect(result.total).toBe(250)
    expect(result.supplier).toMatchObject({ id: 'sp1' })
    expect(result.budget_category).toMatchObject({ id: 'bc1' })
  })

  it('propaga error de supabase', async () => {
    mockUpdateChain(null, { message: 'update fail' })
    await expect(transactionService.update('tx-upd', { total: 1 })).rejects.toEqual({ message: 'update fail' })
  })
})
