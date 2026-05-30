import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @/lib/supabase ANTES de importar el service.
// Replica el patrón de transactionService.test.ts: cada método del service arma
// una cadena distinta sobre supabase.from(...). Construimos mocks reconfigurables
// por test que devuelvan {data, error} en el último eslabón.
const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

// Mock approvalsService.log para verificar (o no) que se invocó tras update.
const logMock = vi.fn()
vi.mock('@/services/approvalsService', () => ({
  approvalsService: {
    log: (...args: unknown[]) => logMock(...args),
  },
}))

import { projectService } from './projectService'

const SELECT_WITH_COMPANY = '*, company:companies(*)'

// ---------- Helpers de cadena Supabase ----------

/** Helper: cadena from('projects').select('*, company:companies(*)').order('name'). */
function mockGetAllChain(data: unknown, error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ order: orderMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, orderMock }
}

/** Helper: cadena from('projects').select(...).eq('id', id).single(). */
function mockGetByIdChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ single: singleMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock, singleMock }
}

/** Helper: cadena from('projects').insert(...).select(...).single(). */
function mockCreateChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const insertMock = vi.fn().mockReturnValue({ select: selectMock })
  fromMock.mockReturnValueOnce({ insert: insertMock })
  return { insertMock, selectMock, singleMock }
}

/**
 * Helper: el fetch previo de indirectos en update.
 * Cadena from('projects').select('dt_percent,...').eq('id', id).single().
 */
function mockPrevIndirectsChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ single: singleMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock, singleMock }
}

/** Helper: cadena from('projects').update(...).eq('id', id).select(...).single(). */
function mockUpdateChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const eqMock = vi.fn().mockReturnValue({ select: selectMock })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ update: updateMock })
  return { updateMock, eqMock, selectMock, singleMock }
}

beforeEach(() => {
  fromMock.mockReset()
  logMock.mockReset()
  // Por defecto el log resuelve OK (no rechaza, no se loggea warning).
  logMock.mockResolvedValue(undefined)
})

// ---------- getAll ----------

describe('projectService.getAll', () => {
  it('pide select con join de company y ordena por name', async () => {
    const rows = [
      { id: 'p1', name: 'Aldea', company: { id: 'c1', name: 'Constructora A' } },
      { id: 'p2', name: 'Brisas', company: { id: 'c2', name: 'Constructora B' } },
    ]
    const { selectMock, orderMock } = mockGetAllChain(rows)

    const result = await projectService.getAll()

    expect(fromMock).toHaveBeenCalledWith('projects')
    expect(selectMock).toHaveBeenCalledWith(SELECT_WITH_COMPANY)
    expect(orderMock).toHaveBeenCalledWith('name')

    expect(result).toEqual(rows)
    for (const row of result) {
      expect(row).toHaveProperty('company')
    }
  })

  it('propaga error de supabase', async () => {
    mockGetAllChain(null, { message: 'getAll fail' })
    await expect(projectService.getAll()).rejects.toEqual({ message: 'getAll fail' })
  })
})

// ---------- getById ----------

describe('projectService.getById', () => {
  it('filtra por id y pide select con join de company', async () => {
    const row = {
      id: 'p1',
      name: 'Aldea',
      company_id: 'c1',
      company: { id: 'c1', name: 'Constructora A' },
    }
    const { selectMock, eqMock, singleMock } = mockGetByIdChain(row)

    const result = await projectService.getById('p1')

    expect(fromMock).toHaveBeenCalledWith('projects')
    expect(selectMock).toHaveBeenCalledWith(SELECT_WITH_COMPANY)
    expect(eqMock).toHaveBeenCalledWith('id', 'p1')
    expect(singleMock).toHaveBeenCalledTimes(1)

    expect(result).toEqual(row)
    expect(result.company).toMatchObject({ id: 'c1' })
  })

  it('propaga error de supabase', async () => {
    mockGetByIdChain(null, { message: 'not found' })
    await expect(projectService.getById('pX')).rejects.toEqual({ message: 'not found' })
  })
})

// ---------- create ----------

