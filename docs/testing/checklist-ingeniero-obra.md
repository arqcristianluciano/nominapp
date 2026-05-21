# Checklist QA - Ingeniero de Obra (Mobile)

Cuenta de prueba: `obra@nominapp.local`
Dispositivo: Celular (Android/iOS, navegador o PWA)
Objetivo: Validar el flujo diario del Ingeniero de Obra (IO) desde el sitio de obra.

---

## 1. Login en celular

- [ ] Abrir NominApp en el navegador del celular.
- [ ] Ingresar usuario `obra@nominapp.local` y contrasena.
- [ ] **Esperado:** Redirige al dashboard del IO con la obra asignada visible.
- [ ] **Esperado:** Menu inferior/lateral muestra: Bitacora, Asistencia, Calidad, Compras, Almacen, Contratos, Nomina, Avances.
- [ ] **Esperado:** Sesion persiste tras recargar la pagina.

## 2. Crear entrada de bitacora

- [ ] Entrar a "Bitacora" y tocar "Nueva entrada".
- [ ] Seleccionar fecha actual (default = hoy).
- [ ] Registrar clima (soleado / nublado / lluvia) desde selector.
- [ ] Registrar personal en obra (numero total + lista por categoria).
- [ ] Anadir observaciones en campo de texto largo.
- [ ] Adjuntar al menos 1 foto desde la camara del celular.
- [ ] **Esperado:** Entrada queda guardada con timestamp y autor = IO.
- [ ] **Esperado:** Foto se sube y se visualiza miniatura.

## 3. Registrar asistencia diaria

- [ ] Entrar a "Asistencia" del dia.
- [ ] **Esperado:** Lista precargada con personal asignado a la obra.
- [ ] Marcar entrada/salida por trabajador (toggle o check).
- [ ] Registrar al menos 1 falta y 1 retardo con motivo.
- [ ] Guardar asistencia.
- [ ] **Esperado:** Resumen muestra total presentes, ausentes y horas.
- [ ] **Esperado:** No permite duplicar asistencia para la misma fecha.

## 4. Registrar ensayo de control de calidad

- [ ] Entrar a "Calidad" > "Nuevo ensayo".
- [ ] Seleccionar tipo (revenimiento, compresion, densidad, etc.).
- [ ] Capturar muestra, fecha de ensayo, resultados numericos.
- [ ] Adjuntar foto del ensayo / probeta.
- [ ] Marcar resultado (aprobado / rechazado).
- [ ] **Esperado:** Ensayo se guarda asociado a la partida correspondiente.
- [ ] **Esperado:** Si es rechazado, sistema sugiere crear no-conformidad.

## 5. Crear requisicion de compra

- [ ] Entrar a "Compras" > "Nueva requisicion".
- [ ] Agregar materiales desde catalogo (buscador funciona).
- [ ] Especificar cantidad, unidad y fecha requerida.
- [ ] Anadir justificacion / partida destino.
- [ ] Enviar a aprobacion.
- [ ] **Esperado:** Requisicion queda en estado "Pendiente aprobacion".
- [ ] **Esperado:** Aparece numero de folio unico.

## 6. Recibir OC en almacen

- [ ] Entrar a "Almacen" > "Ordenes pendientes".
- [ ] Seleccionar una OC asignada a la obra.
- [ ] Capturar cantidades recibidas (parcial o total).
- [ ] Registrar diferencias / observaciones si aplica.
- [ ] Adjuntar foto de remision firmada.
- [ ] Confirmar recepcion.
- [ ] **Esperado:** Stock de obra se actualiza automaticamente.
- [ ] **Esperado:** OC pasa a "Recibida" o "Parcialmente recibida".

## 7. Crear corte de contrato (medicion)

- [ ] Entrar a "Contratos" > seleccionar contrato vigente.
- [ ] Tocar "Nuevo corte" / "Medicion".
- [ ] Capturar avances por concepto/partida (cantidades ejecutadas).
- [ ] Adjuntar evidencia fotografica por partida medida.
- [ ] Calcular subtotal y retenciones (automatico).
- [ ] Enviar corte para revision.
- [ ] **Esperado:** Total del corte coincide con suma de partidas.
- [ ] **Esperado:** Corte queda en estado "En revision".

## 8. Crear nomina draft y enviar a aprobacion

- [ ] Entrar a "Nomina" > "Nueva nomina semanal".
- [ ] **Esperado:** Sistema precarga horas desde asistencias de la semana.
- [ ] Revisar y ajustar conceptos (horas extra, bonos, descuentos).
- [ ] Guardar como draft.
- [ ] **Esperado:** Total bruto y neto se calculan en vivo.
- [ ] Enviar a aprobacion del residente / admin.
- [ ] **Esperado:** Estado cambia a "Pendiente aprobacion" con notificacion enviada.

## 9. Verificar avances de obra (% por partida)

- [ ] Entrar a "Avances" / "Progreso de obra".
- [ ] **Esperado:** Se muestra lista de partidas con % avance.
- [ ] Filtrar por categoria / fase.
- [ ] Tocar una partida para ver detalle (cantidad ejecutada vs contratada).
- [ ] Actualizar % de una partida desde mobile.
- [ ] **Esperado:** % global de obra se recalcula tras guardar.
- [ ] **Esperado:** Grafico/barra de progreso refleja el cambio.

## 10. Test mobile - usabilidad tactil

- [ ] Todos los botones de accion tienen tamano minimo de 44x44 px (tap target).
- [ ] No hay elementos que requieran hover para verse / activarse.
- [ ] Scroll vertical fluido en listas largas (asistencia, requisiciones).
- [ ] Formularios largos permiten scroll sin perder el campo activo.
- [ ] Teclado movil no tapa el input enfocado (auto-scroll).
- [ ] Selectores y datepickers son nativos del SO.
- [ ] Modales y popups se cierran con boton visible (no solo fuera).
- [ ] Inputs numericos abren teclado numerico en el celular.
- [ ] Camara se abre directo al adjuntar foto.
- [ ] Funciona en orientacion vertical y horizontal.
- [ ] App responde sin lag perceptible (< 300ms en taps).
- [ ] Sin scroll horizontal indeseado en ninguna pantalla.

---

**Notas:**
- Reportar bugs en el canal `#qa-mobile` con captura y pasos.
- Repetir checklist en al menos 1 Android y 1 iOS.
- Validar tambien con red 3G/4G lenta (modo throttling).
