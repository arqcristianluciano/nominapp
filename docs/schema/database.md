# Database Schema - NominApp

Resumen del schema `public` de Supabase (project `pkllcsexipdvwdpunlkz`).

## Tablas por dominio

### Proyecto

| Tabla              | Proposito                               | Columnas clave                                   |
| ------------------ | --------------------------------------- | ------------------------------------------------ |
| `projects`         | Proyecto/obra raiz, todo cuelga de aqui | `id, company_id, name, code, status, created_by` |
| `project_members`  | Asignacion usuario-rol a un proyecto    | `id, project_id, user_id, role`                  |
| `bitacora_entries` | Bitacora diaria de obra                 | `id, project_id, date`                           |
| `schedule_tasks`   | Cronograma/tareas del proyecto          | `id, project_id, name, start_date, end_date`     |
| `quality_control`  | Registros de control de calidad         | `id, project_id, status`                         |

### Presupuesto

| Tabla                  | Proposito                                    | Columnas clave                                       |
| ---------------------- | -------------------------------------------- | ---------------------------------------------------- |
| `budget_versions`      | Versionado historico del presupuesto         | `id, project_id`                                     |
| `budget_categories`    | Categorias/partidas del presupuesto          | `id, project_id, code, name, start_date, end_date`   |
| `budget_items`         | Items dentro de una categoria de presupuesto | `id, budget_category_id, code, start_date, end_date` |
| `partida_progress`     | Avance fisico por partida                    | `id, project_id, budget_category_id, budget_item_id` |
| `mercado_budgets`      | Presupuestos tipo "mercado" (alt)            | `id, project_id`                                     |
| `mercado_budget_lines` | Lineas de presupuesto mercado                | `id, budget_id, contract_id, code`                   |

### Nomina

| Tabla                   | Proposito                                                      | Columnas clave                                                                                                  |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `payroll_periods`       | Periodo de nomina por proyecto                                 | `id, project_id, status`                                                                                        |
| `attendance_records`    | Asistencias por contratista/dia                                | `id, project_id, contractor_id, date`                                                                           |
| `labor_line_items`      | Linea de mano de obra imputable a presupuesto                  | `id, contractor_id, payroll_period_id, budget_category_id, budget_item_id`                                      |
| `payment_distributions` | Distribucion de pagos por beneficiario (contratista/proveedor) | `id, payroll_period_id, beneficiary, beneficiary_type, beneficiary_id, bank_name, bank_account, amount, status` |
| `indirect_costs`        | Costos indirectos del periodo de nomina                        | `id, payroll_period_id`                                                                                         |

### Compras

| Tabla                   | Proposito                    | Columnas clave                                                                   |
| ----------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `purchase_requisitions` | Solicitud de compra          | `id, project_id, budget_category_id, budget_item_id, status`                     |
| `purchase_quotes`       | Cotizaciones por requisicion | `id, requisition_id, supplier_id, total`                                         |
| `purchase_quote_items`  | Lineas de cotizacion         | `id, quote_id`                                                                   |
| `purchase_orders`       | Orden de compra emitida      | `id, project_id, supplier_id, status, total`                                     |
| `purchase_order_items`  | Lineas de orden de compra    | `id, purchase_order_id`                                                          |
| `material_invoices`     | Facturas de materiales       | `id, supplier_id, budget_category_id, budget_item_id, payroll_period_id, amount` |
| `suppliers`             | Catalogo de proveedores      | `id, name`                                                                       |

### Almacen / Inventario

| Tabla                 | Proposito                                    | Columnas clave                                                                                      |
| --------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `inventory_items`     | Items de inventario por proyecto             | `id, project_id, material_catalog_id, name`                                                         |
| `inventory_movements` | Entradas/salidas con imputacion presupuestal | `id, project_id, item_id, supplier_id, purchase_order_id, budget_category_id, budget_item_id, date` |
| `materials_catalog`   | Catalogo maestro de materiales               | `id, code`                                                                                          |

### Obra (contratistas)

| Tabla                  | Proposito                            | Columnas clave                                          |
| ---------------------- | ------------------------------------ | ------------------------------------------------------- |
| `contractors`          | Maestro de contratistas/trabajadores | `id, name, phone`                                       |
| `contractor_documents` | Documentos del contratista           | `id, contractor_id, name, status`                       |
| `contractor_loans`     | Prestamos a contratistas             | `id, contractor_id, status`                             |
| `loan_deductions`      | Descuentos por prestamo en nomina    | `id, contractor_id, loan_id, payroll_period_id, amount` |

