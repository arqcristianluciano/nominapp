# Checklist QA Director General — NominApp

Guia paso a paso para que el DG pruebe la app de extremo a extremo. Ejecutar **en orden**: cada paso depende de los anteriores. Marca los checkboxes conforme avances.

---

## 1. Login y bienvenida

- [ ] Abrir la URL de la app e ingresar con credenciales de DG.
- [ ] La sesion inicia sin errores en consola.
- [ ] El sidebar es visible y muestra todos los modulos del DG (Director, Aprobaciones, Cortes, Configuracion, Admin).
- [ ] La pantalla de bienvenida carga datos (empresas, proyectos, KPIs basicos) sin spinners colgados.

**Resultado esperado:** sesion activa, sidebar completo, datos visibles en home en < 3 s.

---

## 2. Crear empresa nueva

- [ ] Ir a `/configuracion` > pestania **Empresas**.
- [ ] Click en "Nueva empresa" y llenar nombre, RFC, datos fiscales.
- [ ] Guardar; aparece toast de exito.
- [ ] La empresa nueva aparece en el listado inmediatamente.

**Resultado esperado:** empresa creada y visible, sin recargar la pagina.

---

## 3. Crear proyecto nuevo

- [ ] Ir a `/configuracion` > pestania **Proyectos** (o modulo de proyectos).
- [ ] Click en "Nuevo proyecto" y asignar: empresa (la creada en paso 2), **codigo**, **ubicacion/location**, **% indirectos**.
- [ ] Guardar; toast de exito.
- [ ] El proyecto aparece en el listado vinculado a la empresa correcta.

**Resultado esperado:** proyecto creado con todos los campos persistidos correctamente.

---

## 4. Crear usuario nuevo

- [ ] Ir a `/admin/usuarios`.
- [ ] Click en "Nuevo usuario", capturar email, nombre y **password fuerte** (8+ chars, mayuscula, numero, simbolo).
- [ ] Guardar; el usuario aparece en la matriz.
- [ ] Cerrar sesion del DG y abrir nueva ventana incognito.
- [ ] Loguearse con las credenciales del usuario nuevo.

**Resultado esperado:** el usuario nuevo entra a la app sin error, ve sidebar minimo (sin capabilities asignadas).

---

## 5. Asignar rol a usuario (DP de un proyecto)

- [ ] Regresar a la sesion de DG.
- [ ] En `/admin/usuarios`, abrir el detalle del usuario creado en paso 4.
- [ ] Asignar rol **DP (Director de Proyecto)** sobre el proyecto creado en paso 3.
- [ ] Guardar; toast de exito.
- [ ] Refrescar la sesion del usuario (ventana incognito) y verificar que ahora ve el proyecto asignado.

**Resultado esperado:** el usuario tiene rol DP visible en su perfil y puede entrar al proyecto.

---

## 6. Toggle de capability en Matriz

- [ ] En `/admin/usuarios`, abrir vista **Matriz**.
- [ ] Activar (toggle) una capability sobre el usuario creado (ej. `nomina.aprobar` o equivalente).
- [ ] El toggle persiste sin recargar.
- [ ] Verificar en la ventana incognito que el usuario ahora ve el modulo correspondiente.

**Resultado esperado:** capability activada queda guardada y la UI del usuario se actualiza al recargar.

---

## 7. Aprobar nomina

- [ ] El DP (o usuario equivalente) crea/envia una nomina para aprobacion del DG.
- [ ] Como DG, ir al modulo de **Nominas** o `/aprobaciones`.
- [ ] Abrir la nomina pendiente, revisar montos y aprobar.
- [ ] Recibir **push notification** (verificar en device/navegador con notificaciones habilitadas).
- [ ] El estatus de la nomina pasa a "Aprobada".

**Resultado esperado:** nomina aprobada, push recibido, audit log registra el evento.

---

## 8. Aprobar OC (Orden de Compra)

- [ ] Generar/recibir una OC pendiente de aprobacion del DG.
- [ ] Como DG, abrirla, revisar proveedor, monto y conceptos.
- [ ] Aprobar la OC.
- [ ] El estatus pasa a "Aprobada" y se notifica al solicitante.

**Resultado esperado:** OC aprobada, sin errores, registrada en audit log.

---

## 9. Dashboard del Director

- [ ] Ir a `/director`.
- [ ] Verificar KPIs principales: nomina aprobada del periodo, OCs aprobadas, gasto por proyecto, % indirectos.
- [ ] Los numeros reflejan las operaciones de los pasos 7 y 8.
- [ ] Los graficos cargan sin errores.

**Resultado esperado:** dashboard refleja la actividad reciente en tiempo real o con refresh manual.

---

## 10. Aprobaciones / Audit log

- [ ] Ir a `/aprobaciones`.
- [ ] Filtrar por usuario = DG y fecha = hoy.
- [ ] Verificar que aparezcan los eventos: creacion empresa, creacion proyecto, creacion usuario, asignacion rol, toggle capability, aprobacion nomina, aprobacion OC.
- [ ] Cada entrada muestra: usuario, accion, recurso afectado y timestamp.

**Resultado esperado:** todos los pasos 2-8 quedaron registrados con metadata correcta.

---

## 11. Crear corte y firmarlo

- [ ] Ir al modulo de **Cortes**.
- [ ] Click en "Nuevo corte", seleccionar periodo y proyecto.
- [ ] El corte agrupa la nomina y OCs aprobadas del paso 7-8.
- [ ] Firmar el corte como DG (flujo de firma digital / confirmacion).
- [ ] El estatus pasa a "Firmado".

**Resultado esperado:** corte creado, firmado y bloqueado para edicion.

---

## 12. Distribuir pagos de nomina aprobada

- [ ] Desde el corte firmado (o modulo de pagos), iniciar **distribucion de pagos** de la nomina aprobada en paso 7.
- [ ] Confirmar metodo de pago (transferencia, efectivo, etc.) y ejecutar.
- [ ] Los registros de pago aparecen como "Distribuidos".
- [ ] Audit log registra la distribucion.

**Resultado esperado:** pagos marcados como distribuidos, recibos generados, sin errores de validacion.

---

## Cierre

- [ ] Cerrar sesion del DG sin errores.
- [ ] Revisar consola del navegador: sin errores criticos (rojos) durante todo el flujo.
- [ ] Anotar cualquier paso que requirio recargar manualmente o presento lag > 3 s.

**Reporte final:** entregar este checklist firmado al equipo de QA con observaciones por paso.
