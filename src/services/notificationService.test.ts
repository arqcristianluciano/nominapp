import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---- Mock @/lib/supabase ------------------------------------------------
//
// notificationService.getAll lanza un Promise.all con 9 queries en este
// orden exacto:
//   0  purchase_requisitions (po)
//   1  quality_control overdue
//   2  quality_control failed
//   3  transactions CxP danger (>60d)
//   4  transactions CxP warning (31-60d)
//   5  budget_categories
//   6  transactions (ejecución presupuestal)
//   7  projects
//   8  contractor_documents
//
// Cada query encadena .select(...).eq/lte/gt/is/order/limit(...). El último
// eslabón se "awaitea" (es un thenable) y debe resolver { data, error }.
//
// Para soportar esto modelamos cada llamada a supabase.from(...) como un
// chain *independiente* que devuelve {data, error} prefijado por test, según
// el orden de llamada. Así podemos dar respuestas distintas a cada query del
// Promise.all sin acoplarnos al nombre de la tabla.

type QueryResult = { data: unknown; error: unknown }

// Cola FIFO de resultados que el test configura antes de invocar getAll.
let resultsQueue: QueryResult[] = []
// Si un test quiere que UNA query falle con throw (no con error), lo marca
// con el índice y al alcanzarlo el chain hace reject de la promesa.
let rejectAtIndex: number | null = null
let callIndex = 0

function makeChain(): unknown {
  // Cualquier método chainable devuelve el mismo chain; el await final
  // dispara el resolve/reject con el resultado correspondiente.
  const chain: Record<string, unknown> = {}
  const passthroughMethods = [
    'select',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'is',
    'in',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'not',
    'or',
    'filter',
    'match',
    'range',
  ]
  for (const m of passthroughMethods) {
    chain[m] = vi.fn(() => chain)
  }
  // Thenable: resuelve (o rechaza) según el índice global de query.
  chain.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => {
    const idx = callIndex++
    if (rejectAtIndex === idx) {
      const err = new Error(`mock supabase rejection at index ${idx}`)
      if (reject) return reject(err)
      throw err
    }
    const result = resultsQueue[idx] ?? { data: [], error: null }
    return resolve(result)
  }
  return chain
}

const fromMock = vi.fn(() => makeChain())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: Parameters<typeof fromMock>) => fromMock(...args),
  },
}))

// Import DESPUÉS del mock para que el service vea el módulo mockeado.
import { notificationService } from './notificationService'

/** Configura las 9 respuestas del Promise.all en orden. Falta = []. */
function setQueryResults(results: Partial<Record<number, QueryResult>>) {
  resultsQueue = []
  for (let i = 0; i < 9; i++) {
    resultsQueue[i] = results[i] ?? { data: [], error: null }
  }
}

beforeEach(() => {
  fromMock.mockClear()
  resultsQueue = []
  rejectAtIndex = null
  callIndex = 0
})

describe('notificationService.getAll', () => {
  it('sin proyectos activos (todas las queries vacías) retorna []', async () => {
    setQueryResults({}) // todas vacías

    const notifications = await notificationService.getAll()

    expect(notifications).toEqual([])
    expect(fromMock).toHaveBeenCalledTimes(9)
  })

  it('con "stock bajo" (purchase_requisition pendiente: nivel warning) emite notificación', async () => {
    // notificationService no consulta `inventory` ni emite tipo 'stock';
    // el equivalente warning más cercano es una OC pendiente de aprobación,
    // que mapea a stock/compras bajas. Verificamos que getAll devuelve una
    // notificación warning con id prefijado por 'po-'.
    setQueryResults({
      0: {
        data: [
          {
            id: 'req-1',
            req_number: 'REQ-001',
            project: { name: 'Obra Norte' },
          },
        ],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      id: 'po-req-1',
      level: 'warning',
      title: 'OC pendiente de aprobación',
    })
    expect(notifications[0].description).toContain('REQ-001')
    expect(notifications[0].description).toContain('Obra Norte')
  })

  it('con CxP vencida (+60 días) emite notificación cxp-danger', async () => {
    // La query index 3 es transactions con date <= dangerDate (-60d).
    // Una transacción a crédito con fecha vieja debe disparar 'cxp-danger-*'.
    const oldDate = '2020-01-01' // bien antes de hoy - 60d
    setQueryResults({
      3: {
        data: [
          {
            id: 'tx-cxp-1',
            description: 'Factura A',
            total: 150000,
            date: oldDate,
            project_id: 'proj-1',
            payment_condition: 'Crédito 30 días',
            supplier: { name: 'Proveedor X' },
          },
        ],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const cxp = notifications.find((n) => n.id.startsWith('cxp-'))
    expect(cxp).toBeDefined()
    expect(cxp).toMatchObject({
      id: 'cxp-danger-tx-cxp-1',
      level: 'danger',
      title: 'CxP vencida (+60 días)',
    })
    expect(cxp!.description).toContain('Proveedor X')
    expect(cxp!.link).toBe('/proyectos/proj-1/control')
  })

  it('si una de las queries del Promise.all rechaza, getAll lanza', async () => {
    // Forzamos que la 4a query (índice 3, txnDangerRes) rechace la promesa.
    setQueryResults({})
    rejectAtIndex = 3

    await expect(notificationService.getAll()).rejects.toThrow(
      /mock supabase rejection at index 3/,
    )
  })
})
