import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---- Mock supabase con cadena thenable ---------------------------------
//
// Reusamos el mismo patron que adminService.test.ts: cada metodo terminal
// (select/insert/update/eq/order/single) retorna `chain` y el await final
// resuelve `_result`. Para getHistory el contractorService dispara 3
// llamadas a `supabase.from(...)` dentro de un Promise.all, por lo que
// necesitamos colas independientes de resultados (uno por tabla).

interface ChainResult<T = unknown> {
  data: T | null
  error: { code?: string; message?: string } | null
}

interface Chain {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  then: (resolve: (value: ChainResult) => unknown) => unknown
  _result: ChainResult
  _table?: string
}

// Cola de resultados por tabla para llamadas concurrentes (getHistory).
const tableResults: Record<string, ChainResult[]> = {}
// Resultado por defecto para llamadas no concurrentes (getAll/create/update).
let defaultResult: ChainResult = { data: null, error: null }

function makeChain(table: string): Chain {
  const chain: Chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then: (resolve) => {
      const queue = tableResults[table]
      const next = queue && queue.length > 0 ? queue.shift()! : chain._result
      return resolve(next)
    },
    _result: defaultResult,
    _table: table,
  }
  return chain
}

const from = vi.fn((table: string) => {
  const c = makeChain(table)
  c._result = defaultResult
  fromCalls.push({ table, chain: c })
  return c
})

// Tracking de cada chain creado por from(), para inspeccionar argumentos.
const fromCalls: Array<{ table: string; chain: Chain }> = []

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: Parameters<typeof from>) => from(...args),
  },
}))

// Import despues del mock.
import { contractorService } from './contractorService'

beforeEach(() => {
  from.mockClear()
  fromCalls.length = 0
  for (const k of Object.keys(tableResults)) delete tableResults[k]
  defaultResult = { data: null, error: null }
})

// ---- getAll ------------------------------------------------------------

describe('contractorService.getAll', () => {
  it('llama a from("contractors").select("*").order("name") y retorna data', async () => {
    const fakeContractors = [
      { id: 'c1', name: 'Albañil A', is_active: true },
      { id: 'c2', name: 'Plomero B', is_active: true },
    ]
    defaultResult = { data: fakeContractors, error: null }

    const result = await contractorService.getAll()

    expect(from).toHaveBeenCalledWith('contractors')
    const call = fromCalls[0]
    expect(call.chain.select).toHaveBeenCalledWith('*')
    expect(call.chain.order).toHaveBeenCalledWith('name')
    expect(result).toEqual(fakeContractors)
  })

  it('propaga el error de supabase', async () => {
    defaultResult = { data: null, error: { message: 'getAll failed' } }
    await expect(contractorService.getAll()).rejects.toMatchObject({
      message: 'getAll failed',
    })
  })
})

// ---- getById (no existe en el service) ---------------------------------

describe('contractorService.getById', () => {
  it('NO esta expuesto en contractorService (consumidores usan getAll + find)', () => {
    // Documentamos explicitamente: el service no tiene getById. El detalle
    // se obtiene desde ContractorDetail.tsx haciendo getAll() y filtrando.
    expect((contractorService as unknown as Record<string, unknown>).getById).toBeUndefined()
  })
})

// ---- create ------------------------------------------------------------

describe('contractorService.create', () => {
  it('hace insert + select + single y retorna el registro creado', async () => {
    const input = {
      name: 'Maestro Pedro',
      specialty: 'Albañilería',
      payment_method: 'transfer' as const,
    }
    const created = { id: 'c-new', ...input, is_active: true }
    defaultResult = { data: created, error: null }

    const result = await contractorService.create(input)

    expect(from).toHaveBeenCalledWith('contractors')
    const call = fromCalls[0]
    expect(call.chain.insert).toHaveBeenCalledWith(input)
    expect(call.chain.select).toHaveBeenCalledTimes(1)
    expect(call.chain.single).toHaveBeenCalledTimes(1)
    expect(result).toEqual(created)
  })

  it('propaga error de supabase si insert falla', async () => {
    defaultResult = { data: null, error: { message: 'insert failed' } }
    await expect(
      contractorService.create({ name: 'X' }),
    ).rejects.toMatchObject({ message: 'insert failed' })
  })
})

// ---- update ------------------------------------------------------------

