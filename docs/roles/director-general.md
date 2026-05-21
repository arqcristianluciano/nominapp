# Director General — Manual de Uso

El **Director General** es el rol de mayor privilegio en NominApp. Se identifica con el flag `is_director = true` en el usuario y obtiene **bypass total** de la matriz de capabilities (ver `useProjectRoles.ts` y `useAppRoles.ts`, donde `can()` retorna `true` si `isDirector === true`).

## 1. Que puede hacer

- **Todos los modulos**: presupuestos, nomina, requisiciones / OC, almacen, bitacora, contratos, finanzas, catalogos.
- **Cross-empresa**: ve y opera proyectos de **cualquier empresa** del tenant (no esta limitado por `project_members`).
- **Admin de usuarios**: alta, edicion, asignacion de roles por proyecto y matriz global (`/admin/usuarios`).
- **Dashboard ejecutivo**: ruta `/director` (`DirectorDashboard`) con KPIs cross-empresa: avance, gasto vs presupuesto, nominas pendientes, OC en aprobacion, cortes abiertos.
- **Aprobacion final** de nominas, OC con sobrecosto, cortes de obra, contratos.

## 2. Crear un proyecto y asignar empresa

1. Ir a **Proyectos → Nuevo proyecto**.
2. Capturar nombre, codigo, fechas, presupuesto inicial.
3. En el campo **Empresa**, seleccionar la `company_id` que ejecutara el proyecto (el Director ve todas las empresas registradas en el tenant).
4. Guardar. El proyecto queda creado con el Director como miembro implicito (no necesita estar en `project_members`).
5. Asignar **Director de Proyecto** desde `/admin/usuarios → Roles por proyecto`.

> El Director es el unico rol con `canCreateProject = true` por default; los demas roles requieren `edit_project` explicito.

## 3. Gestionar usuarios y matriz de permisos

Ruta: **`/admin/usuarios`**. Tres pestanas:

| Pestana | Componente | Para que |
| --- | --- | --- |
| **Personas** | `AdminUsuariosPersonas` | Alta / baja de usuarios, datos personales, marcar `is_director`. |
| **Roles** | `AdminUsuariosRoles` | Asignar roles (`director_proyecto`, `planificacion`, `comprador`, etc.) a un usuario por proyecto. |
| **Matriz** | `AdminUsuariosMatriz` | Editar la tabla `role_capabilities`: que capability tiene cada rol. |

Roles disponibles (ver `ProjectRole` en `useProjectRoles.ts`):

- `director_general`, `director_proyecto`, `planificacion`, `ingeniero_obra`,
  `supervisor_especializado`, `comprador`, `almacenista`, `contabilidad`.

Capabilities admin-only: `manage_users`, `manage_roles` (Director siempre `true`).

Los cambios en la matriz se reflejan al recargar el hook (los hooks consultan via RPC `user_project_capabilities` / `user_app_capabilities`).

## 4. Aprobar nominas, OC y cortes

| Accion | Capability | Donde |
| --- | --- | --- |
| Aprobar nomina | `approve_payroll` | Modulo Nomina → estado **En revision** → boton **Aprobar**. |
| Distribuir pagos | `distribute_payments` | Nomina aprobada → **Pagos** → seleccionar cuenta bancaria. |
| Aprobar OC con sobrecosto | `approve_excess` | Requisiciones → OC con diferencia > umbral → **Aprobar excedente**. |
| Liberar OC | `release_purchase_order` | OC en estado **Cotizada** → **Liberar**. |
| Aprobar corte de obra | `approve_corte` | Contratos → Corte en estado **Enviado** → **Aprobar**. |
| Firmar contrato | `sign_contract` | Contratos → **Firmar**. |

El Director ve siempre el boton, aunque la nomina / OC / corte pertenezca a otra empresa.

## 5. Tabla de capabilities (bypass por `is_director = true`)

Todas las capabilities resuelven `true`. Resumen por seccion:

| Seccion | Capabilities | Director |
| --- | --- | --- |
| 1. Proyecto / presupuesto | `edit_project`, `edit_budget`, `edit_price_list`, `edit_insumos`, `write_project_indirects` | si |
| 2. Nomina | `create_payroll`, `edit_payroll`, `submit_payroll`, `approve_payroll`, `distribute_payments`, `delete_payroll_draft` | si |
| 3. Compras | `create_requisition`, `load_quotes`, `approve_excess`, `release_purchase_order`, `receive_order` | si |
| 4. Almacen | `inventory_write`, `override_stock` | si |
| 5. Obra | `write_bitacora`, `write_attendance`, `write_quality`, `measure_progress`, `write_schedule` | si |
| 6. Contratos | `create_contract`, `edit_contract_partidas`, `sign_contract`, `create_corte`, `approve_corte`, `write_adelantos` | si |
| 7. Finanzas | `write_ledger`, `view_cashflow`, `mark_paid`, `issue_check`, `write_loans` | si |
| 8. Catalogos | `write_contractors`, `write_suppliers`, `write_materials_catalog`, `write_bank_accounts` | si |
| 9. Reportes | `view_director_dashboard`, `view_approvals_log`, `view_reportes`, `view_price_history` | si |
| Admin | `manage_users`, `manage_roles` | si |

Mecanica: en ambos hooks, `const can = (cap) => isDirector || caps.has(cap)`.

## 6. Flujo tipico de un mes

1. **Inicio de mes — crear proyecto** (si aplica)
   - Proyectos → Nuevo → asignar empresa, presupuesto, calendario.
2. **Asignar equipo**
   - `/admin/usuarios → Roles` → asignar `director_proyecto`, `planificacion`, `comprador`, `ingeniero_obra`, `almacenista` al `project_id`.
   - Verificar matriz de capabilities en pestana **Matriz**.
3. **Mid-mes — revisar avances**
   - `/director` → KPIs por proyecto: avance fisico vs financiero, requisiciones abiertas, asistencia.
   - Bitacora y mediciones de avance (escritas por `ingeniero_obra` con `measure_progress`).
4. **Cierre — aprobar pagos**
   - **Nominas**: revisar borradores enviados (`submit_payroll`) → aprobar (`approve_payroll`) → distribuir (`distribute_payments`).
   - **OC**: liberar pendientes, aprobar excedentes si los hay.
   - **Cortes de obra**: validar contra avance medido → aprobar → autorizar pago.
   - **Finanzas**: revisar cashflow en `/finanzas`, marcar pagos emitidos.

> Tip: el log de aprobaciones (`view_approvals_log`) deja trazabilidad de quien aprobo cada movimiento.
