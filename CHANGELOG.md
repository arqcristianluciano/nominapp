# Changelog

Todos los cambios notables de NominApp se documentan en este archivo.

El formato esta basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Recordatorio diario de cobros al celular: Edge Function `loan-reminders` (push a directores con cuotas vencidas o que vencen en ≤2 días) ejecutada cada día a las 8:00 AM RD por pg_cron + pg_net (migración 092, tabla `internal_config` para el secreto server-to-server).
- Préstamos: recibo de pago en PDF por cada cuota pagada (botón en el cronograma) y estado de cuenta del préstamo en PDF (botón en cada fila), generados con pdfmake (`loanPdfService`).
- Préstamos: tarjeta "Intereses ganados" en el resumen del fondo (`calcInterestEarned`: interés proporcional a lo cobrado).

- Conciliación de cuentas: corregir (lapicito) y borrar (con confirmación) los movimientos anotados a mano (`manual` / `initial_balance`); los generados por préstamos no son editables desde el panel.
- Préstamos: cuotas vencidas (pendientes con fecha pasada) resaltadas en rojo con etiqueta "Vencida" en el cronograma, y contador de cuotas vencidas por préstamo activo.
- Préstamos: tarjetas de resumen del fondo (Disponible en cuentas internas, En la calle, Total cobrado, Cuotas vencidas) al inicio de la pantalla.
- Conciliación de cuentas: exportar los movimientos de la cuenta seleccionada a Excel, con fila de totales y saldo.
- Cuentas bancarias: campo "Saldo inicial (RD$)" al crear una cuenta interna; se registra como primer movimiento de entrada (origen `initial_balance`) para que los desembolsos de préstamos tengan fondos de los que salir.
- Conciliación de cuentas: botón "Registrar movimiento" para anotar depósitos y retiros manuales en la cuenta seleccionada (visible solo con permiso `write_bank_accounts`).
- Formulario de préstamo: muestra el saldo disponible de la cuenta de desembolso elegida y avisa (sin bloquear) cuando el monto del préstamo supera ese saldo.

- Catálogo de unidades de medida guardado en la base de datos (`measure_units`, migración 089): los selects de unidad (solicitudes de compra, mano de obra de nómina, partidas de presupuesto y lista de precios) leen el catálogo y ofrecen "+ Añadir nueva unidad…" para registrar unidades como Atado o Libra, que quedan disponibles en toda la app. La semilla incluye las unidades que ya se usaban más Atado, Libra y Quintal.
- Préstamos: campo "Fecha de la primera cuota" (migración 090). Las cuotas se programan a partir de esa fecha según la frecuencia; si se deja vacía, se mantiene el cálculo desde el desembolso.
- Préstamos: registrar el pago de cuotas individuales desde el cronograma del préstamo, con fecha real de pago y cuenta a la que entra el dinero (genera el movimiento de entrada en Conciliación). Al pagar la última cuota pendiente, el préstamo queda marcado como Pagado.
- Préstamos: cambiar la fecha programada de una cuota pendiente desde el cronograma.
- Aviso con enlace a Configuración → Cuentas bancarias cuando no hay cuentas registradas, en el formulario de préstamo y en la ventana de pago de cuota.

