# NominaAPP — Estado del Proyecto

## Stack
- React 19 + TypeScript + Vite (rutas con `lazy()` + Suspense)
- Tailwind CSS v4 (tema claro/oscuro: clase `dark` en `<html>`, tokens `app-*` en `index.css`)
- Zustand (estado global)
- Supabase (backend — modo demo sin credenciales)
- React Router v7
- `decimal.js` para cálculos financieros (nunca `float`)
- Testing: Vitest (unit, 51 tests) + Playwright (E2E smoke)

## Modo Demo
Sin `.env`, el sistema corre en **mockSupabase** (datos en memoria).
Para conectar Supabase real: copiar `.env.example` → `.env` con credenciales.

---

## Estructura de archivos

```
src/
  pages/            ← 32 páginas (ver tabla de rutas)
  components/
    auth/           ← RequireAuth (rutas protegidas)
    layout/         ← AppLayout, Sidebar, Header, ThemeToggle
    features/
      calendar/      ← CalendarMonthGrid, CalendarSidePanels
      payroll/      ← AddLaborItemForm, AddMaterialForm, CreatePayrollForm,
                       PayrollTotalsCards, LaborItemsSection, MaterialInvoicesSection, IndirectCostsSection
      payroll-print/ ← PayrollPrintSections, payrollPrintTypes
      payrollReports/ ← ProjectSummaryBar, ProjectReportsSection, EmptyProjectsPanel,
                        CreateReportModalContent
      contractors/  ← ContractorForm, ContractorProfileCard, ContractorKpiGrid,
                       ContractorProjectsSummary, ContractorCubicationsList, ContractorLaborItemsTable,
                       ContractorsSections
      suppliers/    ← SupplierForm, SuppliersSections
      projects/     ← ProjectForm
                      ProjectModulesGrid, ProjectBudgetSummary, ProjectRecentTransactions,
                      ProjectPayrollSection, ProjectsHeader, ProjectsTable, EmptyProjects,
                      ProjectDetailHeader, ProjectDetailModals
      loans/        ← LoanForm, LoanTable
      settings/     ← BankAccountForm, SettingsPanels
      schedule/     ← ScheduleStats, ScheduleTaskForm, ScheduleTaskTable, ScheduleGantt
      control/      ← TransactionInlineForm, TransactionRow, CxPView, CxPProjectFilterBar,
                       ChequesEfectivoView, FinancialIndicators, DiarioTab, CxPConsolidadoSections,
                       ControlFinancieroSections
      cubicacion/   ← PartidaSection, CorteSection, AdelantoSection,
                       CubicacionesSummaryCards, ContractsTable, CreateContractModal,
                       ContractPrintSections, ContratoFirmaSections, CubicacionContratoSections
      budget/       ← BudgetItemForm, BudgetPartidaRow, ExcelImportModal, PriceListPanel,
                       PriceListInlineForm, CopyPriceListModal, BudgetTabs, BudgetSummaryCards,
                       BudgetHierarchyTable, BudgetAmountEditModal, BudgetDetailSections
      insumos/      ← MercadoExcelUpload, CreateContractFromLineModal, InsumosImportCard,
                       InsumosSummary, InsumosLinesTable
      inventory/    ← InventoryLowStockAlert, InventoryTabs, InventoryForms, InventoryTables
      bitacora/     ← BitacoraEntryForm, BitacoraEntriesList
      attendance/   ← AttendanceSummaryCards, AttendanceForm, AttendanceHistoryTable
      reports/      ← ReportsSummaryCards, ReportsTables
      priceHistory/ ← PriceHistorySummary, PriceHistorySearch, PriceHistoryTable
      purchase-orders/ ← PurchaseOrderHeader, PurchaseOrderMeta, PurchaseOrderActions,
                          PurchaseOrderQuotesSection, PurchaseOrderSignatureCard,
                          ApprovalModal, QuoteForm, QuotesPanel,
                          PurchaseOrdersListSections, purchaseOrdersConfig,
                          PurchaseOrderDetailModals
      payments/     ← PaymentDistributionsSection
      quality/      ← QualityControlForm, QualityStatsCards, QualityRecordsTable, qualityUtils
      login/        ← LoginSections
      dashboard/    ← StatCard, ProjectCard, QuickAction, ProjectsSkeleton
    ui/             ← Modal
  services/         ← authService + servicios de dominio (ver tabla)
  stores/           ← projectStore, payrollStore, themeStore, authStore (sesión demo, localStorage)
  hooks/            ← usePayroll, useTransactions, useBudgetDetail, useBudgetItems,
                       useDashboardData, useCalendarEvents, useProjectReports, usePriceHistory,
                       usePurchaseOrderDetail, useCxPConsolidadoTodos
  utils/            ← currency, money (Decimal helpers), calculations,
                       financialCalculations, priceCodeGenerator, approvalCode,
                       errors, parseMercadoExcel
  constants/        ← budgetCategories, indirectCosts, measureUnits, banks, demoUsers (login demo)
  types/            ← database.ts (14+ interfaces), purchaseOrder, mercadoBudget
  lib/              ← supabase, mockSupabase (+ mockSupabase.types), mockData,
                       seedCapullo, seedTorreMirador, router
e2e/                ← smoke.spec.ts (flujos críticos UI)
```

