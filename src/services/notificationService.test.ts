import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---- Mock @/lib/supabase ------------------------------------------------
//
// notificationService.getAll lanza un Promise.all con 11 queries en este
// orden exacto:
//   0  purchase_requisitions (po)
//   1  quality_control overdue (sin test_date y pour_date pasado)
//   2  quality_control failed
//   3  transactions CxP danger (>60d)
//   4  transactions CxP warning (31-60d)
//   5  budget_categories
//   6  transactions (ejecución presupuestal)
//   7  projects
//   8  contractor_documents
//   9  loan_installments (cuotas pendientes próximas/vencidas)
//  10  quality_control upcoming test (sin test_date ni status, para fecha esperada)
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
  chain.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) => {
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

const TOTAL_QUERIES = 11

/** Configura las 11 respuestas del Promise.all en orden. Falta = []. */
function setQueryResults(results: Partial<Record<number, QueryResult>>) {
  resultsQueue = []
  for (let i = 0; i < TOTAL_QUERIES; i++) {
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
    expect(fromMock).toHaveBeenCalledTimes(TOTAL_QUERIES)
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

    await expect(notificationService.getAll()).rejects.toThrow(/mock supabase rejection at index 3/)
  })

  it('con cuota de préstamo vencida emite notificación loan-inst-overdue', async () => {
    // Query 9 es loan_installments pendientes próximas/vencidas.
    const pastDate = '2020-06-01' // mucho antes de hoy
    setQueryResults({
      9: {
        data: [
          {
            id: 'inst-1',
            loan_id: 'loan-1',
            numero_cuota: 3,
            fecha_pago_programada: pastDate,
            monto: 5000,
            loan: {
              contractor_id: 'cont-1',
              contractor: { name: 'Juan Pérez' },
            },
          },
        ],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const loanNotif = notifications.find((n) => n.id.startsWith('loan-inst-overdue-'))
    expect(loanNotif).toBeDefined()
    expect(loanNotif).toMatchObject({
      id: 'loan-inst-overdue-inst-1',
      level: 'danger',
      title: 'Cuota de préstamo vencida',
      link: '/prestamos',
    })
    expect(loanNotif!.description).toContain('Juan Pérez')
    expect(loanNotif!.description).toContain('cuota 3')
  })

  it('con cuota de préstamo próxima (≤7 días) emite notificación loan-inst-due warning', async () => {
    // Query 9: cuota que vence en 5 días
    const futureDate = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
    setQueryResults({
      9: {
        data: [
          {
            id: 'inst-2',
            loan_id: 'loan-2',
            numero_cuota: 1,
            fecha_pago_programada: futureDate,
            monto: 12000,
            loan: {
              contractor_id: 'cont-2',
              contractor: { name: 'María López' },
            },
          },
        ],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const loanNotif = notifications.find((n) => n.id.startsWith('loan-inst-due-'))
    expect(loanNotif).toBeDefined()
    expect(loanNotif).toMatchObject({
      id: 'loan-inst-due-inst-2',
      level: 'warning',
      title: 'Cuota de préstamo próxima a vencer',
      link: '/prestamos',
    })
    expect(loanNotif!.description).toContain('María López')
    expect(loanNotif!.description).toContain('cuota 1')
  })

  it('con ensayo de hormigón cuya fecha esperada ya venció emite notificación qc-test-overdue', async () => {
    // Query 10: registro de calidad sin result, con test_age que ya venció
    // Pour date: hace 35 días, test_age: "28 días" → fecha esperada = hace 7 días
    const pourDate = new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0]
    setQueryResults({
      10: {
        data: [
          {
            id: 'qc-upcoming-1',
            element: 'Columna C-1',
            pour_date: pourDate,
            test_age: '28 días',
            project_id: 'proj-2',
          },
        ],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const qcNotif = notifications.find((n) => n.id.startsWith('qc-test-overdue-'))
    expect(qcNotif).toBeDefined()
    expect(qcNotif).toMatchObject({
      id: 'qc-test-overdue-qc-upcoming-1',
      level: 'danger',
      title: 'Ensayo de hormigón vencido',
      link: '/proyectos/proj-2/calidad',
    })
    expect(qcNotif!.description).toContain('Columna C-1')
    expect(qcNotif!.description).toContain('28 días')
  })

  it('con ensayo de hormigón cuya fecha esperada es en ≤7 días emite notificación qc-test-due', async () => {
    // Pour date: hace 25 días, test_age: "28 días" → fecha esperada = en 3 días
    const pourDate = new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0]
    setQueryResults({
      10: {
        data: [
          {
            id: 'qc-upcoming-2',
            element: 'Viga V-3',
            pour_date: pourDate,
            test_age: '28 días',
            project_id: 'proj-3',
          },
        ],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const qcNotif = notifications.find((n) => n.id.startsWith('qc-test-due-'))
    expect(qcNotif).toBeDefined()
    expect(qcNotif).toMatchObject({
      id: 'qc-test-due-qc-upcoming-2',
      level: 'warning',
      title: 'Ensayo de hormigón próximo',
      link: '/proyectos/proj-3/calidad',
    })
    expect(qcNotif!.description).toContain('Viga V-3')
  })

  it('ensayo sin test_age no genera alerta qc-test', async () => {
    // Si no hay test_age, no se puede calcular la fecha esperada → sin alerta
    const pourDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    setQueryResults({
      10: {
        data: [
          {
            id: 'qc-nage-1',
            element: 'Losa L-1',
            pour_date: pourDate,
            test_age: null,
            project_id: 'proj-4',
          },
        ],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const qcNotif = notifications.find((n) => n.id.startsWith('qc-test-'))
    expect(qcNotif).toBeUndefined()
  })

  // --- Sobrecosto por capítulo ---

  it('capítulo al 95% de gasto emite notificación cat-overrun-warning', async () => {
    // Query 5: una categoría con presupuesto de 100 000
    // Query 6: transacciones que suman 95 000 con ese budget_category_id
    // Query 7: proyecto al que pertenece la categoría
    setQueryResults({
      5: {
        data: [{ id: 'cat-1', project_id: 'proj-A', name: 'Estructura', budgeted_amount: 100000 }],
        error: null,
      },
      6: {
        data: [
          {
            project_id: 'proj-A',
            total: 95000,
            budget_category_id: 'cat-1',
            budget_category: { code: 'EST-01' },
          },
        ],
        error: null,
      },
      7: {
        data: [{ id: 'proj-A', name: 'Edificio Central', code: 'EC-001' }],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const catNotif = notifications.find((n) => n.id === 'cat-overrun-warning-cat-1')
    expect(catNotif).toBeDefined()
    expect(catNotif).toMatchObject({
      id: 'cat-overrun-warning-cat-1',
      level: 'warning',
      title: 'Capítulo al límite (≥90%)',
      link: '/proyectos/proj-A/presupuesto',
    })
    expect(catNotif!.description).toContain('Edificio Central')
    expect(catNotif!.description).toContain('Estructura')
    expect(catNotif!.description).toContain('95%')
  })

  it('capítulo al 100% o más emite notificación cat-overrun-danger', async () => {
    // Query 5: categoría con presupuesto de 50 000
    // Query 6: gasto de 55 000 → 110% → danger
    setQueryResults({
      5: {
        data: [{ id: 'cat-2', project_id: 'proj-B', name: 'Acabados', budgeted_amount: 50000 }],
        error: null,
      },
      6: {
        data: [
          {
            project_id: 'proj-B',
            total: 55000,
            budget_category_id: 'cat-2',
            budget_category: { code: 'ACA-02' },
          },
        ],
        error: null,
      },
      7: {
        data: [{ id: 'proj-B', name: 'Torre Norte', code: 'TN-002' }],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const catNotif = notifications.find((n) => n.id === 'cat-overrun-danger-cat-2')
    expect(catNotif).toBeDefined()
    expect(catNotif).toMatchObject({
      id: 'cat-overrun-danger-cat-2',
      level: 'danger',
      title: 'Capítulo excedido',
      link: '/proyectos/proj-B/presupuesto',
    })
    expect(catNotif!.description).toContain('Torre Norte')
    expect(catNotif!.description).toContain('Acabados')
    expect(catNotif!.description).toContain('110%')
  })

  it('capítulo con presupuesto 0 no emite ninguna alerta de sobrecosto', async () => {
    setQueryResults({
      5: {
        data: [{ id: 'cat-3', project_id: 'proj-C', name: 'Varios', budgeted_amount: 0 }],
        error: null,
      },
      6: {
        data: [
          {
            project_id: 'proj-C',
            total: 1000,
            budget_category_id: 'cat-3',
            budget_category: { code: 'VAR-03' },
          },
        ],
        error: null,
      },
      7: {
        data: [{ id: 'proj-C', name: 'Proyecto C', code: 'PC-003' }],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const catNotif = notifications.find((n) => n.id.startsWith('cat-overrun-'))
    expect(catNotif).toBeUndefined()
  })

  it('capítulo con gasto 0 no emite ninguna alerta de sobrecosto', async () => {
    setQueryResults({
      5: {
        data: [{ id: 'cat-4', project_id: 'proj-D', name: 'Instalaciones', budgeted_amount: 80000 }],
        error: null,
      },
      // Query 6 vacía → sin transacciones para cat-4
      7: {
        data: [{ id: 'proj-D', name: 'Proyecto D', code: 'PD-004' }],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const catNotif = notifications.find((n) => n.id.startsWith('cat-overrun-'))
    expect(catNotif).toBeUndefined()
  })

  it('transacción de depósito no cuenta como gasto al calcular sobrecosto por capítulo', async () => {
    // Un depósito de 200 000 no debe disparar la alerta aunque supere el presupuesto
    setQueryResults({
      5: {
        data: [{ id: 'cat-5', project_id: 'proj-E', name: 'Depósitos', budgeted_amount: 100000 }],
        error: null,
      },
      6: {
        data: [
          {
            project_id: 'proj-E',
            total: 200000,
            budget_category_id: 'cat-5',
            budget_category: { code: '19 - DEPOSITOS' },
          },
        ],
        error: null,
      },
      7: {
        data: [{ id: 'proj-E', name: 'Proyecto E', code: 'PE-005' }],
        error: null,
      },
    })

    const notifications = await notificationService.getAll()

    const catNotif = notifications.find((n) => n.id.startsWith('cat-overrun-'))
    expect(catNotif).toBeUndefined()
  })
})
