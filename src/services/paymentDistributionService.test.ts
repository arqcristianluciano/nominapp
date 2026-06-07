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

// Cola de resultados para rpc()
const rpcResults: ChainResult[] = []

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

const rpc = vi.fn(() => {
  const result = rpcResults.length > 0 ? rpcResults.shift()! : { data: null, error: null }
  return Promise.resolve(result)
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: Parameters<typeof from>) => from(...args),
    rpc: (...args: Parameters<typeof rpc>) => rpc(...args),
  },
}))

import { paymentDistributionService } from './paymentDistributionService'

beforeEach(() => {
  from.mockClear()
  rpc.mockClear()
  fromCalls.length = 0
  rpcResults.length = 0
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

describe('paymentDistributionService.addAmount', () => {
  it('suma el monto al pago existente y devuelve la fila actualizada', async () => {
    // Lectura previa (para log de auditoría)
    tableResults.payment_distributions = [
      { data: { id: 'd1', amount: 100, beneficiary: 'Maestro Pedro' }, error: null },
    ]
    // RPC atómica devuelve la fila con el nuevo monto
    rpcResults.push({ data: { id: 'd1', amount: 150, beneficiary: 'Maestro Pedro' }, error: null })

    const result = await paymentDistributionService.addAmount('d1', 50)

    // Verificar que se llamó al RPC con los parámetros correctos
    expect(rpc).toHaveBeenCalledWith('rpc_increment_payment_amount', {
      p_id: 'd1',
      p_delta: 50,
      p_period_cap: null,
    })
    expect(result).toEqual({ id: 'd1', amount: 150, beneficiary: 'Maestro Pedro' })
  })

  it('rechaza montos menores o iguales a cero', async () => {
    await expect(paymentDistributionService.addAmount('d1', 0)).rejects.toThrow('mayor que cero')
    expect(from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('propaga el error si falla la lectura del pago a consolidar', async () => {
    tableResults.payment_distributions = [{ data: null, error: { message: 'read boom' } }]
    await expect(paymentDistributionService.addAmount('d1', 50)).rejects.toMatchObject({
      message: 'read boom',
    })
  })

  // A8: cap validation — addAmount debe rechazar si supera el tope del periodo
  it('rechaza si sumar el monto supera el tope del periodo (periodGrandTotal)', async () => {
    // pago existente: 80; tope: 100; intento sumar 50 → RPC rechaza
    tableResults.payment_distributions = [
      { data: { id: 'd1', payroll_period_id: 'p1', amount: 80, status: 'pending' }, error: null },
    ]
    // El RPC devuelve el error EXCEEDS_PERIOD_CAP
    rpcResults.push({
      data: null,
      error: { message: 'EXCEEDS_PERIOD_CAP: El monto excede el total pendiente por distribuir.' },
    })

    await expect(paymentDistributionService.addAmount('d1', 50, 100)).rejects.toThrow('excede el total')
  })

  // A8: filas canceladas no cuentan para el tope (verificado por el RPC en la DB)
  it('no cuenta filas canceladas al validar el tope en addAmount', async () => {
    // pago existente: 80; hay un pago cancelado de 500 que no debería contar; tope: 150
    // (80 + 50) = 130 <= 150 → el RPC acepta y devuelve la fila actualizada
    tableResults.payment_distributions = [
      { data: { id: 'd1', payroll_period_id: 'p1', amount: 80, status: 'pending' }, error: null },
    ]
    rpcResults.push({ data: { id: 'd1', amount: 130, payroll_period_id: 'p1', status: 'pending' }, error: null })

    const result = await paymentDistributionService.addAmount('d1', 50, 150)
    expect(result.amount).toBe(130)
    expect(rpc).toHaveBeenCalledWith('rpc_increment_payment_amount', {
      p_id: 'd1',
      p_delta: 50,
      p_period_cap: 150,
    })
  })
})

describe('paymentDistributionService.create', () => {
  // A7: filas canceladas no deben contar para el tope del periodo en create
  it('no cuenta filas canceladas al validar el tope en create', async () => {
    // hay un pago cancelado de 900 y uno activo de 40; tope: 100
    // intentar crear 55 => (40 + 55) = 95 <= 100 → debe pasar
    tableResults.payment_distributions = [
      // primera lectura: getByPeriod para el cap check
      {
        data: [
          { id: 'd1', payroll_period_id: 'p1', amount: 900, status: 'cancelled' },
          { id: 'd2', payroll_period_id: 'p1', amount: 40, status: 'pending' },
        ],
        error: null,
      },
      // segunda: insert devuelve la nueva fila
      { data: { id: 'd3', payroll_period_id: 'p1', amount: 55, status: 'pending' }, error: null },
    ]

    const result = await paymentDistributionService.create(
      {
        payroll_period_id: 'p1',
        bank_account_id: null,
        beneficiary: 'Nuevo',
        beneficiary_type: 'contractor',
        beneficiary_id: 'c1',
        bank_name: null,
        bank_account: null,
        beneficiary_doc: null,
        amount: 55,
        payment_method: 'transfer',
        check_number: null,
        status: 'pending',
        instructions: null,
        completed_at: null,
      },
      100,
    )
    expect(result.amount).toBe(55)
  })

  it('rechaza en create si las filas activas ya superan el tope (canceladas ignoradas)', async () => {
    // hay un pago activo de 80; uno cancelado de 900; tope: 100
    // intentar crear 30 => (80 + 30) = 110 > 100 → debe fallar
    tableResults.payment_distributions = [
      {
        data: [
          { id: 'd1', payroll_period_id: 'p1', amount: 80, status: 'pending' },
          { id: 'd2', payroll_period_id: 'p1', amount: 900, status: 'cancelled' },
        ],
        error: null,
      },
    ]

    await expect(
      paymentDistributionService.create(
        {
          payroll_period_id: 'p1',
          bank_account_id: null,
          beneficiary: 'Otro',
          beneficiary_type: 'contractor',
          beneficiary_id: 'c2',
          bank_name: null,
          bank_account: null,
          beneficiary_doc: null,
          amount: 30,
          payment_method: 'transfer',
          check_number: null,
          status: 'pending',
          instructions: null,
          completed_at: null,
        },
        100,
      ),
    ).rejects.toThrow('excede el total')
  })
})
