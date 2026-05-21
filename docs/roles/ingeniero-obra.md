# Manual del Rol: Ingeniero de Obra

## Descripcion

El rol **Ingeniero de Obra** es el responsable operativo en campo. Gestiona la nomina del personal asignado, lleva la bitacora diaria, controla asistencia, supervisa calidad, levanta requisiciones de insumos y emite los cortes de obra para cobro y conciliacion.

---

## Que puede hacer

### Nomina
- Dar de alta personal de obra (operarios, ayudantes, oficiales).
- Capturar jornadas trabajadas y tiempos extra.
- Aplicar bonos de productividad y descuentos autorizados.
- Cerrar nomina semanal y enviarla a Administracion para pago.
- Consultar historico de pagos por trabajador.

### Bitacora
- Registrar eventos diarios de obra (clima, incidentes, visitas).
- Adjuntar fotografias geolocalizadas.
- Firmar digitalmente las entradas para validez legal.
- Consultar bitacora historica filtrada por fecha o partida.

### Asistencia
- Marcar entrada y salida del personal por cuadrilla.
- Validar checadas biometricas o por geocerca.
- Justificar faltas con motivo y soporte.
- Generar reporte de asistencia semanal y mensual.

### Calidad
- Levantar listas de verificacion (checklists) por partida.
- Reportar no conformidades con foto y descripcion.
- Asignar responsable de cierre por hallazgo.
- Validar liberacion de actividades antes de continuar.

### Requisiciones
- Solicitar insumos desde el catalogo Mercado.
- Indicar cantidad, fecha requerida y partida asociada.
- Dar seguimiento al estatus de la requisicion.
- Recibir parcial o totalmente lo solicitado.

### Cortes
- Generar cortes de obra quincenales o mensuales.
- Adjuntar memoria de calculo y soporte fotografico.
- Enviar corte a Planificacion para validacion.
- Imprimir o exportar corte firmado en PDF.

---

## Flujo tipico diario

1. **06:30:** Pasar lista o validar checadas biometricas del personal.
2. **07:00:** Repartir cuadrillas y registrar asignacion en la app.
3. **10:00:** Levantar requisicion de insumos faltantes del dia.
4. **13:00:** Capturar avance fisico de partidas en ejecucion.
5. **15:00:** Registrar hallazgos de calidad y abrir no conformidades.
6. **17:00:** Cerrar bitacora del dia con fotos y firma.
7. **17:30:** Revisar tiempos extra y aprobar para nomina.

### Flujo de corte de obra

1. Capturar avances acumulados del periodo.
2. Generar borrador de corte.
3. Adjuntar fotos y memoria de calculo.
4. Enviar a Planificacion para validacion.
5. Firmar version final y archivar.

---

## Atajos UI

| Atajo | Accion |
|-------|--------|
| `G` luego `N` | Ir a Nomina |
| `G` luego `B` | Ir a Bitacora |
| `G` luego `A` | Ir a Asistencia |
| `G` luego `Q` | Ir a Calidad |
| `G` luego `R` | Ir a Requisiciones |
| `G` luego `O` | Ir a Cortes de obra |
| `Ctrl + N` | Nuevo registro en pantalla actual |
| `Ctrl + Shift + B` | Nueva entrada de bitacora |
| `Ctrl + Shift + R` | Nueva requisicion rapida |
| `F` | Adjuntar foto desde camara |
| `Space` | Marcar/desmarcar checklist |
| `Enter` | Confirmar checada de asistencia |
| `?` | Mostrar ayuda contextual |

### Tips de productividad

- Usa la app movil offline en zonas sin senal: se sincroniza al recuperar conexion.
- Define plantillas de bitacora para eventos recurrentes (concreto, acero, albanileria).
- Activa notificaciones push para aprobaciones pendientes de tiempos extra.
- Agrupa requisiciones similares antes de enviarlas para reducir gestion en Compras.

---

## Permisos y limites

- **No puede** modificar el presupuesto ni la lista de precios (corresponde a Planificacion).
- **No puede** aprobar cambios de precio en Mercado.
- **Si puede** solicitar insumos fuera de catalogo justificando la urgencia.
- **Si puede** rechazar entregas de proveedores que no cumplan calidad.
