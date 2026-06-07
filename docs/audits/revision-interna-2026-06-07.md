# Auditoría interna NominApp — Revisión automática por áreas (2026-06-07)

Revisión de código (no es ejecución en vivo) realizada por 13 inspectores, uno por
área. Severidad: **Crítico / Alto / Medio / Bajo**. Cada hallazgo indica archivo:línea.

> Nota de contexto: la app está en fase de pruebas con "acceso rápido" abierto a
> todos a propósito. Varios hallazgos de seguridad importan sobre todo **antes de
> abrir la app a usuarios reales**.

---

## A. Números que pueden salir mal (correctness financiera)

### A1. CRÍTICO — El botón "Descargar reporte mensual PDF" genera todo en cero

`src/pages/Reportes.tsx:95-127` — `handleGenerateMonthlyPdf` nunca llama a
`loadMonthlyReportData`; manda 0 en presupuesto, costos, flujo y nómina. La versión
correcta está en `ReporteMensualModal.tsx:115-119`. **Fix:** usar `loadMonthlyReportData`.

### A2. CRÍTICO — El PDF mensual duplica costos por categoría

`src/services/reports/monthlyReportData.ts:269-304` — cada partida de mano de obra y
factura de material se suma a la vez al ítem y a la categoría, y luego la categoría
suma ambos. La columna "Real" y el TOTAL salen inflados (hasta el doble).
**Fix:** alimentar `actualByCategory` solo con fuentes sin `budget_item_id`.

### A3. ALTO — Los depósitos (cobros) se cuentan como gastos

`src/services/cashFlowService.ts:112-117` y `src/services/directorService.ts:63-65` —
todas las transacciones se suman como egreso, incluidos los de categoría
`19 - DEPOSITOS` (que son entradas). Infla "egresos reales" y "Ejecutado" en flujo de
caja y en el tablero del director. **Fix:** excluir/separar la categoría depósito.

### A4. ALTO — Cubicaciones: "Pendiente" no resta los adelantos

`src/pages/CubicacionContratoPage.tsx:53` y `ContractPrintSections.tsx:94` recalculan
`pendiente = acordado - acumulado` ignorando adelantos (el servicio sí los resta).
Riesgo de **pagar de más** a un contratista. **Fix:** restar adelantos.

### A5. CRÍTICO — Cubicaciones: los cortes en borrador inflan lo "acumulado" y el avance

`src/services/cubicationService.ts:34-35` (y `PartidaSection.tsx:468`) suman todos los
cortes sin filtrar estado; un corte en borrador (no aprobado) ya cuenta como avance en
KPIs, barra de progreso y PDF al cliente. **Fix:** filtrar `status !== 'draft'`.

### A6. ALTO — Cubicaciones: el adelanto se puede descontar dos veces

`CubicacionesPayrollSection.tsx:89-98` — `getByContract` trae todos los adelantos sin
marcar los ya descontados; vincular dos cortes ofrece descontar el total completo otra
vez. **Fix:** marcar adelantos descontados / llevar saldo.

### A7. CRÍTICO — Distribución de pagos: los pagos cancelados inflan "lo distribuido"

`paymentDistributionService.ts:62` y `PaymentDistributionsSection.tsx:64` suman también
los `cancelled`. "Falta distribuir" se ve menor de lo real y bloquea pagos nuevos
legítimos. **Fix:** filtrar `status !== 'cancelled'`.

### A8. ALTO — Distribución de pagos: consolidar (sumar) no valida el tope y tiene carrera

`paymentDistributionService.ts:89-124` — `addAmount` no comprueba el total del período
(se puede repartir más que el total de la nómina) y hace leer-luego-escribir no atómico
(dos personas a la vez pierden dinero). **Fix:** validar tope + incremento atómico en DB.

### A9. ALTO — Distribución de pagos: dos pagos sin beneficiario se "fusionan" entre sí

`PaymentDistributionsSection.tsx:108` — al comparar `beneficiary_id` cuando ambos son
`null`, `null === null` es verdadero; un pago nuevo sin beneficiario suma dinero a otro
no relacionado. **Fix:** exigir `beneficiary_id !== null` para consolidar.

### A10. ALTO — Nómina: "Marcar todo como pagado" salta la aprobación

`useReportesObraState.ts:89-104` — pasa a `paid` también borradores y enviados sin
aprobar. **Fix:** limitar a estado `approved`.

### A11. ALTO — Indirectos: si falla el borrado, se pueden duplicar

`src/services/payrollService.ts:573` — el DELETE de indirectos automáticos no revisa su
error y luego inserta de nuevo (10% puede volverse 20%). **Fix:** revisar el error del
DELETE y abortar si falla.

