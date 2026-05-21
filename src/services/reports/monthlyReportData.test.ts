import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for `loadMonthlyReportData`.
 *
 * Strategy: mock cada servicio de dominio (projectService, transactionService,
 * payrollService, budgetCategoryService, budgetItemService, cashFlowService) y
 * el cliente supabase usado para los detalles de nómina. Capturamos los
 * argumentos que la función pasa a `transactionService.getByProject` para
 * verificar el rango de fechas (incluyendo lógica de último día / año bisiesto).
 */

/* -------------------------------------------------------------------------- */
/* Mocks de servicios                                                         */
/* -------------------------------------------------------------------------- */

const projectGetById = vi.fn()
const transactionGetByProject = vi.fn()
const payrollGetPeriods = vi.fn()
const budgetCategoryGetByProject = vi.fn()
const budgetItemGetByProjectCategories = vi.fn()
const cashFlowGetMonthlyProjection = vi.fn()
const cashFlowListExpectedInflows = vi.fn()

vi.mock('@/services/projectService', () => ({
  projectService: {
    getById: (...args: unknown[]) => projectGetById(...args),
  },
}))

vi.mock('@/services/transactionService', () => ({
  transactionService: {
    getByProject: (...args: unknown[]) => transactionGetByProject(...args),
  },
}))

vi.mock('@/services/payrollService', () => ({
  payrollService: {
    getPeriods: (...args: unknown[]) => payrollGetPeriods(...args),
  },
  COMMITTED_PAYROLL_STATUSES: ['approved', 'paid'],
}))

vi.mock('@/services/budgetCategoryService', () => ({
  budgetCategoryService: {
    getByProject: (...args: unknown[]) => budgetCategoryGetByProject(...args),
  },
}))

vi.mock('@/services/budgetItemService', () => ({
  budgetItemService: {
    getByProjectCategories: (...args: unknown[]) =>
      budgetItemGetByProjectCategories(...args),
  },
}))

vi.mock('@/services/cashFlowService', () => ({
  cashFlowService: {
    getMonthlyProjection: (...args: unknown[]) =>
      cashFlowGetMonthlyProjection(...args),
    listExpectedInflows: (...args: unknown[]) => cashFlowListExpectedInflows(...args),
  },
}))

/**
 * Mock de supabase con cadena genérica.
 *
 * El servicio usa supabase para:
 *   - `loadPayrollDetails`:  from().select().in()           (tres veces)
 *   - `countDaysWorked`:     from().select().eq().gte().lte()
 *   - Otros KPIs:            chains similares (eq/gte/lte/in/order)
 *
 * Cada método terminal devuelve el mismo `chain` (thenable), de modo que un
 * `await` resuelve a `{ data: [], error: null }`. Los tests que quieran datos
 * específicos pueden sobreescribir vía `mockSupabaseData` antes del act.
 */
const supabaseData: unknown = []

function makeChain(): unknown {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const target: any = function () {}
  return new Proxy(target, {
    get(_t, prop) {
      // Thenable: `await chain` resuelve a { data, error }.
      if (prop === 'then') {
        return (resolve: (v: { data: unknown; error: null }) => unknown) =>
          resolve({ data: supabaseData, error: null })
      }
      // Cualquier otro acceso (select, eq, gte, lte, in, gt, lt, order, single,
      // maybeSingle, is, not, ...) devuelve una función que retorna el mismo
      // chain proxy para permitir cadenas arbitrarias.
      return () => makeChain()
    },
  })
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => makeChain(),
  },
}))

// Importar el servicio DESPUÉS de declarar los mocks.
import { loadMonthlyReportData } from './monthlyReportData'

/* -------------------------------------------------------------------------- */
/* Defaults razonables que cada test puede sobreescribir                      */
/* -------------------------------------------------------------------------- */

function setHappyPathDefaults(): void {
  projectGetById.mockResolvedValue({
    id: 'p-1',
    name: 'Proyecto Demo',
    company: { name: 'ACME S.R.L.' },
  })
  transactionGetByProject.mockResolvedValue([])
  payrollGetPeriods.mockResolvedValue([])
  budgetCategoryGetByProject.mockResolvedValue([])
  budgetItemGetByProjectCategories.mockResolvedValue([])
  cashFlowGetMonthlyProjection.mockResolvedValue([])
  cashFlowListExpectedInflows.mockResolvedValue([])
}

beforeEach(() => {
  projectGetById.mockReset()
  transactionGetByProject.mockReset()
  payrollGetPeriods.mockReset()
  budgetCategoryGetByProject.mockReset()
  budgetItemGetByProjectCategories.mockReset()
  cashFlowGetMonthlyProjection.mockReset()
  cashFlowListExpectedInflows.mockReset()
  setHappyPathDefaults()
})

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('loadMonthlyReportData - parsing yearMonth', () => {
  it('parsea "2026-05" a rango [2026-05-01, 2026-05-31] (mes de 31 días)', async () => {
    await loadMonthlyReportData('p-1', '2026-05')

    expect(transactionGetByProject).toHaveBeenCalledTimes(1)
    expect(transactionGetByProject).toHaveBeenCalledWith('p-1', {
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    })
  })

  it('parsea "2024-02" (año bisiesto) con 29 días', async () => {
    await loadMonthlyReportData('p-1', '2024-02')

    expect(transactionGetByProject).toHaveBeenCalledWith('p-1', {
      dateFrom: '2024-02-01',
      dateTo: '2024-02-29',
    })
  })

  it('parsea "2026-02" (año no bisiesto) con 28 días', async () => {
    await loadMonthlyReportData('p-1', '2026-02')

    expect(transactionGetByProject).toHaveBeenCalledWith('p-1', {
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
    })
  })

  it('lanza ante formato inválido de yearMonth', async () => {
    await expect(loadMonthlyReportData('p-1', '2026/05')).rejects.toThrow(
      /Invalid yearMonth/,
    )
  })

  it('lanza ante mes fuera de rango (00 / 13)', async () => {
    await expect(loadMonthlyReportData('p-1', '2026-13')).rejects.toThrow(
      /Invalid month/,
    )
  })
})