describe('projectService.create', () => {
  it('inserta con custom_indirects por defecto a [] cuando no se pasa, pide select con join', async () => {
    const inserted = {
      id: 'p-new',
      name: 'Nuevo',
      code: 'NEW-01',
      company_id: 'c1',
      custom_indirects: [],
      company: { id: 'c1', name: 'Constructora A' },
    }
    const { insertMock, selectMock, singleMock } = mockCreateChain(inserted)

    const result = await projectService.create({
      company_id: 'c1',
      name: 'Nuevo',
      code: 'NEW-01',
    })

    expect(fromMock).toHaveBeenCalledWith('projects')
    expect(insertMock).toHaveBeenCalledWith({
      company_id: 'c1',
      name: 'Nuevo',
      code: 'NEW-01',
      custom_indirects: [],
    })
    expect(selectMock).toHaveBeenCalledWith(SELECT_WITH_COMPANY)
    expect(singleMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(inserted)
    expect(result.company).toMatchObject({ id: 'c1' })
  })

  it('respeta custom_indirects si vienen explícitos', async () => {
    const customs = [{ id: 'ci1', name: 'Seguro', type: 'percent' as const, value: 1.5 }]
    const inserted = {
      id: 'p-new',
      name: 'Nuevo',
      code: 'NEW-02',
      company_id: 'c1',
      custom_indirects: customs,
      company: { id: 'c1', name: 'Constructora A' },
    }
    const { insertMock } = mockCreateChain(inserted)

    await projectService.create({
      company_id: 'c1',
      name: 'Nuevo',
      code: 'NEW-02',
      custom_indirects: customs,
    })

    expect(insertMock).toHaveBeenCalledWith({
      company_id: 'c1',
      name: 'Nuevo',
      code: 'NEW-02',
      custom_indirects: customs,
    })
  })

  it('propaga error de supabase', async () => {
    mockCreateChain(null, { message: 'create fail' })
    await expect(projectService.create({ company_id: 'c1', name: 'x', code: 'X' })).rejects.toEqual({
      message: 'create fail',
    })
  })
})

// ---------- update ----------

describe('projectService.update', () => {
  it('update SIN campos de indirectos: NO hace fetch previo, NO loguea a approvals, sí pide select con join', async () => {
    const updated = {
      id: 'p1',
      name: 'Aldea renombrada',
      company_id: 'c1',
      company: { id: 'c1', name: 'Constructora A' },
    }
    const { updateMock, eqMock, selectMock, singleMock } = mockUpdateChain(updated)

    const result = await projectService.update('p1', { name: 'Aldea renombrada' })

    // Sólo debe haber una llamada a from('projects'): la del UPDATE.
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenNthCalledWith(1, 'projects')

    // El update incluye los campos pasados + updated_at (lo dejamos pasar con objectContaining
    // sin atar el valor exacto del timestamp).
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(updateMock.mock.calls[0][0]).toMatchObject({ name: 'Aldea renombrada' })
    expect(updateMock.mock.calls[0][0]).toHaveProperty('updated_at')
    expect(typeof updateMock.mock.calls[0][0].updated_at).toBe('string')

    expect(eqMock).toHaveBeenCalledWith('id', 'p1')
    expect(selectMock).toHaveBeenCalledWith(SELECT_WITH_COMPANY)
    expect(singleMock).toHaveBeenCalledTimes(1)

    // Sin campos de indirectos => approvalsService.log NO se invoca.
    expect(logMock).not.toHaveBeenCalled()

    expect(result).toEqual(updated)
    expect(result.company).toMatchObject({ id: 'c1' })
  })

  it('update CON campo de indirectos (dt_percent) hace fetch previo y loguea a approvals con before/after', async () => {
    const before = {
      dt_percent: 5,
      admin_percent: 10,
      transport_percent: 2,
      planning_fee: 1,
      custom_indirects: [],
    }
    const updated = {
      id: 'p1',
      name: 'Aldea',
      company_id: 'c1',
      dt_percent: 8,
      admin_percent: 10,
      transport_percent: 2,
      planning_fee: 1,
      custom_indirects: [],
      company: { id: 'c1', name: 'Constructora A' },
    }

    // 1) fetch previo de indirectos
    const prevChain = mockPrevIndirectsChain(before)
    // 2) update real
    const updChain = mockUpdateChain(updated)

    const result = await projectService.update('p1', { dt_percent: 8 })

    // Dos llamadas a from('projects'): la del fetch previo y la del update.
    expect(fromMock).toHaveBeenCalledTimes(2)
    expect(fromMock).toHaveBeenNthCalledWith(1, 'projects')
    expect(fromMock).toHaveBeenNthCalledWith(2, 'projects')

    // El fetch previo pide SOLO los campos de indirectos (los 5 listados como INDIRECT_FIELDS).
    expect(prevChain.selectMock).toHaveBeenCalledTimes(1)
    const selectArg = prevChain.selectMock.mock.calls[0][0] as string
    expect(selectArg).toContain('dt_percent')
    expect(selectArg).toContain('admin_percent')
    expect(selectArg).toContain('transport_percent')
    expect(selectArg).toContain('planning_fee')
    expect(selectArg).toContain('custom_indirects')
    expect(prevChain.eqMock).toHaveBeenCalledWith('id', 'p1')
    expect(prevChain.singleMock).toHaveBeenCalledTimes(1)

    // El UPDATE incluye dt_percent + updated_at, sigue pidiendo join de company.
    expect(updChain.updateMock.mock.calls[0][0]).toMatchObject({ dt_percent: 8 })
    expect(updChain.updateMock.mock.calls[0][0]).toHaveProperty('updated_at')
    expect(updChain.eqMock).toHaveBeenCalledWith('id', 'p1')
    expect(updChain.selectMock).toHaveBeenCalledWith(SELECT_WITH_COMPANY)

    // approvalsService.log invocado UNA vez con before/after sólo de indirectos.
    expect(logMock).toHaveBeenCalledTimes(1)
    const logArg = logMock.mock.calls[0][0] as {
      entity_type: string
      entity_id: string
      action: string
      payload_before: Record<string, unknown>
      payload_after: Record<string, unknown>
    }
    expect(logArg.entity_type).toBe('project')
    expect(logArg.entity_id).toBe('p1')
    expect(logArg.action).toBe('update_indirects')
    // before tomado del fetch previo (pickIndirects sobre `before`)
    expect(logArg.payload_before).toEqual(before)
    // after debe traer SÓLO los campos de indirectos (pickIndirects sobre `updated`),
    // nada del resto (id, name, company, ...).
    expect(logArg.payload_after).toEqual({
      dt_percent: 8,
      admin_percent: 10,
      transport_percent: 2,
      planning_fee: 1,
      custom_indirects: [],
    })
    expect(logArg.payload_after).not.toHaveProperty('name')
    expect(logArg.payload_after).not.toHaveProperty('company')

    expect(result).toEqual(updated)
  })

  it('update con custom_indirects también dispara fetch previo + log', async () => {
    const newCustoms = [{ id: 'ci1', name: 'Seguro', type: 'percent' as const, value: 1 }]
    const before = {
      dt_percent: 0,
      admin_percent: 0,
      transport_percent: 0,
      planning_fee: 0,
      custom_indirects: [],
    }
    const updated = {
      id: 'p2',
      name: 'Otro',
      company_id: 'c1',
      dt_percent: 0,
      admin_percent: 0,
      transport_percent: 0,
      planning_fee: 0,
      custom_indirects: newCustoms,
      company: { id: 'c1', name: 'Constructora A' },
    }

    mockPrevIndirectsChain(before)
    mockUpdateChain(updated)

    await projectService.update('p2', { custom_indirects: newCustoms })

    expect(fromMock).toHaveBeenCalledTimes(2)
    expect(logMock).toHaveBeenCalledTimes(1)
    const logArg = logMock.mock.calls[0][0] as {
      payload_before: Record<string, unknown>
      payload_after: Record<string, unknown>
    }
    expect(logArg.payload_before).toEqual(before)
    // pickIndirects toma TODOS los INDIRECT_FIELDS presentes en el resultado del update,
    // no sólo los que vinieron en `updates`. Como `updated` trae los 5 campos, los 5 viajan.
    expect(logArg.payload_after).toEqual({
      dt_percent: 0,
      admin_percent: 0,
      transport_percent: 0,
      planning_fee: 0,
      custom_indirects: newCustoms,
    })
  })

  it('si el fetch previo no retorna fila, payload_before viaja como null al log', async () => {
    const updated = {
      id: 'p1',
      planning_fee: 50,
      dt_percent: 0,
      admin_percent: 0,
      transport_percent: 0,
      custom_indirects: [],
      company: { id: 'c1', name: 'Constructora A' },
    }

    // prev sin data (proyecto inexistente o RLS bloqueado): pickIndirects no se llama y before = null
    mockPrevIndirectsChain(null)
    mockUpdateChain(updated)

    await projectService.update('p1', { planning_fee: 50 })

    expect(logMock).toHaveBeenCalledTimes(1)
    const logArg = logMock.mock.calls[0][0] as { payload_before: unknown }
    expect(logArg.payload_before).toBeNull()
  })

  it('si approvalsService.log rechaza, el update NO falla (catch warn)', async () => {
    const before = {
      dt_percent: 1,
      admin_percent: 2,
      transport_percent: 3,
      planning_fee: 4,
      custom_indirects: [],
    }
    const updated = {
      id: 'p1',
      dt_percent: 9,
      admin_percent: 2,
      transport_percent: 3,
      planning_fee: 4,
      custom_indirects: [],
      company: { id: 'c1', name: 'Constructora A' },
    }

    mockPrevIndirectsChain(before)
    mockUpdateChain(updated)
    logMock.mockRejectedValueOnce(new Error('log down'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await projectService.update('p1', { dt_percent: 9 })

    expect(result).toEqual(updated)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('propaga error de supabase en el update real (sin campos de indirectos)', async () => {
    mockUpdateChain(null, { message: 'update fail' })
    await expect(projectService.update('p1', { name: 'x' })).rejects.toEqual({
      message: 'update fail',
    })
    expect(logMock).not.toHaveBeenCalled()
  })
})