### Cubicaciones / Contratos

| Tabla                  | Proposito                                        | Columnas clave                                                   |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| `adjustment_contracts` | Contratos de ajuste (subcontratos a precio fijo) | `id, project_id, contractor_id`                                  |
| `contract_partidas`    | Partidas dentro de un contrato                   | `id, contract_id`                                                |
| `contract_cortes`      | Cortes/avances del contrato (pagables)           | `id, contract_id, partida_id, linked_payroll_id, amount, status` |
| `contract_adelantos`   | Adelantos sobre el contrato                      | `id, contract_id, amount`                                        |
| `contract_cubications` | Cubicaciones medidas en obra                     | `id, project_id, contractor_id`                                  |

### Finanzas

| Tabla                   | Proposito                         | Columnas clave                                                                    |
| ----------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `bank_accounts`         | Cuentas bancarias del proyecto    | `id, project_id`                                                                  |
| `transactions`          | Movimientos financieros generales | `id, project_id, supplier_id, budget_category_id, payroll_period_id, total, date` |
| `expected_cash_inflows` | Ingresos esperados (cash flow)    | `id, project_id, amount`                                                          |
| `price_list_items`      | Lista de precios por proyecto     | `id, project_id, code`                                                            |

### Maestros / Catalogos

| Tabla            | Proposito                                 | Columnas clave                      |
| ---------------- | ----------------------------------------- | ----------------------------------- |
| `companies`      | Empresa/tenant raiz                       | `id, name`                          |
| `user_profiles`  | Perfil de usuario (extiende `auth.users`) | `id, email, phone, bank_account_id` |
| `user_documents` | Documentos personales del usuario         | `id, user_id`                       |

### Admin / Seguridad

| Tabla                | Proposito                                         | Columnas clave           |
| -------------------- | ------------------------------------------------- | ------------------------ |
| `roles`              | Roles del sistema (admin, director_proyecto, ...) | `id, name`               |
| `capabilities`       | Capabilities atomicas (acciones permitidas)       | `id, name`               |
| `role_capabilities`  | M:N rol-capability                                | `role_id, capability_id` |
| `approvals`          | Workflow de aprobaciones (requisiciones, cortes)  | `id`                     |
| `push_subscriptions` | Subscripciones web-push por usuario               | `id, user_id`            |

## Diagrama de FKs principales

```
                       companies
                           |
                           v
   user_profiles  <----  projects  ----> project_members ----> user_profiles
        ^                  |  ^                                     |
        |                  |  |                                     v
   user_documents          |  +----------------------+        (auth.users)
                           |                         |
        +------------------+---+-------+-------+-----+-------------+
        v                  v   v       v       v     v             v
  budget_versions   payroll_   bank_   bitacora schedule  contractors-+
        |          periods    accounts entries  _tasks    (master)    |
        v             |         ^                                     |
  budget_categories   |         |                                     |
        |             v         |                                     |
        v        labor_line_items                            adjustment_contracts
  budget_items   loan_deductions                                |
        |        payment_distributions                          +-> contract_partidas
        |        indirect_costs                                 +-> contract_cortes
        |        material_invoices ----> suppliers              +-> contract_adelantos
        |                                  ^                    +-> mercado_budget_lines
        +-----> purchase_requisitions      |
                     |                     |
                     v                     |
                purchase_quotes -----------+
                     |                     |
                     v                     |
                purchase_orders -----------+
                     |
                     v
              purchase_order_items

  inventory_items (project) ---> inventory_movements ---> materials_catalog
                                       ^   |
                                       |   v
                                  budget_categories/items + suppliers

  roles --(role_capabilities)-- capabilities
```

Flujo central: todo dato operativo cuelga de `projects` (que pertenece a `companies`). Los items presupuestales (`budget_categories` / `budget_items`) son la espina dorsal de imputacion para nomina, compras, inventario y transacciones.

## RLS helpers (funciones SECURITY DEFINER)

