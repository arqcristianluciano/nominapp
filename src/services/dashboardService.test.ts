import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @/lib/supabase ANTES de importar el service.
// dashboardService usa Promise.all con DOS cadenas distintas en cada método:
//
//   getKPIs:
//     - from('payroll_periods').select(...).in('status', [...])           -> thenable en .in()
//     - from('transactions').select(...).order(...).limit(200)            -> thenable en .limit()
//
//   getRecentActivity:
//     - from('transactions').select(...).order(...).limit(5)              -> thenable en .limit()
//     - from('payroll_periods').select(...).order(...).limit(5)           -> thenable en .limit()
//
// Encolamos respuestas por tabla en `responsesByTable` y la implementación
// de `from()` toma la siguiente respuesta correspondiente. Cada cadena
// devuelta resuelve {data, error} en su último eslabón.
const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

import { dashboardService } from './dashboardService'

interface SupabaseResponse {
  data: unknown
  error: unknown
}

const responsesByTable: Record<string, SupabaseResponse[]> = {
  payroll_periods: [],
  transactions: [],
}

function queueResponse(table: 'payroll_periods' | 'transactions', response: SupabaseResponse) {
  responsesByTable[table].push(response)
}

/**
 * Construye un builder que cubre TODAS las cadenas usadas por dashboardService:
 *   .select().in()                        -> thenable
 *   .select().order().limit()             -> thenable
 *
 * Cada eslabón resuelve el mismo {data, error} (el último ejecutado en cada
 * cadena es el thenable). Como devolvemos el mismo objeto, encadenar
 * .select(...).order(...).limit(...) y luego await funciona transparente.
 */
function buildBuilder(response: SupabaseResponse) {
  const builder: Record<string, unknown> = {}
  const thenable = {
    then: (resolve: (value: SupabaseResponse) => unknown) => resolve(response),
  }
  builder.select = vi.fn(() => Object.assign(builder, thenable))
  builder.in = vi.fn(() => Object.assign(builder, thenable))
  builder.order = vi.fn(() => Object.assign(builder, thenable))
  builder.limit = vi.fn(() => Object.assign(builder, thenable))
  return builder
}

beforeAll(() => {
  // Congelamos el tiempo a 2026-05-21 (today) para que los filtros de mes
  // current vs prev sean deterministas.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-21T12:00:00Z'))
})

afterAll(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  fromMock.mockReset()
  responsesByTable.payroll_periods = []
  responsesByTable.transactions = []

  fromMock.mockImplementation((table: string) => {
    const queue = responsesByTable[table]
    if (!queue || queue.length === 0) {
      throw new Error(`No mock response queued for table "${table}"`)
    }
    const next = queue.shift()!
    return buildBuilder(next)
  })
})

describe('dashboardService.getKPIs', () => {
  it('sin proyectos (sin payrolls ni transacciones) retorna ceros', async () => {
    queueResponse('payroll_periods', { data: [], error: null })
    queueResponse('transactions', { data: [], error: null })

    const kpis = await dashboardService.getKPIs()

    expect(kpis).toEqual({
      totalInvested: 0,
      payrollsThisMonth: 0,
      cxpTotal: 0,
      prevInvested: 0,
      prevPayrolls: 0,
      prevCxp: 0,
    })
    // Sanity: se consultaron ambas tablas exactamente una vez.
    expect(fromMock).toHaveBeenCalledWith('payroll_periods')
    expect(fromMock).toHaveBeenCalledWith('transactions')
    expect(fromMock).toHaveBeenCalledTimes(2)
  })

  it('también retorna ceros cuando data viene null (sin filas)', async () => {
    queueResponse('payroll_periods', { data: null, error: null })
    queueResponse('transactions', { data: null, error: null })

    const kpis = await dashboardService.getKPIs()

    expect(kpis.totalInvested).toBe(0)
    expect(kpis.payrollsThisMonth).toBe(0)
    expect(kpis.cxpTotal).toBe(0)
    expect(kpis.prevInvested).toBe(0)
    expect(kpis.prevPayrolls).toBe(0)
    expect(kpis.prevCxp).toBe(0)
  })

  it('con transacciones suma correctamente CxP (mes actual + mes anterior)', async () => {
    // Hoy congelado: 2026-05-21
    // - Mes actual: 2026-05-01 .. 2026-05-31
    // - Mes anterior: 2026-04-01 .. 2026-04-30
    //
    // payrolls aportan a totalInvested (todos) y a prevInvested/prevPayrolls
    // sólo si created_at cae en abril.
    queueResponse('payroll_periods', {
      data: [
        // Mes actual (mayo): aporta a totalInvested y payrollsThisMonth
        { id: 'pr1', grand_total: 100_000, created_at: '2026-05-10', status: 'approved' },
        { id: 'pr2', grand_total: 50_000, created_at: '2026-05-15', status: 'paid' },
        // Mes anterior (abril): aporta a totalInvested, prevInvested, prevPayrolls
        { id: 'pr3', grand_total: 30_000, created_at: '2026-04-20', status: 'approved' },
        // grand_total null no rompe la suma
        { id: 'pr4', grand_total: null, created_at: '2026-05-01', status: 'paid' },
      ],
      error: null,
    })

    queueResponse('transactions', {
      data: [
        // Crédito en mayo: pendiente 8.000 (sin pago asociado)
        {
          id: 'tx1',
          total: 8_000,
          payment_condition: 'Credito',
          date: '2026-05-12',
          invoice_number: 'F-001',
          supplier_id: 'sup-1',
        },
        // Crédito en abril: pendiente 5.000 (sin pago) -> cae en prevCxp y cxpTotal
        {
          id: 'tx2',
          total: 5_000,
          payment_condition: 'Credito',
          date: '2026-04-15',
          invoice_number: 'F-002',
          supplier_id: 'sup-2',
        },
        // Contado (no crédito) -> no aporta a CxP
        {
          id: 'tx3',
          total: 2_000,
          payment_condition: 'Contado',
          date: '2026-05-05',
          invoice_number: 'F-003',
          supplier_id: 'sup-3',
        },
      ],
      error: null,
    })

    const kpis = await dashboardService.getKPIs()

    // totalInvested = 100k + 50k + 30k + 0 = 180k
    expect(kpis.totalInvested).toBe(180_000)
    // payrollsThisMonth = sólo los de mayo: pr1, pr2, pr4 = 3
    expect(kpis.payrollsThisMonth).toBe(3)
    // cxpTotal = créditos pendientes (sin pagos asociados) = 8.000 + 5.000 = 13.000
    expect(kpis.cxpTotal).toBe(13_000)
    // prevInvested = sólo abril = 30.000
    expect(kpis.prevInvested).toBe(30_000)
    // prevPayrolls = sólo abril = 1
    expect(kpis.prevPayrolls).toBe(1)
    // prevCxp = sólo el crédito de abril = 5.000
    expect(kpis.prevCxp).toBe(5_000)
  })
})

