# NominaAPP — Estado del Proyecto

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (tema claro/oscuro: clase `dark` en `<html>`, tokens `app-*` en `index.css`)
- Zustand (estado global)
- Supabase (backend — modo demo sin credenciales)
- React Router v7

## Modo Demo
Sin `.env`, el sistema corre en **mockSupabase** (datos en memoria).
Para conectar Supabase real: copiar `.env.example` → `.env` con credenciales.

---

## Estructura de archivos

```
src/
  pages/            ← 17 páginas (incl. CxPHub, CxPDetalle, CxPConsolidadoTodos)
  components/
    auth/           ← RequireAuth (rutas protegidas)
    layout/         ← AppLayout, Sidebar, Header, ThemeToggle
    features/
      payroll/      ← AddLaborItemForm, AddMaterialForm, CreatePayrollForm
      contractors/  ← ContractorForm
      suppliers/    ← SupplierForm
      projects/     ← ProjectForm
      loans/        ← LoanForm
      control/      ← TransactionInlineForm, TransactionRow, CxPView, CxPProjectFilterBar,
                       ChequesEfectivoView, FinancialIndicators
      cubicacion/   ← PartidaSection, CorteSection, AdelantoSection
      budget/       ← BudgetItemForm, BudgetPartidaRow, ExcelImportModal, PriceListPanel,
                       PriceListInlineForm, CopyPriceListModal
      insumos/      ← MercadoExcelUpload, CreateContractFromLineModal
      payments/     ← PaymentDistributionsSection
      quality/      ← QualityControlForm
    ui/             ← Modal
  services/         ← authService + servicios de dominio (ver tabla)
  stores/           ← projectStore, payrollStore, themeStore, authStore (sesión demo, localStorage)
  hooks/            ← usePayroll, useTransactions, useBudgetDetail, useBudgetItems
  utils/            ← currency, calculations, financialCalculations, priceCodeGenerator
  constants/        ← budgetCategories, indirectCosts, measureUnits, banks, demoUsers (login demo)
  types/            ← database.ts (14 interfaces)
  lib/              ← supabase, mockSupabase, mockData, seedCapullo, seedTorreMirador, router
```

---

## Páginas y rutas

| Ruta | Página | Estado |
|---|---|---|
| `/login` | Login | ✅ Completo (usuarios demo en `constants/demoUsers`) |
| `/` | Dashboard | ✅ Completo |
| `/proyectos` | Projects | ✅ Completo |
| `/proyectos/:id` | ProjectDetail | ✅ Completo |
| `/proyectos/:id/control` | ControlFinanciero | ✅ Completo |
| `/proyectos/:id/presupuesto` | PresupuestoDetalle | ✅ Completo |
| `/proyectos/:id/calidad` | QualityControlPage | ✅ Completo |
| `/proyectos/:id/insumos` | InsumosPage | ✅ Completo |
| `/proyectos/:id/cubicaciones` | CubicacionesPage | ✅ Completo |
| `/proyectos/:id/cubicaciones/:contratoId` | CubicacionContratoPage | ✅ Completo |
| `/nominas/:id` | PayrollEditor | ✅ Completo |
| `/nominas/:id/imprimir` | PayrollPrint | ✅ Completo |
| `/finanzas` | FinanzasHub | ✅ Completo |
| `/presupuesto` | PresupuestoHub | ✅ Completo |
| `/cxp` | CxPHub (elegir proyecto) | ✅ Completo |
| `/cxp/:projectId` | CxPDetalle | ✅ Completo |
| `/cxp/consolidado` | CxPConsolidadoTodos | ✅ Completo |
| `/reportes` | Reportes | ✅ Completo |
| `/contratistas` | Contractors | ✅ Completo |
| `/suplidores` | Suppliers | ✅ Completo |
| `/prestamos` | Loans | ✅ Completo |
| `/configuracion` | Settings | ✅ Completo |
| `/ordenes-compra` | PurchaseOrders | ✅ Completo |
| `/ordenes-compra/:id` | PurchaseOrderDetail | ✅ Completo |

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

---

## Schema Supabase (14 tablas)

`companies`, `projects`, `contractors`, `suppliers`, `bank_accounts`,
`budget_categories`, `budget_items`, `price_list_items`, `payroll_periods`, `labor_line_items`,
`material_invoices`, `indirect_costs`, `payment_distributions`,
`transactions`, `quality_control`,
`adjustment_contracts`, `contract_partidas`, `contract_cortes`, `contract_adelantos`,
`purchase_requisitions`, `purchase_quotes`, `purchase_quote_items`,
`contractor_loans`, `loan_deductions`,
`mercado_budgets`, `mercado_budget_lines`

---

## Features implementados (v0.4.0)

- Dashboard con KPIs y actividad reciente
- Gestión completa de proyectos, contratistas, suplidores
- Nóminas: draft → submitted → approved → paid
  - Partidas de mano de obra por contratista
  - Facturas de materiales
  - Indirectos auto-calculados (DT, admin, transporte)
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