describe('loadMonthlyReportData - MonthlyReportInput shape', () => {
  it('retorna todas las secciones requeridas del MonthlyReportInput', async () => {
    const result = await loadMonthlyReportData('p-1', '2026-05')

    // Bloques de nivel superior.
    expect(result).toHaveProperty('project')
    expect(result).toHaveProperty('month')
    expect(result).toHaveProperty('executiveSummary')
    expect(result).toHaveProperty('budgetBreakdown')
    expect(result).toHaveProperty('cashflow')
    expect(result).toHaveProperty('payroll')

    // Mes parseado.
    expect(result.month).toEqual({ year: 2026, month: 5 })

    // Proyecto mapeado correctamente desde projectService.getById.
    expect(result.project).toEqual({
      id: 'p-1',
      name: 'Proyecto Demo',
      client: 'ACME S.R.L.',
      companyName: 'ACME S.R.L.',
    })

    // ExecutiveSummary expone los KPIs base.
    expect(result.executiveSummary).toMatchObject({
      totalBudget: expect.any(Number),
      totalInvested: expect.any(Number),
      variance: expect.any(Number),
      progressPercent: expect.any(Number),
      projectGrandTotal: expect.any(Number),
      daysWorked: expect.any(Number),
      activeContractors: expect.any(Number),
      partidasInProgress: expect.any(Number),
      materialsReceived: expect.any(Number),
      monthlyTransactions: expect.any(Number),
    })

    // BudgetBreakdown trae arreglo de categorías (vacío en happy path).
    expect(result.budgetBreakdown).toEqual({ categories: [] })

    // Cashflow trae las 5 sub-secciones esperadas.
    expect(result.cashflow).toMatchObject({
      collections: expect.objectContaining({ expected: 0, actual: 0 }),
      contractorPayments: expect.objectContaining({ expected: 0, actual: 0 }),
      supplierPayments: expect.objectContaining({ expected: 0, actual: 0 }),
      releasedPurchaseOrders: expect.objectContaining({ expected: 0, actual: 0 }),
      indirects: expect.objectContaining({ expected: 0, actual: 0 }),
    })

    // Payroll trae el resumen agregado.
    expect(result.payroll).toEqual({
      totalPaid: 0,
      entriesCount: 0,
      entries: [],
    })
  })
})

describe('loadMonthlyReportData - propagación de errores', () => {
  it('si projectService.getById rechaza, la función rechaza', async () => {
    projectGetById.mockRejectedValueOnce(new Error('project not found'))

    await expect(loadMonthlyReportData('p-1', '2026-05')).rejects.toThrow(
      'project not found',
    )
  })
})

describe('loadMonthlyReportData - executiveSummary aggregations', () => {
  it('totalBudget es la suma de (quantity * unit_price) de los budget items', async () => {
    budgetCategoryGetByProject.mockResolvedValue([
      { id: 'cat-1', code: 'C1', name: 'Cap 1', budgeted_amount: 0 },
      { id: 'cat-2', code: 'C2', name: 'Cap 2', budgeted_amount: 0 },
    ])
    budgetItemGetByProjectCategories.mockResolvedValue([
      // cat-1: 10 * 100 = 1000
      {
        id: 'it-1',
        budget_category_id: 'cat-1',
        code: 'I1',
        description: 'Item 1',
        quantity: 10,
        unit_price: 100,
      },
      // cat-1: 2 * 250 = 500
      {
        id: 'it-2',
        budget_category_id: 'cat-1',
        code: 'I2',
        description: 'Item 2',
        quantity: 2,
        unit_price: 250,
      },
      // cat-2: 5 * 80 = 400
      {
        id: 'it-3',
        budget_category_id: 'cat-2',
        code: 'I3',
        description: 'Item 3',
        quantity: 5,
        unit_price: 80,
      },
    ])

    const result = await loadMonthlyReportData('p-1', '2026-05')

    // 1000 + 500 + 400 = 1900
    expect(result.executiveSummary.totalBudget).toBe(1900)
  })

  it('cae a `budgeted_amount` cuando la categoría no tiene items detallados', async () => {
    budgetCategoryGetByProject.mockResolvedValue([
      { id: 'cat-1', code: 'C1', name: 'Cap 1', budgeted_amount: 750 },
    ])
    budgetItemGetByProjectCategories.mockResolvedValue([])

    const result = await loadMonthlyReportData('p-1', '2026-05')

    expect(result.executiveSummary.totalBudget).toBe(750)
  })

  it('monthlyTransactions equals length of returned transactions', async () => {
    transactionGetByProject.mockResolvedValue([
      { total: 100, payment_condition: null, budget_category_id: null, supplier_id: null, date: '2026-05-02' },
      { total: 200, payment_condition: null, budget_category_id: null, supplier_id: 's-1', date: '2026-05-15' },
      { total: 50, payment_condition: null, budget_category_id: null, supplier_id: null, date: '2026-05-22' },
    ])

    const result = await loadMonthlyReportData('p-1', '2026-05')

    expect(result.executiveSummary.monthlyTransactions).toBe(3)
  })
})