- Subpartidas del presupuesto numeradas automáticamente (1.1, 1.2, …) en la lista y en el modal de creación (#40).
- Las partidas que quedan vacías (sin subpartidas, sin monto y sin gasto) se detectan automáticamente. Tras importar un presupuesto desde Excel se ofrece eliminarlas de una vez, y en cualquier momento desde el botón "Limpiar partidas vacías (N)" de la cabecera. Siempre pide confirmación y permite elegir con checkboxes cuáles borrar (nunca se borra sin preguntar). Las partidas vacías se resaltan en la tabla con una etiqueta "vacía", y tras eliminarlas un aviso ofrece "Deshacer" para recuperarlas.
- Botón para eliminar manualmente una partida vacía desde la tabla de presupuesto, con confirmación.
- Los avisos (toast) admiten un botón de acción opcional (p. ej. "Deshacer") y duración configurable.
- Facturas de materiales con varios ítems: una factura agrupa proveedor, referencia y varios ítems (descripción + monto), con total calculado automáticamente (nueva tabla `material_invoice_items`, migración 051).
- Comprobante de factura (imagen o PDF): botón para adjuntar el comprobante al crear la factura o después desde la lista, almacenado en el bucket privado `invoice-attachments`. Las facturas sin comprobante muestran una advertencia "Falta comprobante" que desaparece al adjuntarlo.
- Las facturas de materiales y las partidas de mano de obra ahora se pueden imputar a un capítulo y a una partida del presupuesto.
- Las listas de mano de obra y materiales del editor de nómina muestran el capítulo/partida imputado de cada renglón.
- Nueva vista "Por partida (acumulado)" en Cubicación: costo real imputado por partida (salidas de almacén, mano de obra y facturas) frente al presupuesto, con exportación a Excel.
- Edición de partidas de mano de obra y facturas de materiales en el reporte de nómina: cada fila tiene un botón "Editar" con el formulario pre-cargado, evitando tener que borrar y rehacer ante un error. En borrador puede editar quien tiene permiso de edición (quien introduce los datos); en reportes ya enviados/aprobados/pagados solo la mayor jerarquía (Director/quien aprueba), y esas correcciones quedan registradas en la bitácora de aprobaciones.
- Las transacciones (CxP / diario) ahora se pueden imputar a una partida del presupuesto, además del capítulo (migración 052), y se incluyen en el costo real por partida.
- El Diario muestra una columna "Partida" y permite editar la partida de transacciones ya existentes en la edición de la fila (antes solo se podía asignar al crear la transacción).
- Imputación de partida en lote desde el Diario: asigna una partida a todas las transacciones de un capítulo que aún no la tienen, para completar la cobertura del costo por partida en el histórico.
- Exportación del Diario a Excel (incluye la columna de partida), respetando el filtro de fechas activo.
- Coherencia capítulo/partida en transacciones garantizada en la base (migración 056): un trigger fuerza el capítulo de la transacción al de su partida, evitando imputaciones inconsistentes por import o edición directa.
- La vista mensual por capítulo de Cubicación ahora incluye las transacciones (CxP) en el costo real, igual que la vista por partida (antes quedaban fuera), unificando el criterio entre ambos reportes.
- La vista "Por partida" de Cubicación muestra un indicador de cobertura: qué porcentaje del costo real está imputado a una partida y cuánto quedó sin partida.
- Sugerencia de partida al capturar mano de obra, materiales y transacciones: si el capítulo tiene una sola partida se autoselecciona, y se avisa suavemente cuando se deja sin partida.
- Botón "Devolver a borrador" en el reporte de nómina: la mayor jerarquía (quien aprueba) puede regresar un reporte enviado o aprobado a borrador para que el autor lo corrija. Pide confirmación, quita la aprobación y registra la acción (`return_for_revision`) en la bitácora. Un reporte pagado no se puede devolver.
- Sección "Historial de cambios" en el reporte de nómina: lista quién y cuándo realizó cada acción auditada (creación, envío, aprobación, devolución a borrador, edición de partidas/facturas en reportes comprometidos), leída de la bitácora de aprobaciones.
- Autor de cada partida/factura (`created_by`): las partidas de mano de obra y facturas de materiales registran quién las introdujo (migración 052, aditiva, con `DEFAULT auth.uid()` + trigger). El editor muestra "Agregado por …" al corregir una línea.
- Exportar a CSV la distribución de pagos del período (beneficiario, cédula/RNC, banco, cuenta, monto, método, cuenta de origen y estado), apto para banca electrónica u hojas de cálculo.
- La distribución de pagos captura la cédula/RNC del beneficiario y permite registrar la cuenta de origen interna desde la que sale el pago (migración 056, aditiva).
- Fuente única de verdad para las categorías de la lista de precios (`src/constants/priceListCategories.ts`), consumida por el formulario, el panel y el generador de códigos.
- Tests que blindan la consistencia de categorías: el generador de códigos cubre cada categoría y un test verifica que el constraint `category` en `supabase-schema.sql` permite todas las categorías de la UI, atrapando en CI la deriva esquema↔UI que causó el bug de "Ajuste".
- Regla de ESLint que prohíbe los `catch` cuyo único cuerpo es un `console.*`, para evitar errores silenciados sin feedback al usuario.
- Migración 060 que formaliza la creación de `price_list_items` (antes solo existía en `supabase-schema.sql`), para que el set de migraciones sea fuente de verdad completa.

### Changed

- Edición de partidas de mano de obra y facturas de materiales restringida a su autor o al Director (migración 058): además del permiso por etapa del período, ahora solo quien introdujo la línea (o un Director) puede modificarla o borrarla. Las líneas históricas sin autor registrado siguen editables por quien puede editar el período.
- Rendimiento de RLS (migración 057): las políticas de `project_members` y `user_documents` evalúan `auth.uid()` una sola vez por consulta en lugar de por fila; se agregó el índice faltante en `purchase_requisitions.approved_quote_id`.
- Números de requisición ahora consecutivos por año (REQ-2026-0001, 0002, …) en lugar de un número aleatorio.
- `sort_order` de partidas de cubicación se calcula como máximo + 1 para no colisionar al borrar filas.
- El editor y la impresión de nómina ahora muestran las facturas de materiales detalladas por ítem.
- Distribución de pagos: ahora se selecciona un beneficiario (contratista o proveedor) y los datos bancarios se copian automáticamente desde su ficha, en lugar de exigir una cuenta bancaria interna (migración 052).
- Distribución de pagos: el desplegable marca los beneficiarios sin datos bancarios y eliminar un pago ahora pide confirmación.

### Fixed

- Ya se pueden registrar cuentas bancarias internas (de la empresa) desde Configuración: la migración 048 exigía proyecto en toda cuenta (`project_id NOT NULL`), chocando con el diseño de cuentas internas sin proyecto. La migración 091 lo relaja conservando la integridad con un CHECK (solo las internas pueden quedar sin proyecto), y el formulario avisa en claro si se intenta crear una cuenta no interna desde ahí.
- Los errores de permisos de la base de datos (violaciones de RLS / "permission denied") ahora se muestran al usuario en lenguaje claro: "Tu usuario no tiene permiso para realizar esta acción…", en lugar del mensaje técnico en inglés.
- Cronograma de obra: el error «duplicate key value violates unique constraint "uniq_schedule_tasks_project_number"» al guardar una tarea quedó resuelto: el número de tarea ahora lo asigna la base de datos de forma atómica al insertar (migración 088, trigger con candado por proyecto) y el botón Guardar es a prueba de doble clic.
- Cronograma de obra: al pulsar editar o añadir subtarea la página se desplaza sola hasta el formulario (antes había que subir manualmente), y la lista se refresca sola después de cada intento de guardado, con o sin error.
- Préstamos: al editar un préstamo se enviaban a la base campos no editables (incluido un `contractor_id` vacío); ahora solo se guardan los campos del formulario. Cambiar la fecha de desembolso o la de primera cuota regenera las cuotas pendientes; editar solo notas o cuenta ya no pisa fechas ajustadas a mano.
- Préstamos: el total "Pagado" y el saldo de cada préstamo consideran también las cuotas cobradas directamente, no solo las deducciones de nómina (se toma el mayor de ambos registros para no contar doble).
- Solicitudes de compra: la unidad por defecto de una línea nueva era "UND", un valor que no existía en el catálogo; ahora es "Unidad" (UD).
- En la cubicación mensual por capítulo, los costos imputados solo a una partida (mano de obra y facturas de materiales sin capítulo explícito) ahora se agrupan en el capítulo de esa partida, en lugar de caer en "sin capítulo". El cálculo del capítulo es ahora consistente entre todas las fuentes de costo (inventario, nómina, facturas y CxP).
- Integridad del total de facturas: `material_invoices.amount` se recalcula automáticamente como la suma de sus ítems mediante un trigger en BD (migración 058), blindándolo frente a ediciones directas además de la lógica de la app.
- E2E (Playwright) en CI como job _advisory_ (no bloqueante hasta estabilizar la suite), con nuevo spec del flujo de factura de materiales con varios ítems y advertencia de comprobante.
- Comprobantes huérfanos: al eliminar una factura de materiales —o al reemplazar/quitar su comprobante al editarla— el archivo se borra del bucket `invoice-attachments` (antes quedaba huérfano ocupando espacio).
- Endurecimiento del bucket `invoice-attachments`: ahora valida del lado del servidor que sólo se suban imágenes o PDF de hasta 10 MB (migración 057), como defensa en profundidad además de la validación del cliente.
- La numeración automática de subpartidas ahora respeta el código de la partida (p. ej. `T2.5`, no `2.5`) y continúa desde el mayor número existente, evitando defaults erróneos como `3.1` y colisiones tras borrar filas (#40).
- La importación de presupuesto desde Excel asigna y persiste códigos consecutivos por partida a las subpartidas que no traen código, continuando desde el mayor existente y respetando los códigos que sí vengan en el archivo.
- Modo demo: el cliente mock ahora implementa `removeChannel` y un stub de `storage`, evitando el crash al navegar y permitiendo adjuntar/ver comprobantes en demo.
- La lista de precios ya permite guardar ítems de tipo "Ajuste". El constraint `category` de `price_list_items` omitía `adjustment`, por lo que esos precios fallaban en silencio al guardarse (migración 050).
- `PriceListInlineForm` ahora muestra un toast de error cuando un precio no se puede guardar, en lugar de fallar en silencio.
- El selector de la distribución de pagos ya no aparece vacío: antes dependía de la tabla `bank_accounts` (sin registros) en vez de los beneficiarios.
- Distribución de pagos: completar o eliminar un pago ahora avisa al usuario si la operación falla, en lugar de hacerlo en silencio.

## [0.6.0] - 2026-05-26

### Security

- Cerrado leak cross-tenant en SELECT: RLS ahora limita lecturas por proyecto/empresa (migracion 043).
- WITH CHECK en INSERT de aprobaciones y proyectos para evitar insertar filas fuera del tenant (migracion 044).
- Endurecimiento de la edge function `send-push`: auth verificada y CORS restringido a origenes permitidos.
- Validacion de archivos (tamano, MIME y nombre) en la subida de documentos de usuario.

### Fixed

- Contexto de Toast memoizado para evitar loops de re-fetch.
- `AttendanceForm` ya no pierde ediciones del usuario cuando llega la geolocalizacion.
- Boton anidado invalido en `NotificationDropdown`.
- Formularios (`TransactionRow`, `ProjectForm`) ahora resetean su estado al cambiar de entidad.
- Errores ahora se muestran al usuario en ~12 lugares donde antes fallaban en silencio.

### Added

- Portada, pie de pagina y anexo en el PDF del reporte mensual.
- `ReporteMensualModal` ahora carga datos reales (antes mostraba placeholders).
- Constraints `NOT NULL` (migracion 045), `UNIQUE` de identidad (migracion 046) y llaves foraneas (migracion 047).
- Indices de performance y ajuste de grants en RLS (migracion 048).

## [0.5.0] - 2026-05-21

### Added

- Reporte mensual PDF con 4 secciones (resumen ejecutivo, nomina, compras, avances) (#24).
- PWA instalable en Android e iOS con manifest y service worker pulidos (#24).
- Internacionalizacion ES/EN con selector de idioma en sidebar (#24).
- Foto y geolocalizacion en captura de Asistencia desde el frente de obra (#24).
- Foto en entradas de Bitacora diaria (#24).
- CTAs sticky en flujos mobile para acciones primarias (#24).
- Invitacion de usuarios por email desde `/admin/usuarios` con tab dedicada (#24).
- Export profundo en CSV y ZIP para datos transversales del proyecto (#24).
- Specs e2e adicionales para los flujos nuevos (#24).

### Changed

- Auditoria mobile profunda aplicada en Cubicaciones, Nomina, Ordenes de Compra, Inventario y CxP (#24).

### Fixed

- Error de build TypeScript en `executiveSummary` (#24).
- Panel de exportar en pantalla de Settings (#24).

### Migrations

- `040_bitacora_photos`: soporte de fotos en bitacora diaria (#24).
- `041_attendance_photo_geo`: foto y coordenadas GPS en asistencia (#24).

## [0.4.0] - 2026-05-21

### Added

- Pagina `/admin/usuarios` con CRUD de personas y matriz editable de permisos por rol/proyecto (#19).
- Aplicacion de matriz de permisos v2 en UI y politicas RLS para los 8 roles del documento (#11).
- Nuevos gates de rol y validaciones derivadas del barrido de auditoria (#21, #22).
- Features administrativas adicionales surgidas de la tercera ronda de auditoria 40-agentes (#22).
- Tooling y documentacion ampliada producto del barrido 40-v2 (#23).

### Changed

- Endurecimiento de politicas RLS por rol/proyecto y consolidacion del helper de membresia (#21, #22).
- Reorganizacion de flujos administrativos y mejoras de accesibilidad (a11y) en pantallas existentes (#22).
- Ajustes de UX y consistencia visual derivados de los batches criticos y altos del barrido (#21).

### Fixed

- Correcciones criticas y de prioridad alta detectadas por los 12 + 30 agentes de auditoria (#21).
- Arreglos de base de datos, features admin y tests reportados en la tercera ronda (#22).
- Estabilizacion de docs, features y tests producto del barrido 40-v2 (#23).

### Security

- Refuerzo de RLS por rol/proyecto y validacion de permisos en la matriz v2 (#11, #21, #22).
- Verificacion de gates de rol en endpoints y vistas sensibles (#19, #22).

### Documentation

- Actualizacion de documentacion tecnica y de auditoria derivada del barrido 40-agentes (#23).
- Documentacion de la matriz de permisos v2 y del modulo `/admin/usuarios` (#11, #19).

## [0.3.0] - 2026-05-19

### Added

- Integracion de Sentry para captura de errores de cliente (observabilidad) (#16).
- Quick-access provisional de login con los 8 roles del documento.
- Web Push end-to-end: Edge Function, UI y trigger.
- Pagina `/aprobaciones` con backfill historico e inbox de notificaciones.
- Gates de rol en UI y validacion de excedente y override de stock.
- Supabase Auth real con fallback demo y roles por proyecto.
- Wire de capitulo en nomina, catalogo en inventario y captura de avances.
- Nivel 4: cola offline PWA, Web Push y export bancario.
- Nivel 3: dashboard global multi-empresa para Director General.
- Nivel 2: catalogo global, fechas en partidas, cubicacion mensual y plan de caja.
- Nivel 1: tabla central de aprobaciones y migraciones de reglas criticas.
- Nominas: solo las aprobadas cuentan como costo + imputacion a capitulo.
- Almacen: salidas imputadas a partida y bloqueo de stock negativo.
- Compras: solicitudes imputadas a partida y reglas de excedente con minimo de 1 cotizacion.
- Workflow CI de healthcheck post-deploy a produccion.
- Smoke tests e2e de rutas nuevas (catalogo, director, solicitud).
- Cobertura e2e de flujos criticos de presupuesto recientemente arreglados (#14).

### Changed

- Centralizacion de membresia en `is_member_of_project` y uso de `projects.created_by` (#17).
- Unificacion de helpers compartidos entre `parseBudgetExcel` y `parseMercadoExcel` (#15).
- Formateo de JSX one-liners en componentes de presupuesto (#13).
- Modularizacion de pantallas, vistas y componentes por feature.
- Modularizacion de paginas de control de proyecto y orquestacion restante.
- Hardening de flujos UX y estabilizacion del dashboard y comportamiento e2e.

### Fixed

- Romper recursion RLS y crear partidas nuevas al importar Excel de presupuesto (#12).
- Rellenado de tokens NULL en `auth.users` (#10).
- Permitir crear proyecto cuando no hay empresas (#7).
- Estabilizacion de selectors e2e de presupuesto.
- Refuerzo de estilos dark en inputs de control.
- Correccion de contraste de Control Financiero en modo oscuro.
- Mejora de accesibilidad en Control Financiero y breadcrumb.
- Eliminacion de `@playwright/test` duplicado e ignore de `.env*.local`.
- Mock: `unaccent` en `ilike` y `custom_indirects` en tests.

### Security

- Activacion de RLS baseline permissive en todas las tablas de `public`.
- Endurecimiento de RLS por rol/proyecto y completado de empresas faltantes.

### Documentation

- Documentacion de migraciones aplicadas en produccion via MCP.
- Alineacion de `PROJECT.md` con el estado actual del proyecto.
- Registro de canvases oficiales de auditoria.

[Unreleased]: https://github.com/arqcristianluciano/nominapp/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/arqcristianluciano/nominapp/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/arqcristianluciano/nominapp/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/arqcristianluciano/nominapp/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/arqcristianluciano/nominapp/releases/tag/v0.3.0