### A12. ALTO/MEDIO — Nómina: total con cierre "viejo" en memoria

`usePayroll.ts:114-129, 83-85, 117` — `persistIndirect`/`recalcTotals` pueden usar
labor/materiales o indirectos manuales de un render anterior y guardar un `grand_total`
distinto al de las líneas; además sin `round2` (ruido de centavos en pantalla).
**Fix:** leer indirectos frescos de la DB / derivar totales del estado vivo + `round2`.

### A13. MEDIO — ITBIS de cotizaciones sin redondear y desglose que no cuadra

`quoteService.ts:22-23` (sin `round2`) y `QuotesPanel.tsx:135` (ITBIS recalculado
aparte del total guardado). **Fix:** redondear al guardar y mostrar `tax_amount` guardado.

### A14. MEDIO — Flujo de caja: neto sin redondear; transacción a 0 conserva el viejo total

`cashFlowService.ts:129-130` (raw float) y `TransactionRow.tsx:118`
(`total || transaction.total` ignora un 0 intencional). **Fix:** `round2` y quitar el `||`.

---

## B. Cosas que parecen guardarse pero no (fallos silenciosos / datos perdidos)

### B1. CRÍTICO — Factura de materiales: se pierde si falla el guardado, sin avisar

`usePayroll.ts:282-286` + `PayrollEditor.tsx:199-202` — el hook atrapa el error y no lo
relanza; el modal se cierra siempre y la factura se pierde. **Fix:** relanzar y cerrar
solo si tuvo éxito.

### B2. ALTO — Proveedores: no se pueden vaciar los datos del banco al editar

`SupplierForm.tsx:50-58` — los campos opcionales mandan `undefined` (PostgREST omite la
columna), así que al borrar el banco/cuenta/tipo se queda el valor viejo. **Fix:** mandar
`null` en vez de `undefined`.

### B3. Varios — Botones que fallan en silencio (sin try/catch)

Borran/guardan y el error desaparece, dejando datos inconsistentes y sin aviso:
`LoanDeductionSection.tsx:78-81`, `cubicacion/PrestamoSection.tsx:102-110`,
`PartidaSection.tsx:529`, `AdelantoSection.tsx:58`, `FlujoCajaPage.tsx:82-85`,
`bitacora/useBitacoraPage.ts:56-75` (sin catch), `MaterialsCatalogPage.tsx:82-85`,
`ContractorDetail.tsx:41-57` (sin catch), `CubicacionContratoPage.tsx:32-36`.
**Fix:** envolver en try/catch con toast de error.

### B4. ALTO — Archivos huérfanos en almacenamiento (cuesta dinero)

Al borrar registros o al fallar el guardado tras subir un archivo, el archivo queda para
siempre en el bucket: calidad (`QualityControlForm.tsx` X y `delete`), asistencia y
bitácora (`useAttendancePage.ts`, `useBitacoraPage.ts`), factura de materiales
(`AddMaterialForm.tsx:88`, sin limpieza al desmontar). **Fix:** borrar el archivo cuando
se quita/borra y al fallar el guardado.

### B5. ALTO — Bitácora: el autor siempre queda como "Admin"

`bitacora/bitacoraConfig.ts:23` — `created_by: 'Admin'` fijo, no el usuario real. La
bitácora es documento legal. **Fix:** usar el usuario autenticado.

### B6. ALTO — Préstamos: se puede descontar más que el saldo

`payroll/LoanDeductionSection.tsx:58-75` — no valida que el descuento ≤ saldo; saldo
negativo. **Fix:** validar contra el saldo + CHECK en DB.

---

## C. Inventario/almacén con varios usuarios a la vez

### C1. CRÍTICO — Carrera en stock y lotes (varios usuarios) corrompe existencias

`inventoryService.ts:172-265, 314-333` — leer-luego-escribir sin bloqueo; dos
movimientos simultáneos se pisan. **Fix:** incremento atómico en DB (RPC / `FOR UPDATE`)

- CHECK `current_stock >= 0`.

### C2. ALTO — Borrar un material borra todo su historial

`inventoryService.ts:157-160` (+ `ON DELETE CASCADE`) — un clic elimina movimientos y
lotes sin registro. **Fix:** impedir si tiene stock/movimientos; `ON DELETE RESTRICT`.

### C3. ALTO/MEDIO — Recepción puede dejar lote fantasma / costo promedio mal / reversa drena lotes equivocados

`requisitionService.ts:531-558, 672-687` e `inventoryService.ts:246-258` —
ver detalles en hallazgos 3, 5 y 8 de inventario. **Fix:** envolver en transacción DB y
usar `movement.lot_id` al revertir.

### C4. MEDIO — Alerta de stock bajo se dispara en cero / con `<=`

