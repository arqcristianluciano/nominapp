/**
 * Monthly report data loader.
 *
 * Aggregates the data required by {@link generateMonthlyReport} for a given
 * project and reporting month. The loader composes the existing domain
 * services (transactions, payroll, budget categories/items, dashboard...) to
 * avoid duplicating data access logic and to keep the report consistent with
 * the rest of the application.
 *
 * Date filtering convention:
 *   - `yearMonth` follows the `YYYY-MM` format (e.g. `2026-05`).
 *   - Records are included when their date lies within the closed interval
 *     `[YYYY-MM-01, YYYY-MM-<last-day>]`.
 */
import { supabase } from '@/lib/supabase'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { budgetItemService } from '@/services/budgetItemService'
import { cashFlowService } from '@/services/cashFlowService'
import { COMMITTED_PAYROLL_STATUSES, payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { transactionService } from '@/services/transactionService'
import {
  INVENTORY_OUT_TYPE,
  inventoryOutCost,
  laborLineCost,
  materialInvoiceCost,
  transactionCost,
} from '@/utils/costoReal'
import type {
  BudgetCategory,
  BudgetItem,
  Contractor,
  IndirectCost,
  LaborLineItem,
  MaterialInvoice,
  PayrollPeriod,
} from '@/types/database'
import type { MonthlyReportInput } from '@/services/reports/pdfReportService'
import type { BudgetBreakdownCategory, BudgetBreakdownItem } from '@/services/reports/sections/budgetBreakdown'

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

const YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/

interface MonthRange {
  year: number
  /** 1-indexed (January = 1). */
  month: number
  /** Inclusive lower bound (`YYYY-MM-01`). */
  start: string
  /** Inclusive upper bound (`YYYY-MM-<last-day>`). */
  end: string
}

function parseYearMonth(yearMonth: string): MonthRange {
  const match = YEAR_MONTH_RE.exec(yearMonth)
  if (!match) {
    throw new Error(`Invalid yearMonth "${yearMonth}". Expected format: YYYY-MM`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in yearMonth "${yearMonth}". Expected 01-12.`)
  }
  // Day 0 of next month -> last day of current month.
  const lastDay = new Date(year, month, 0).getDate()
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(lastDay).padStart(2, '0')
  return {
    year,
    month,
    start: `${yearMonth}-01`,
    end: `${year}-${monthStr}-${dayStr}`,
  }
}

function withinRange(dateValue: string | null | undefined, range: MonthRange): boolean {
  if (!dateValue) return false
  const dateOnly = dateValue.slice(0, 10)
  return dateOnly >= range.start && dateOnly <= range.end
}

/* -------------------------------------------------------------------------- */
/* Internal data fetchers                                                     */
/* -------------------------------------------------------------------------- */

async function loadPayrollPeriodsInRange(projectId: string, range: MonthRange): Promise<PayrollPeriod[]> {
  const periods = await payrollService.getPeriods(projectId)
  return periods.filter((p) => withinRange(p.report_date, range))
}

interface PayrollDetails {
  laborItems: LaborLineItem[]
  materialInvoices: MaterialInvoice[]
  indirectCosts: IndirectCost[]
}

async function loadPayrollDetails(periodIds: string[]): Promise<PayrollDetails> {
  if (periodIds.length === 0) {
    return { laborItems: [], materialInvoices: [], indirectCosts: [] }
  }

  const [laborRes, materialsRes, indirectRes] = await Promise.all([
    supabase.from('labor_line_items').select('*, contractor:contractors(*)').in('payroll_period_id', periodIds),
    supabase.from('material_invoices').select('*, supplier:suppliers(*)').in('payroll_period_id', periodIds),
    supabase.from('indirect_costs').select('*').in('payroll_period_id', periodIds),
  ])

  return {
    laborItems: (laborRes.data ?? []) as LaborLineItem[],
    materialInvoices: (materialsRes.data ?? []) as MaterialInvoice[],
    indirectCosts: (indirectRes.data ?? []) as IndirectCost[],
  }
}

async function loadAllCommittedPayrollsInRange(projectId: string, range: MonthRange): Promise<PayrollPeriod[]> {
  // Para variance vs presupuesto y total invertido a la fecha, queremos
  // sólo nóminas comprometidas (approved/paid). Esto coincide con el
  // criterio usado en `cashFlowService` y `dashboardService`.
  const periods = await payrollService.getPeriods(projectId)
  return periods.filter((p) => COMMITTED_PAYROLL_STATUSES.includes(p.status) && withinRange(p.report_date, range))
}

interface InventoryOutMovement {
  quantity: number | null
  unit_cost: number | null
  budget_category_id: string | null
  budget_item_id: string | null
}

/**
 * Salidas de almacén (type='out') del proyecto dentro del rango, imputadas a
 * una partida/capítulo. Representan costo real consumido y deben sumarse al
 * desglose por capítulo igual que en `budgetSpentService`.
 */
async function loadInventoryOutMovements(projectId: string, range: MonthRange): Promise<InventoryOutMovement[]> {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('quantity, unit_cost, budget_category_id, budget_item_id')
    .eq('project_id', projectId)
    .eq('type', INVENTORY_OUT_TYPE)
    .gte('date', range.start)
    .lte('date', range.end)
  if (error) {
    console.warn('[monthlyReportData] loadInventoryOutMovements failed:', error.message)
    return []
  }
  return (data ?? []) as InventoryOutMovement[]
}

/* -------------------------------------------------------------------------- */
/* KPI counters — queries directas a la base de datos                         */
/* -------------------------------------------------------------------------- */

/**
 * Número de días distintos con asistencia registrada en el proyecto durante
 * el rango del reporte. Equivale a:
 *   SELECT COUNT(DISTINCT date) FROM attendance_records
 *   WHERE project_id = $1 AND date BETWEEN $start AND $end
 */
async function countDaysWorked(projectId: string, range: MonthRange): Promise<number> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('date')
    .eq('project_id', projectId)
    .gte('date', range.start)
    .lte('date', range.end)
  if (error) {
    console.warn('[monthlyReportData] countDaysWorked failed:', error.message)
    return 0
  }
  const days = new Set((data ?? []).map((row) => (row.date ?? '').slice(0, 10)))
  days.delete('')
  return days.size
}

/**
 * Partidas (budget_items) con avance reportado parcial (0 < % < 100) para el
 * proyecto. Equivale a:
 *   SELECT COUNT(DISTINCT budget_item_id) FROM partida_progress
 *   WHERE project_id = $1 AND executed_percent > 0 AND executed_percent < 100
 *
 * Nota: la columna real en BD es `executed_percent` (no `progress_pct`).
 */
async function countPartidasInProgress(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .from('partida_progress')
    .select('budget_item_id, executed_percent')
    .eq('project_id', projectId)
    .gt('executed_percent', 0)
    .lt('executed_percent', 100)
  if (error) {
    console.warn('[monthlyReportData] countPartidasInProgress failed:', error.message)
    return 0
  }
  const itemIds = new Set((data ?? []).map((row) => row.budget_item_id).filter((id): id is string => Boolean(id)))
  return itemIds.size
}

/**
 * Facturas de materiales recibidas durante el rango del reporte.
 *
 * `material_invoices` no contiene `project_id` ni una fecha propia; se vinculan
 * al proyecto a través de `payroll_periods` (campo `report_date`). Esta función
 * acepta directamente los IDs de los periodos que caen dentro del rango.
 */
async function countMaterialsReceived(periodIdsInRange: string[]): Promise<number> {
  if (periodIdsInRange.length === 0) return 0
  const { count, error } = await supabase
    .from('material_invoices')
    .select('id', { count: 'exact', head: true })
    .in('payroll_period_id', periodIdsInRange)
  if (error) {
    console.warn('[monthlyReportData] countMaterialsReceived failed:', error.message)
    return 0
  }
  return count ?? 0
}

/* -------------------------------------------------------------------------- */
/* Section builders                                                           */
/* -------------------------------------------------------------------------- */

interface ProjectScopedData {
  categories: BudgetCategory[]
  items: BudgetItem[]
  itemsByCategory: Map<string, BudgetItem[]>
}

async function loadBudgetScaffold(projectId: string): Promise<ProjectScopedData> {
  const categories = await budgetCategoryService.getByProject(projectId)
  const categoryIds = categories.map((c) => c.id)
  const items = await budgetItemService.getByProjectCategories(categoryIds)
  const itemsByCategory = new Map<string, BudgetItem[]>()
  for (const item of items) {
    const bucket = itemsByCategory.get(item.budget_category_id) ?? []
    bucket.push(item)
    itemsByCategory.set(item.budget_category_id, bucket)
  }
  return { categories, items, itemsByCategory }
}

function buildBudgetBreakdown(
  scaffold: ProjectScopedData,
  laborItems: LaborLineItem[],
  materialInvoices: MaterialInvoice[],
  monthlyTransactions: { total: number; budget_category_id: string | null }[],
  inventoryMovements: InventoryOutMovement[] = [],
): BudgetBreakdownCategory[] {
  // actual real cost grouped by budget_item_id and budget_category_id.
  const actualByItem = new Map<string, number>()
  const actualByCategory = new Map<string, number>()

  function addToItem(itemId: string | null, amount: number): void {
    if (!itemId) return
    actualByItem.set(itemId, (actualByItem.get(itemId) ?? 0) + amount)
  }
  function addToCategory(categoryId: string | null, amount: number): void {
    if (!categoryId) return
    actualByCategory.set(categoryId, (actualByCategory.get(categoryId) ?? 0) + amount)
  }

  // Reglas de monto compartidas en `@/utils/costoReal` (fuente única con
  // budgetSpentService / partidaProgressService). Ver advertencia de DOBLE
  // CONTEO allí: transacciones e ítems de reporte/almacén son independientes.
  for (const ll of laborItems) {
    const subtotal = laborLineCost(ll)
    addToItem(ll.budget_item_id, subtotal)
    addToCategory(ll.budget_category_id, subtotal)
  }
  for (const inv of materialInvoices) {
    const amount = materialInvoiceCost(inv)
    addToItem(inv.budget_item_id, amount)
    addToCategory(inv.budget_category_id, amount)
  }
  for (const tx of monthlyTransactions) {
    addToCategory(tx.budget_category_id, transactionCost(tx))
  }
  for (const mv of inventoryMovements) {
    const value = inventoryOutCost(mv)
    // Imputación a partida específica; si no, a nivel de capítulo. Se cuenta
    // una sola vez para no duplicar (igual criterio que budgetSpentService).
    if (mv.budget_item_id) addToItem(mv.budget_item_id, value)
    else addToCategory(mv.budget_category_id, value)
  }

  // Build categories with their items, derive budgeted/actual at each level.
  return scaffold.categories.map<BudgetBreakdownCategory>((cat) => {
    const items = scaffold.itemsByCategory.get(cat.id) ?? []
    const breakdownItems: BudgetBreakdownItem[] = items.map((it) => ({
      code: it.code ?? '',
      name: it.description,
      budgeted: Number(it.quantity ?? 0) * Number(it.unit_price ?? 0),
      actual: actualByItem.get(it.id) ?? 0,
    }))

    const itemsBudgeted = breakdownItems.reduce((s, it) => s + it.budgeted, 0)
    const itemsActual = breakdownItems.reduce((s, it) => s + it.actual, 0)
    // Si el capítulo no tiene partidas detalladas, caemos al monto presupuestado
    // explícitamente y al actual acumulado a nivel de capítulo.
    const budgeted = itemsBudgeted > 0 ? itemsBudgeted : Number(cat.budgeted_amount ?? 0)
    const actual = itemsActual + (actualByCategory.get(cat.id) ?? 0)

    return {
      code: cat.code,
      name: cat.name,
      budgeted,
      actual,
      items: breakdownItems,
    }
  })
}

interface MonthlyTransactionRow {
  total: number
  payment_condition: string | null
  budget_category_id: string | null
  supplier_id: string | null
  date: string
}

function buildCashflow(
  monthlyTransactions: MonthlyTransactionRow[],
  committedPayrolls: PayrollPeriod[],
  laborItems: LaborLineItem[],
  materialInvoices: MaterialInvoice[],
  indirectCosts: IndirectCost[],
  expectedInflowsInMonth: number,
  plannedOutflowsInMonth: number,
): MonthlyReportInput['cashflow'] {
  const contractorActual = laborItems.reduce((acc, ll) => acc + laborLineCost(ll), 0)
  const materialActualFromInvoices = materialInvoices.reduce((acc, inv) => acc + materialInvoiceCost(inv), 0)
  const indirectActual = indirectCosts
    .filter((c) => c.is_active)
    .reduce((acc, c) => acc + Number(c.calculated_amount ?? 0), 0)

  // Transacciones del mes con proveedor son consideradas pagos a suplidores.
  // Aquellas sin proveedor se agregan como "OC liberadas" (compras puntuales).
  const supplierActualFromTransactions = monthlyTransactions
    .filter((t) => t.supplier_id != null)
    .reduce((acc, t) => acc + Number(t.total ?? 0), 0)
  const purchaseOrdersActual = monthlyTransactions
    .filter((t) => t.supplier_id == null)
    .reduce((acc, t) => acc + Number(t.total ?? 0), 0)

  const collectionsActual = 0 // pendiente: cuando se registren cobranzas reales.

  return {
    collections: {
      expected: expectedInflowsInMonth,
      actual: collectionsActual,
    },
    contractorPayments: {
      expected: 0,
      actual: contractorActual,
    },
    supplierPayments: {
      expected: 0,
      actual: materialActualFromInvoices + supplierActualFromTransactions,
    },
    releasedPurchaseOrders: {
      expected: plannedOutflowsInMonth,
      actual: purchaseOrdersActual,
    },
    indirects: {
      expected: 0,
      actual: indirectActual,
    },
    // El parámetro `committedPayrolls` se mantiene en la firma por si
    // futuras versiones del reporte requieren diferenciar pagos por estado.
    ...(committedPayrolls.length === 0 ? {} : {}),
  }
}

function buildPayrollSummary(laborItems: LaborLineItem[]): MonthlyReportInput['payroll'] {
  // Agrupa por contratista para conseguir un resumen util a nivel de reporte.
  const byContractor = new Map<
    string,
    {
      contractorName: string
      partidasCount: number
      laborSubtotal: number
      deductions: number
      net: number
    }
  >()

  for (const ll of laborItems) {
    const contractorId = ll.contractor_id
    const contractorName = (ll.contractor as Contractor | undefined)?.name ?? 'Contratista sin nombre'
    const subtotal = laborLineCost(ll)

    const bucket = byContractor.get(contractorId) ?? {
      contractorName,
      partidasCount: 0,
      laborSubtotal: 0,
      deductions: 0,
      net: 0,
    }

    bucket.contractorName = contractorName
    bucket.partidasCount += 1
    if (ll.is_advance_deduction) {
      bucket.deductions += subtotal
    } else {
      bucket.laborSubtotal += subtotal
    }
    bucket.net = bucket.laborSubtotal - bucket.deductions
    byContractor.set(contractorId, bucket)
  }

  const entries = Array.from(byContractor.values())
  const totalPaid = entries.reduce((acc, e) => acc + e.net, 0)

  return {
    totalPaid,
    entriesCount: entries.length,
    entries: entries.map((e) => ({
      contractorName: e.contractorName,
      partidasCount: e.partidasCount,
      laborSubtotal: e.laborSubtotal,
      materials: 0,
      indirects: 0,
      deductions: e.deductions,
      net: e.net,
    })),
  }
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Loads every data block required to render the monthly project report.
 *
 * The function only performs read-only queries and composes the results from
 * the corresponding domain services. Heavy lifting (formatting, table
 * construction) is delegated to {@link generateMonthlyReport} and the section
 * builders under `./sections`.
 */
export async function loadMonthlyReportData(projectId: string, yearMonth: string): Promise<MonthlyReportInput> {
  const range = parseYearMonth(yearMonth)

  // 1) Datos del proyecto y andamiaje de presupuesto.
  const [project, scaffold] = await Promise.all([projectService.getById(projectId), loadBudgetScaffold(projectId)])

  // 2) Transacciones del mes (libro diario filtrado por fecha).
  const monthlyTransactions = await transactionService.getByProject(projectId, {
    dateFrom: range.start,
    dateTo: range.end,
  })

  // 3) Nóminas del mes y sus detalles (labor / materiales / indirectos).
  const [periodsInRange, committedPayrolls] = await Promise.all([
    loadPayrollPeriodsInRange(projectId, range),
    loadAllCommittedPayrollsInRange(projectId, range),
  ])
  const periodIds = periodsInRange.map((p) => p.id)
  const [{ laborItems, materialInvoices, indirectCosts }, inventoryOutMovements] = await Promise.all([
    loadPayrollDetails(periodIds),
    loadInventoryOutMovements(projectId, range),
  ])

  // 4) Cash flow planificado y proyecciones (ingresos esperados, egresos).
  const [monthlyProjection, expectedInflows] = await Promise.all([
    cashFlowService.getMonthlyProjection(projectId),
    cashFlowService.listExpectedInflows(projectId),
  ])
  const projectionRow = monthlyProjection.find((row) => row.month === yearMonth)
  const plannedOutflowsInMonth = projectionRow?.planned_outflow ?? 0
  const expectedInflowsInMonth = expectedInflows
    .filter((inf) => withinRange(inf.expected_date, range))
    .reduce((acc, inf) => acc + Number(inf.amount ?? 0), 0)

  // 5) KPIs ejecutivos.
  const totalBudget = scaffold.categories.reduce((acc, cat) => {
    const fromItems = (scaffold.itemsByCategory.get(cat.id) ?? []).reduce(
      (s, it) => s + Number(it.quantity ?? 0) * Number(it.unit_price ?? 0),
      0,
    )
    return acc + (fromItems > 0 ? fromItems : Number(cat.budgeted_amount ?? 0))
  }, 0)

  const totalInvested = committedPayrolls.reduce((acc, p) => acc + Number(p.grand_total ?? 0), 0)

  const monthlyTransactionsTotal = monthlyTransactions.reduce((acc, t) => acc + Number(t.total ?? 0), 0)
  const projectGrandTotal = totalInvested + monthlyTransactionsTotal

  const variance = totalBudget - totalInvested
  const progressPercent = totalBudget > 0 ? Math.min(100, (totalInvested / totalBudget) * 100) : 0

  const activeContractors = new Set(laborItems.map((ll) => ll.contractor_id)).size

  // KPIs derivados de datos reales (queries directas a la BD).
  const [daysWorked, partidasInProgress, materialsReceived] = await Promise.all([
    countDaysWorked(projectId, range),
    countPartidasInProgress(projectId),
    countMaterialsReceived(periodIds),
  ])

  const budgetBreakdown = buildBudgetBreakdown(
    scaffold,
    laborItems,
    materialInvoices,
    monthlyTransactions.map((t) => ({
      total: Number(t.total ?? 0),
      budget_category_id: t.budget_category_id ?? null,
    })),
    inventoryOutMovements,
  )

  const cashflow = buildCashflow(
    monthlyTransactions.map((t) => ({
      total: Number(t.total ?? 0),
      payment_condition: t.payment_condition ?? null,
      budget_category_id: t.budget_category_id ?? null,
      supplier_id: t.supplier_id ?? null,
      date: t.date,
    })),
    committedPayrolls,
    laborItems,
    materialInvoices,
    indirectCosts,
    expectedInflowsInMonth,
    plannedOutflowsInMonth,
  )

  const payroll = buildPayrollSummary(laborItems)

  return {
    project: {
      id: project.id,
      name: project.name,
      client: project.company?.name,
      companyName: project.company?.name,
    },
    month: { year: range.year, month: range.month },
    executiveSummary: {
      totalBudget,
      totalInvested,
      variance,
      progressPercent,
      projectGrandTotal,
      daysWorked,
      activeContractors,
      partidasInProgress,
      materialsReceived,
      monthlyTransactions: monthlyTransactions.length,
    },
    budgetBreakdown: { categories: budgetBreakdown },
    cashflow,
    payroll,
  }
}