---

## Páginas y rutas

Todas las rutas (excepto `/login`) protegidas con `RequireAuth` y cargadas con `lazy()`.

| Ruta | Página |
|---|---|
| `/login` | Login (usuarios demo en `constants/demoUsers`) |
| `/` | Dashboard |
| `/proyectos` `/proyectos/:id` | Projects, ProjectDetail |
| `/proyectos/:id/nominas` `/nominas` `/nominas/:id` `/nominas/:id/imprimir` | PayrollList, ReportesObra, PayrollEditor, PayrollPrint |
| `/proyectos/:id/control` `/proyectos/:id/presupuesto` | ControlFinanciero, PresupuestoDetalle |
| `/proyectos/:id/calidad` `/proyectos/:id/insumos` | QualityControlPage, InsumosPage |
| `/proyectos/:id/bitacora` `/proyectos/:id/asistencia` `/proyectos/:id/inventario` `/proyectos/:id/cronograma` | BitacoraPage, AsistenciaPage, InventarioPage, CronogramaPage |
| `/cubicaciones` `/proyectos/:id/cubicaciones` `…/:contratoId` `…/imprimir` `…/contrato` | CubicacionesHub, CubicacionesPage, CubicacionContratoPage, CubicacionImprimirPage, ContratoFirmaPage |
| `/finanzas` `/presupuesto` `/reportes` | FinanzasHub, PresupuestoHub, Reportes |
| `/cxp` `/cxp/:projectId` `/cxp/consolidado` | CxPHub, CxPDetalle, CxPConsolidadoTodos |
| `/contratistas` `/contratistas/:id` `/suplidores` | Contractors, ContractorDetail, Suppliers |
| `/prestamos` `/configuracion` `/calendario` `/historial-precios` | Loans, Settings, Calendario, HistorialPrecios |
| `/ordenes-compra` `/ordenes-compra/:id` | PurchaseOrders, PurchaseOrderDetail |

---

## Servicios

| Archivo | Responsabilidad |
|---|---|
| `authService` | Validación de credenciales demo (cliente) |
| `projectService` | CRUD proyectos y empresas |
| `contractorService` | CRUD contratistas |
| `supplierService` | CRUD proveedores |
| `payrollService` | Períodos, partidas labor, facturas, indirectos |
| `transactionService` | Libro diario (transacciones) |
| `budgetCategoryService` | Categorías presupuestarias |
| `bankAccountService` | Cuentas bancarias |
| `dashboardService` | KPIs y actividad reciente |
| `qualityControlService` | Ensayos de resistencia de hormigón |
| `cubicationService` | Contratos de ajuste, partidas, cortes (con retención y estado), adelantos |
| `paymentDistributionService` | Distribución de pagos por nómina |
| `budgetItemService` | CRUD de subpartidas (líneas de presupuesto) |
| `priceListService` | CRUD de lista de precios por proyecto |
| `requisitionService` | CRUD requisiciones, aprobación, colocar orden |
| `mercadoBudgetService` | Presupuesto Mercado por proyecto + líneas + vínculo con contratos |
| `quoteService` | CRUD cotizaciones e ítems por requisición |
| `loanService` | CRUD préstamos a contratistas y deducciones por nómina |
| `notificationService` | Notificaciones in-app (badge en header) |
| `bitacoraService` | Bitácora de obra (clima, mano de obra, incidentes) |
| `attendanceService` | Asistencia diaria por proyecto |
| `scheduleService` | Cronograma / Gantt de tareas por proyecto |
| `inventoryService` | Inventario de materiales (stock + movimientos in/out) |
| `contractorDocService` | Documentos de contratista (cédula, ARS, AFP, etc.) con vencimiento |

