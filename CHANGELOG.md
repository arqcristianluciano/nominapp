# Changelog

Todos los cambios notables de NominApp se documentan en este archivo.

El formato esta basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Pendiente.

### Changed
- Pendiente.

### Fixed
- Pendiente.

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

[Unreleased]: https://github.com/arqcristianluciano/nominapp/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/arqcristianluciano/nominapp/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/arqcristianluciano/nominapp/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/arqcristianluciano/nominapp/releases/tag/v0.3.0