`inventoryService.ts:282`, `directorService.ts:90` — items nuevos con `min_stock = 0` y
stock 0 alertan siempre. **Fix:** `<` estricto y omitir `min_stock = 0`.

---

## D. Seguridad y permisos (importante antes de abrir a usuarios reales)

### D1. CRÍTICO — Un usuario puede auto-nombrarse "Director General"

`051_rls_perf_and_grants.sql:36-39` — la política deja a cualquiera editar su propia
fila de `user_profiles`, incluido `is_director`. Un solo cambio da control total.
**Fix:** trigger que impida cambiar `is_director` salvo a un director.

### D2. ALTO — Las credenciales de prueba viajan en la app y el interruptor no funciona

`constants/testUsers.ts:14`, `login/LoginSections.tsx:59` — `ENABLE_TEST_QUICK_LOGIN`
nunca se usa; los botones de acceso rápido (con contraseñas) salen siempre. Hoy es
**intencional** (pruebas), pero el apagador no sirve para producción. **Fix:** conectar
el guard y no habilitarlo en el build real.

### D3. ALTO — El registro de auditoría de permisos falla siempre (vacío)

`adminService.ts:139,157,202,220` — `entity_id` manda textos compuestos a una columna
UUID; PostgreSQL los rechaza y el `.catch` lo silencia. No hay rastro de quién dio/quitó
permisos. **Fix:** `entity_id TEXT` o UUID derivado.

### D4. ALTO — La contraseña inicial del nuevo usuario se muestra en texto plano

`admin/AdminUserForm.tsx:90` — `type="text"`. **Fix:** `type="password"` + `autoComplete`.

### D5. MEDIO — Desalineación permisos UI vs DB

`useAppRoles.ts:156` y `031_...:238-256` — `manage_roles`/`manage_users` se chequean
distinto en pantalla y en DB (uno permite lo que el otro bloquea). **Fix:** alinear RLS
con el modelo de capacidades.

### D6. MEDIO — Sesión no se refresca al cambiar rol; `is_director` cacheado

`authStore.ts:14-35`, `authService.ts:48-63` — un director degradado conserva acceso
hasta cerrar sesión. **Fix:** refrescar el usuario tras cambios de perfil.

### D7. MEDIO — Cola sin conexión sin límite de reintentos / prueba que escribe en DB real

`utils/offlineQueue.ts:124-148` (sin `MAX_RETRIES`) y `approvalsService.test.ts` (sin
mock). **Fix:** límite de reintentos + mockear Supabase en la prueba.

---

## E. Detalles menores (mayormente cosméticos)

- **Fechas un día antes (zona horaria UTC):** nómina impresa
  (`PayrollPrintSections.tsx:32`, `PayrollEditorSections.tsx:71`), calidad
  (`qualityUtils.ts` + `QualityRecordsTable.tsx`), CxP aging (`CxPView.tsx:13`),
  Gantt (`scheduleGanttUtils.ts:17-21`), y los `new Date().toISOString()` de
  asistencia/bitácora/avances. **Fix:** usar `@/utils/dateLocal` (`todayISO`/parse local).
- **Números duplicables (carrera):** `nextReqNumber` (`requisitionService.ts:14`),
  `nextCode` catálogo (`materialsCatalogService.ts:29`), proveedor por nombre
  (`SupplierSelect`/`SupplierForm`), versión de presupuesto
  (`budgetVersionService.ts:31`). **Fix:** secuencia/índice único en DB.
- **Auto-imprimir al abrir** firma de contrato y cubicación
  (`ContratoFirmaSections.tsx:18`, `ContractPrintSections.tsx:19`): dispara `window.print()`
  antes de firmar/revisar. **Fix:** imprimir solo con el botón / `ref` de una vez.
- **N+1 en página de Préstamos** (`useLoansPage.ts:32`): usar `getTotalPaidByLoans`.
- **Avance general sin ponderar por duración** (`scheduleService.ts:48`).
- **Notificación de presupuesto con `.limit(500)`** (`notificationService.ts:115`) puede
  perder datos y suprimir alertas.
- **Nombre de proveedor sin `trim()`** y mayúsculas inconsistentes entre las dos formas
  de crear proveedor.
- **`window.open` sin verificar bloqueo de ventana** (calidad), **BOM CSV como carácter**
  en vez de `'﻿'`.

---

## Resumen de severidad (hallazgos destacados)

- **Críticos:** A1, A2, A5, A7, B1, C1, D1
- **Altos:** A3, A4, A6, A8, A9, A10, A11, B2, B4, B5, B6, C2, C3, D2, D3, D4
- **Medios/Bajos:** el resto (correcciones de calidad y robustez).