---

## Schema Supabase (tablas principales + módulos de obra)

`companies`, `projects`, `contractors`, `suppliers`, `bank_accounts`,
`budget_categories`, `budget_items`, `price_list_items`, `payroll_periods`, `labor_line_items`,
`material_invoices`, `indirect_costs`, `payment_distributions`,
`transactions`, `quality_control`,
`adjustment_contracts`, `contract_partidas`, `contract_cortes`, `contract_adelantos`,
`purchase_requisitions`, `purchase_quotes`, `purchase_quote_items`,
`contractor_loans`, `loan_deductions`,
`mercado_budgets`, `mercado_budget_lines`,
`bitacora_entries`, `attendance_records`, `inventory_items`, `inventory_movements`,
`schedule_tasks`, `contractor_documents`

---

## Features implementados (v0.4.0)

- Dashboard con KPIs y actividad reciente
- Gestión completa de proyectos, contratistas, suplidores
- Nóminas: draft → submitted → approved → paid
  - Partidas de mano de obra por contratista
  - Carga manual de partidas de mano de obra desde el editor de nómina
  - Facturas de materiales
  - Indirectos auto-calculados (DT, admin, transporte, planificación + casillas personalizables % o RD$ por proyecto)
  - Activar/desactivar indirectos por nómina (checkbox por fila); la preferencia se preserva por tipo entre recálculos
  - Distribución de pagos (post-aprobación)
- Control Financiero por proyecto: libro diario, CxP, cheques
- Presupuesto vs Real con edición inline
- Control de Calidad: ensayos de resistencia con estados
- Cubicaciones (v2): contratos de ajuste con partidas (unidad × precio), cortes (mediciones con retención, estado borrador→aprobado→pagado), adelantos, y panel Acordado/Acumulado/Pendiente/Retenido
- CxP: hub por proyecto (como Presupuesto), detalle por obra; consolidado opcional en `/cxp/consolidado`
- Reportes financieros consolidados
- Configuración: cuentas bancarias, condiciones de pago
- Demo mode banner con dismiss
- Payroll delete (solo en estado draft)
- Presupuesto jerárquico: partidas → subpartidas (cantidad × precio unit. = total)
- Importación de presupuesto desde Excel (.xlsx/.xls) con previsualización
- Lista de precios unitarios por proyecto (materiales, mano de obra, equipos)
  - Código auto-generado por categoría (MAT-001, MO-001, EQ-001, AJ-001) al crear un ítem
  - Botón "Replicar" para copiar la lista completa a otro proyecto (modal de selección)
- Autocomplete de precios al crear subpartidas
- Órdenes de Compra: flujo completo de requisición con mínimo 3 cotizaciones
  - draft → quoting (agregar cotizaciones) → pending_approval → approved → ordered | rejected
  - Comparación visual de cotizaciones lado a lado
  - Aprobación con código personal (localStorage) + firma digital en canvas
  - Selección de cotización ganadora en el modal de aprobación
  - Colocar orden con forma de pago: crédito o contado
- Préstamos a contratistas: capital, tasa de interés, cuotas fijas
  - Página `/prestamos`: listado con saldo pendiente por préstamo, marcar pagado/cancelar
  - En cada reporte de nómina: sección "Deducciones de préstamos" (solo préstamos activos con saldo)
  - El monto descontado se registra en `loan_deductions` y aparece en el reporte impreso
  - Los totales del reporte (costo del proyecto) no se alteran; la deducción es entre empresa y contratista
- Listado de Insumos (Presupuesto Mercado): importación de Excel con 4 categorías (AJUSTES, EQUIPOS, MANO DE OBRA, MATERIALES)
  - AJUSTES y MANO DE OBRA son cubicables → "Crear contrato" crea un AdjustmentContract + una ContractPartida pre-llenados
  - El modal muestra desvío en tiempo real (acordado vs presupuestado)
  - Cada línea guarda precio/cantidad presupuestado y acordado para control de desvío
  - Tabla `mercado_budgets` (cabecera por proyecto) + `mercado_budget_lines` (filas del Excel)

---

## Pendiente / Roadmap

- [ ] Autenticación real (Supabase Auth); hoy: login demo en cliente (`authStore` + `demoUsers`)
- [ ] Notificaciones (ensayos fallidos, CxP vencidos)
- [ ] Multi-empresa con permisos por usuario

---

## Testing rápido

- Unit: `npm test`
- E2E smoke: `npm run test:e2e`