describe('dashboardService.getRecentActivity', () => {
  it('mergea payrolls + transactions y los ordena por date desc', async () => {
    // OJO: el merge usa created_at de cada fila como `date`. Probamos que el
    // orden final mezcla ambas fuentes correctamente.
    queueResponse('transactions', {
      data: [
        {
          id: 'tx-newest',
          description: 'Compra cemento',
          total: 1500,
          date: '2026-05-19',
          created_at: '2026-05-20T10:00:00Z', // más reciente del merge
          project_id: 'proj-A',
        },
        {
          id: 'tx-old',
          description: 'Compra clavos',
          total: 200,
          date: '2026-05-10',
          created_at: '2026-05-10T08:00:00Z', // el más antiguo
          project_id: 'proj-A',
        },
      ],
      error: null,
    })

    queueResponse('payroll_periods', {
      data: [
        {
          id: 'pr-mid',
          period_number: 7,
          grand_total: 25_000,
          report_date: '2026-05-15',
          created_at: '2026-05-15T09:00:00Z', // queda en medio del merge
          project_id: 'proj-B',
        },
        {
          id: 'pr-old',
          period_number: 6,
          grand_total: 18_000,
          report_date: '2026-05-12',
          created_at: '2026-05-12T09:00:00Z',
          project_id: 'proj-B',
        },
      ],
      error: null,
    })

    const activity = await dashboardService.getRecentActivity()

    // 2 transactions + 2 payrolls = 4 actividades
    expect(activity).toHaveLength(4)

    // Orden esperado por date (created_at) desc:
    //   tx-newest (2026-05-20) > pr-mid (2026-05-15) > pr-old (2026-05-12) > tx-old (2026-05-10)
    expect(activity.map((a) => a.id)).toEqual(['tx-newest', 'pr-mid', 'pr-old', 'tx-old'])

    // Verificamos shape de cada item (type, description, amount, projectId).
    expect(activity[0]).toMatchObject({
      id: 'tx-newest',
      type: 'transaction',
      description: 'Compra cemento',
      amount: 1500,
      projectId: 'proj-A',
    })
    expect(activity[1]).toMatchObject({
      id: 'pr-mid',
      type: 'payroll',
      description: 'Reporte No. 7',
      amount: 25_000,
      projectId: 'proj-B',
    })
    expect(activity[2]).toMatchObject({
      id: 'pr-old',
      type: 'payroll',
      description: 'Reporte No. 6',
      amount: 18_000,
    })
    expect(activity[3]).toMatchObject({
      id: 'tx-old',
      type: 'transaction',
    })

    // El timestamp de cada actividad debe estar en orden descendente estricto.
    const times = activity.map((a) => new Date(a.date).getTime())
    for (let i = 0; i < times.length - 1; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i + 1])
    }
  })

  it('payroll con grand_total null se mapea como amount=0', async () => {
    queueResponse('transactions', { data: [], error: null })
    queueResponse('payroll_periods', {
      data: [
        {
          id: 'pr-null',
          period_number: 1,
          grand_total: null,
          report_date: '2026-05-20',
          created_at: '2026-05-20T09:00:00Z',
          project_id: 'proj-C',
        },
      ],
      error: null,
    })

    const activity = await dashboardService.getRecentActivity()

    expect(activity).toHaveLength(1)
    expect(activity[0]).toMatchObject({
      id: 'pr-null',
      type: 'payroll',
      amount: 0,
      description: 'Reporte No. 1',
    })
  })

  it('limita el resultado a 8 actividades como máximo', async () => {
    // El service pide .limit(5) en cada query, así que como máximo recibe
    // 5+5=10 filas; el merge.slice(0, 8) las recorta a 8.
    queueResponse('transactions', {
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `tx${i}`,
        description: `tx ${i}`,
        total: 100 + i,
        date: `2026-05-${10 + i}`,
        created_at: `2026-05-${10 + i}T10:00:00Z`,
        project_id: 'p',
      })),
      error: null,
    })
    queueResponse('payroll_periods', {
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `pr${i}`,
        period_number: i,
        grand_total: 1000 * i,
        report_date: `2026-04-${10 + i}`,
        created_at: `2026-04-${10 + i}T10:00:00Z`,
        project_id: 'p',
      })),
      error: null,
    })

    const activity = await dashboardService.getRecentActivity()

    expect(activity).toHaveLength(8)
  })
})