describe('contractorService.update', () => {
  it('hace update con updated_at + eq("id", id) + select + single', async () => {
    const updated = { id: 'c1', name: 'Renombrado', is_active: false }
    defaultResult = { data: updated, error: null }

    const result = await contractorService.update('c1', { name: 'Renombrado' })

    expect(from).toHaveBeenCalledWith('contractors')
    const call = fromCalls[0]
    // El update recibe los campos + updated_at generado por el service.
    expect(call.chain.update).toHaveBeenCalledTimes(1)
    const updateArg = call.chain.update.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.name).toBe('Renombrado')
    expect(typeof updateArg.updated_at).toBe('string')
    // ISO valido y reciente.
    expect(Number.isNaN(Date.parse(updateArg.updated_at as string))).toBe(false)

    expect(call.chain.eq).toHaveBeenCalledWith('id', 'c1')
    expect(call.chain.select).toHaveBeenCalledTimes(1)
    expect(call.chain.single).toHaveBeenCalledTimes(1)
    expect(result).toEqual(updated)
  })

  it('propaga error de supabase si update falla', async () => {
    defaultResult = { data: null, error: { message: 'update failed' } }
    await expect(
      contractorService.update('c1', { name: 'X' }),
    ).rejects.toMatchObject({ message: 'update failed' })
  })
})

// ---- getHistory --------------------------------------------------------

describe('contractorService.getHistory', () => {
  it('dispara Promise.all de 3 queries (labor_line_items, projects, contract_cubications)', async () => {
    tableResults.labor_line_items = [
      {
        data: [
          {
            id: 'li1',
            contractor_id: 'c1',
            payroll_period: { id: 'pp1', project_id: 'p1' },
          },
        ],
        error: null,
      },
    ]
    tableResults.projects = [
      {
        data: [{ id: 'p1', name: 'Obra A', code: 'A-01', location: 'SD' }],
        error: null,
      },
    ]
    tableResults.contract_cubications = [
      { data: [{ id: 'cub1', contractor_id: 'c1' }], error: null },
    ]

    const result = await contractorService.getHistory('c1')

    // Verificamos exactamente las 3 tablas consultadas.
    const tables = fromCalls.map((c) => c.table).sort()
    expect(tables).toEqual(['contract_cubications', 'labor_line_items', 'projects'])
    expect(from).toHaveBeenCalledTimes(3)

    // Filtros aplicados sobre las queries que reciben contractor_id.
    const items = fromCalls.find((c) => c.table === 'labor_line_items')!
    expect(items.chain.eq).toHaveBeenCalledWith('contractor_id', 'c1')

    const cubs = fromCalls.find((c) => c.table === 'contract_cubications')!
    expect(cubs.chain.eq).toHaveBeenCalledWith('contractor_id', 'c1')

    // projects NO se filtra por contractor (lookup global para projectMap).
    const projects = fromCalls.find((c) => c.table === 'projects')!
    expect(projects.chain.eq).not.toHaveBeenCalled()

    // Forma del retorno y enriquecimiento de items con project via projectMap.
    expect(result.items).toHaveLength(1)
    expect(result.items[0].project).toEqual({
      id: 'p1',
      name: 'Obra A',
      code: 'A-01',
      location: 'SD',
    })
    expect(result.cubications).toEqual([{ id: 'cub1', contractor_id: 'c1' }])
    expect(result.projectMap['p1']).toBeDefined()
  })

  it('si la query de labor_line_items falla, propaga el error', async () => {
    tableResults.labor_line_items = [
      { data: null, error: { message: 'items boom' } },
    ]
    tableResults.projects = [{ data: [], error: null }]
    tableResults.contract_cubications = [{ data: [], error: null }]

    await expect(contractorService.getHistory('c1')).rejects.toMatchObject({
      message: 'items boom',
    })
    // Promise.all dispara las 3 igual: el throw ocurre despues de resolver todas.
    expect(from).toHaveBeenCalledTimes(3)
  })

  it('si la query de projects falla, propaga el error', async () => {
    tableResults.labor_line_items = [{ data: [], error: null }]
    tableResults.projects = [
      { data: null, error: { message: 'projects boom' } },
    ]
    tableResults.contract_cubications = [{ data: [], error: null }]

    await expect(contractorService.getHistory('c1')).rejects.toMatchObject({
      message: 'projects boom',
    })
    expect(from).toHaveBeenCalledTimes(3)
  })

  it('si la query de contract_cubications falla, propaga el error', async () => {
    tableResults.labor_line_items = [{ data: [], error: null }]
    tableResults.projects = [{ data: [], error: null }]
    tableResults.contract_cubications = [
      { data: null, error: { message: 'cubications boom' } },
    ]

    await expect(contractorService.getHistory('c1')).rejects.toMatchObject({
      message: 'cubications boom',
    })
    expect(from).toHaveBeenCalledTimes(3)
  })
})