| Funcion                                                             | Uso                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `user_has_capability(capability_name text, project_id uuid)`        | True si el usuario tiene la capability en ese proyecto                         |
| `user_has_any_capability(capability_names text[], project_id uuid)` | True si tiene cualquiera de las capabilities listadas                          |
| `user_has_capability_anywhere(capability_name text)`                | True si tiene la capability en algun proyecto (cross-project)                  |
| `user_has_project_role(project_id uuid, role_names text[])`         | True si pertenece al proyecto con alguno de esos roles                         |
| `user_has_any_role_anywhere(role_names text[])`                     | True si tiene alguno de esos roles en cualquier proyecto                       |
| `is_member_of_project(project_id uuid)`                             | True si el usuario es miembro del proyecto (centralizado, evita recursion RLS) |
| `user_app_capabilities()`                                           | RPC: lista capabilities del usuario actual a nivel app                         |
| `user_project_capabilities(project_id uuid)`                        | RPC: lista capabilities del usuario en un proyecto                             |

## Migraciones aplicadas (001-036)

| #    | Nombre                                | Resumen                                                    |
| ---- | ------------------------------------- | ---------------------------------------------------------- |
| 001  | `schema`                              | Schema base inicial                                        |
| 002  | `purchase_orders`                     | Modulo de ordenes de compra                                |
| 003  | `custom_indirects`                    | Costos indirectos personalizables                          |
| 004  | `indirect_active`                     | Flag activo en indirectos                                  |
| 005  | `approvals` / `extra_tables`          | Tabla de aprobaciones                                      |
| 006  | `requisition_excess` / `disable_rls`  | Campos de exceso en requisicion                            |
| 007  | `purchase_orders_release`             | Liberacion de OC                                           |
| 008  | `inventory_imputation`                | Imputacion presupuestal en inventario                      |
| 009  | `payroll_imputation`                  | Imputacion presupuestal en nomina                          |
| 010  | `seed_mcz_ventures`                   | Seed de empresa demo                                       |
| 011  | `materials_catalog`                   | Catalogo maestro de materiales                             |
| 012  | `budget_dates`                        | Fechas (start/end) en partidas                             |
| 013  | `cash_flow_and_progress`              | Cash flow esperado + avance partidas                       |
| 014  | `budget_versions`                     | Versionado historico de presupuesto                        |
| 015  | `push_subscriptions`                  | Web push notifications                                     |
| 016  | `project_members`                     | Membresia usuario-proyecto                                 |
| 017  | `rls_strict`                          | Endurecer RLS                                              |
| 018  | `backfill_approvals`                  | Backfill data en approvals                                 |
| 019  | `missing_obra_tables`                 | Tablas faltantes de obra                                   |
| 020  | `harden_function_search_path`         | Set `search_path` en SECURITY DEFINER                      |
| 021  | `enable_rls_permissive_baseline`      | RLS permisivo base                                         |
| 022  | `rls_strict_by_role`                  | RLS por rol                                                |
| 023  | `fix_auth_users_null_tokens`          | Fix tokens nulos en auth.users                             |
| 024a | `fix_project_members_rls_recursion`   | Romper recursion en RLS de project_members                 |
| 024b | `rename_gerente_to_director_proyecto` | Rename de rol                                              |
| 025a | `auto_assign_project_creator`         | Trigger: el creador queda como miembro                     |
| 025b | `rls_strict_by_role_matrix`           | Matriz de RLS por rol                                      |
| 026a | `rls_centralize_membership`           | Centralizar chequeo via `is_member_of_project`             |
| 026b | `rls_hygiene`                         | Limpieza policies RLS                                      |
| 027  | `fix_project_creation`                | Fix flujo creacion proyecto                                |
| 028  | `admin_users_and_capabilities`        | Modelo de capabilities + admin                             |
| 029  | `rls_capability_based`                | RLS basado en capabilities                                 |
| 030  | `user_capabilities_rpc`               | RPCs `user_app_capabilities` / `user_project_capabilities` |
| 031  | `fix_project_creator_trigger_timing`  | Timing del trigger 025a                                    |
| 032  | `rls_sign_contract_and_indexes`       | RLS firma de contratos + indices                           |
| 033  | `audit_fixes`                         | Fixes auditoria seguridad                                  |
| 034  | `storage_user_documents`              | Bucket/policies para documentos de usuario                 |
| 035  | `legacy_tables_idempotent`            | Idempotencia para tablas legacy                            |
| 036  | `user_companies_rpc`                  | RPC de empresas por usuario                                |
