import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock supabase con cadena thenable, mismo patron que contractorService.test.ts:
// cada metodo terminal retorna `chain` y el await final resuelve un resultado.
// getBeneficiaries dispara 2 llamadas concurrentes (contractors, suppliers),
// por lo que usamos colas independientes por tabla.

interface ChainResult<T = unknown> {
  data: T | null
  error: { code?: string; message?: string } | null
}

interface Chain {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  then: (resolve: (value: ChainResult) => unknown) => unknown
  _result: ChainResult
}

const tableResults: Record<string, ChainResult[]> = {}
let defaultResult: ChainResult = { data: null, error: null }

function makeChain(table: string): Chain {
  const chain: Chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then: (resolve) => {
      const queue = tableResults[table]
      const next = queue && queue.length > 0 ? queue.shift()! : chain._result
      return resolve(next)
    },
    _result: defaultResult,
  }
  return chain
}

const fromCalls: Array<{ table: string; chain: Chain }> = []
const from = vi.fn((table: string) => {
  const c = makeChain(table)
  c._result = defaultResult
  fromCalls.push({ table, chain: c })
  return c
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: Parameters<typeof from>) => from(...args) },
}))

import { paymentDistributionService } from './paymentDistributionService'

beforeEach(() => {
  from.mockClear()
  fromCalls.length = 0
  for (const k of Object.keys(tableResults)) delete tableResults[k]
  defaultResult = { data: null, error: null }
})

describe('paymentDistributionService.getBeneficiaries', () => {
  it('combina contratistas y proveedores con su tipo y datos bancarios', async () => {
    tableResults.contractors = [
      {
        data: [
          {
            id: 'c1',
            name: 'Maestro Pedro',
            bank_name: 'Popular',
            bank_account: '123',
            payment_method: 'transfer',
            cedula: '001-1234567-8',
          },
        ],
        error: null,
      },
    ]
    tableResults.suppliers = [
      {
        data: [{ id: 's1', name: 'Ferretería Llibre', bank_name: 'BHD', bank_account: '456', rnc: '1-30-12345-6' }],
        error: null,
      },
    ]

    const result = await paymentDistributionService.getBeneficiaries()

    const tables = fromCalls.map((c) => c.table).sort()
    expect(tables).toEqual(['contractors', 'suppliers'])
    expect(result).toEqual([
      {
        id: 'c1',
        type: 'contractor',
        name: 'Maestro Pedro',
        bank_name: 'Popular',
        bank_account: '123',
        doc: '001-1234567-8',
        payment_method: 'transfer',
      },
      {
        id: 's1',
        type: 'supplier',
        name: 'Ferretería Llibre',
        bank_name: 'BHD',
        bank_account: '456',
        doc: '1-30-12345-6',
        payment_method: null,
      },
    ])
  })

  it('normaliza datos bancarios y payment_method faltantes a null', async () => {
    tableResults.contractors = [{ data: [{ id: 'c2', name: 'Sin Banco' }], error: null }]
    tableResults.suppliers = [{ data: [], error: null }]

    const result = await paymentDistributionService.getBeneficiaries()

    expect(result).toEqual([
      {
        id: 'c2',
        type: 'contractor',
        name: 'Sin Banco',
        bank_name: null,
        bank_account: null,
        doc: null,
        payment_method: null,
      },
    ])
  })

  it('propaga el error si falla la consulta de contractors', async () => {
    tableResults.contractors = [{ data: null, error: { message: 'contractors boom' } }]
    tableResults.suppliers = [{ data: [], error: null }]
    await expect(paymentDistributionService.getBeneficiaries()).rejects.toMatchObject({
      message: 'contractors boom',
    })
  })

  it('propaga el error si falla la consulta de suppliers', async () => {
    tableResults.contractors = [{ data: [], error: null }]
    tableResults.suppliers = [{ data: null, error: { message: 'suppliers boom' } }]
    await expect(paymentDistributionService.getBeneficiaries()).rejects.toMatchObject({
      message: 'suppliers boom',
    })
  })
})

describe('paymentDistributionService.getByPeriod', () => {
  it('consulta payment_distributions filtrando por periodo', async () => {
    const rows = [{ id: 'd1', payroll_period_id: 'p1', amount: 100 }]
    tableResults.payment_distributions = [{ data: rows, error: null }]

    const result = await paymentDistributionService.getByPeriod('p1')

    expect(from).toHaveBeenCalledWith('payment_distributions')
    const call = fromCalls[0]
    expect(call.chain.select).toHaveBeenCalledWith('*')
    expect(call.chain.eq).toHaveBeenCalledWith('payroll_period_id', 'p1')
    expect(result).toEqual(rows)
  })

  it('propaga el error de supabase', async () => {
    tableResults.payment_distributions = [{ data: null, error: { message: 'getByPeriod failed' } }]
    await expect(paymentDistributionService.getByPeriod('p1')).rejects.toMatchObject({
      message: 'getByPeriod failed',
    })
  })
})
