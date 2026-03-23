# NominaAPP — Estado del Proyecto

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4
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
  pages/            ← 15 páginas
  components/
    layout/         ← AppLayout, Sidebar, Header
    features/
      payroll/      ← AddLaborItemForm, AddMaterialForm, CreatePayrollForm
      contractors/  ← ContractorForm
      suppliers/    ← SupplierForm
      projects/     ← ProjectForm
      control/      ← TransactionInlineForm, TransactionRow, CxPView,
                       ChequesEfectivoView, FinancialIndicators, CubicacionForm
      budget/       ← BudgetItemForm, BudgetPartidaRow, ExcelImportModal, PriceListPanel
      payments/     ← PaymentDistributionsSection
      quality/      ← QualityControlForm
    ui/             ← Modal
  services/         ← 10 servicios
  stores/           ← projectStore, payrollStore
  hooks/            ← usePayroll, useTransactions, useBudgetDetail, useBudgetItems
  utils/            ← currency, calculations, financialCalculations
  constants/        ← budgetCategories, indirectCosts, measureUnits, banks
  types/            ← database.ts (14 interfaces)
  lib/              ← supabase, mockSupabase, mockData, router
```

---

## Páginas y rutas

| Ruta | Página | Estado |
|---|---|---|
| `/` | Dashboard | ✅ Completo |
| `/proyectos` | Projects | ✅ Completo |
| `/proyectos/:id` | ProjectDetail | ✅ Completo |
| `/proyectos/:id/control` | ControlFinanciero | ✅ Completo |
| `/proyectos/:id/presupuesto` | PresupuestoDetalle | ✅ Completo |
| `/proyectos/:id/calidad` | QualityControlPage | ✅ Completo |
| `/proyectos/:id/cubicaciones` | CubicacionesPage | ✅ Completo |
| `/nominas/:id` | PayrollEditor | ✅ Completo |
| `/nominas/:id/imprimir` | PayrollPrint | ✅ Completo |
| `/finanzas` | FinanzasHub | ✅ Completo |
| `/presupuesto` | PresupuestoHub | ✅ Completo |
| `/cxp` | CxPConsolidado | ✅ Completo |
| `/reportes` | Reportes | ✅ Completo |
| `/contratistas` | Contractors | ✅ Completo |
| `/suplidores` | Suppliers | ✅ Completo |
| `/configuracion` | Settings | ✅ Completo |
| `/ordenes-compra` | PurchaseOrders | ✅ Completo |
| `/ordenes-compra/:id` | PurchaseOrderDetail | ✅ Completo |

---

## Servicios

| Archivo | Responsabilidad |
|---|---|
| `projectService` | CRUD proyectos y empresas |
| `contractorService` | CRUD contratistas |
| `supplierService` | CRUD proveedores |
| `payrollService` | Períodos, partidas labor, facturas, indirectos |
| `transactionService` | Libro diario (transacciones) |
| `budgetCategoryService` | Categorías presupuestarias |
| `bankAccountService` | Cuentas bancarias |
| `dashboardService` | KPIs y actividad reciente |
| `qualityControlService` | Ensayos de resistencia de hormigón |
| `cubicationService` | Cubicaciones por contratista |
| `paymentDistributionService` | Distribución de pagos por nómina |
| `budgetItemService` | CRUD de subpartidas (líneas de presupuesto) |
| `priceListService` | CRUD de lista de precios por proyecto |
| `requisitionService` | CRUD requisiciones, aprobación, colocar orden |
| `quoteService` | CRUD cotizaciones e ítems por requisición |

---

## Schema Supabase (14 tablas)

`companies`, `projects`, `contractors`, `suppliers`, `bank_accounts`,
`budget_categories`, `budget_items`, `price_list_items`, `payroll_periods`, `labor_line_items`,
`material_invoices`, `indirect_costs`, `payment_distributions`,
`transactions`, `quality_control`, `contract_cubications`,
`purchase_requisitions`, `purchase_quotes`, `purchase_quote_items`

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
- Cubicaciones: contrato + avance por contratista
- CxP consolidado multi-proyecto
- Reportes financieros consolidados
- Configuración: cuentas bancarias, condiciones de pago
- Demo mode banner con dismiss
- Payroll delete (solo en estado draft)
- Presupuesto jerárquico: partidas → subpartidas (cantidad × precio unit. = total)
- Importación de presupuesto desde Excel (.xlsx/.xls) con previsualización
- Lista de precios unitarios por proyecto (materiales, mano de obra, equipos)
- Autocomplete de precios al crear subpartidas
- Órdenes de Compra: flujo completo de requisición con mínimo 3 cotizaciones
  - draft → quoting (agregar cotizaciones) → pending_approval → approved → ordered | rejected
  - Comparación visual de cotizaciones lado a lado
  - Aprobación con código personal (localStorage) + firma digital en canvas
  - Selección de cotización ganadora en el modal de aprobación
  - Colocar orden con forma de pago: crédito o contado

---

## Pendiente / Roadmap

- [ ] Autenticación (Supabase Auth)
- [ ] Notificaciones (ensayos fallidos, CxP vencidos)
- [ ] Multi-empresa con permisos por usuario
