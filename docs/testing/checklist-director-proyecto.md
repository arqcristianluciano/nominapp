# Checklist QA - Rol: Director de Proyecto (DP)

Esta lista valida que el usuario con rol **Director de Proyecto** pueda operar correctamente sobre SU proyecto asignado, sin acceder a recursos de otros proyectos ni a vistas administrativas.

**Usuario de prueba:** `dp.test@nominapp.local`
**Proyecto asignado:** Proyecto A (sin acceso a Proyecto B)

---

## 1. Login y visualizacion del proyecto asignado

- [ ] Acceder a `/login` e iniciar sesion con credenciales del DP.
  - **Esperado:** Redireccion exitosa al dashboard del proyecto.
- [ ] Verificar que en el selector/listado de proyectos solo aparece SU proyecto.
  - **Esperado:** No se muestran otros proyectos en la UI ni en la respuesta del API.
- [ ] Comprobar que el header muestra nombre del usuario y rol "Director de Proyecto".
  - **Esperado:** Badge/etiqueta visible con el rol correcto.

## 2. Crear nomina draft + partidas + facturas de materiales

- [ ] Navegar a `/proyecto/[id]/nominas` y pulsar "Nueva nomina".
  - **Esperado:** Se crea nomina en estado `draft` asociada al proyecto del DP.
- [ ] Agregar al menos 2 partidas (mano de obra) con cantidades y precios unitarios.
  - **Esperado:** Subtotal calculado automaticamente; cada partida queda persistida.
- [ ] Adjuntar 1 o mas facturas de materiales (PDF/XML) a la nomina.
  - **Esperado:** Archivos suben a storage, quedan vinculados y visibles en la nomina.
- [ ] Guardar como borrador y recargar la pagina.
  - **Esperado:** Toda la informacion se conserva; estado sigue siendo `draft`.

## 3. Editar indirectos del proyecto

- [ ] Acceder a la pestania/seccion "Indirectos" del proyecto.
  - **Esperado:** Formulario editable con valores actuales (% admin, % imprevistos, etc.).
- [ ] Modificar al menos un porcentaje y guardar.
  - **Esperado:** Cambios persisten; recalculo de totales se refleja en nominas afectadas.
- [ ] Verificar bitacora/auditoria del cambio (si aplica).
  - **Esperado:** Registro con usuario, fecha y valores anteriores/nuevos.

## 4. Enviar nomina a aprobacion + aprobarla

- [ ] Desde la nomina en `draft`, pulsar "Enviar a aprobacion".
  - **Esperado:** Estado cambia a `pendiente_aprobacion`; ya no editable.
- [ ] Como DP con permiso de aprobacion, pulsar "Aprobar".
  - **Esperado:** Estado cambia a `aprobada`; se habilitan acciones de pago.
- [ ] Verificar notificacion/registro al aprobar.
  - **Esperado:** Se genera evento de auditoria con timestamp y usuario aprobador.

## 5. Distribuir pagos

- [ ] Abrir la nomina aprobada y acceder a "Distribucion de pagos".
  - **Esperado:** Listado de beneficiarios con monto sugerido por partida.
- [ ] Asignar montos/medios de pago (transferencia, efectivo) y confirmar.
  - **Esperado:** Suma total coincide con la nomina; no permite excederla.
- [ ] Guardar la distribucion.
  - **Esperado:** Estado de pagos pasa a `distribuido`; quedan registros individuales por beneficiario.

## 6. Aprobar Orden de Compra (OC) liberada

- [ ] Ir a `/proyecto/[id]/ordenes-compra` y filtrar por estado `liberada`.
  - **Esperado:** Solo se listan OCs del proyecto del DP.
- [ ] Abrir una OC liberada y revisar conceptos, proveedor y monto.
  - **Esperado:** Datos completos; boton "Aprobar" visible.
- [ ] Pulsar "Aprobar OC".
  - **Esperado:** Estado cambia a `aprobada`; queda lista para recepcion/pago.

## 7. Crear contrato de ajuste + partidas + corte

- [ ] Ir a `/proyecto/[id]/contratos` y pulsar "Nuevo contrato de ajuste".
  - **Esperado:** Formulario solicita contratista, alcance y vigencia.
- [ ] Guardar el contrato y agregar al menos 2 partidas (concepto, unidad, P.U., cantidad).
  - **Esperado:** Partidas persisten; monto total del contrato se actualiza.
- [ ] Desde el contrato, crear un nuevo "Corte" con avances por partida.
  - **Esperado:** Corte queda en estado `borrador` con calculo de monto a pagar.

## 8. Aprobar corte

- [ ] Abrir el corte en estado `borrador` y enviarlo a aprobacion.
  - **Esperado:** Estado cambia a `pendiente_aprobacion`.
- [ ] Aprobar el corte como DP.
  - **Esperado:** Estado cambia a `aprobado`; se genera registro contable/pago vinculado.
- [ ] Verificar que el avance acumulado del contrato refleja el corte.
  - **Esperado:** % avance y monto acumulado actualizados correctamente.

## 9. Restriccion de acceso a rutas administrativas

- [ ] Intentar acceder manualmente a `/director` via URL.
  - **Esperado:** Respuesta 403/redireccion; UI muestra "Acceso denegado".
- [ ] Intentar acceder manualmente a `/admin/usuarios` via URL.
  - **Esperado:** Respuesta 403/redireccion; no se renderiza la tabla de usuarios.
- [ ] Verificar que el menu lateral NO muestra enlaces a `/director` ni `/admin/*`.
  - **Esperado:** Items ocultos para el rol DP.

## 10. Aislamiento de datos entre proyectos

- [ ] Intentar acceder por URL a `/proyecto/[id-de-otro-proyecto]/nominas`.
  - **Esperado:** Respuesta 403 o redireccion al proyecto propio; sin filtracion de datos.
- [ ] Llamar al API `GET /api/proyectos/[id-otro]/nominas` con el token del DP.
  - **Esperado:** Respuesta 403/404; no devuelve registros.
- [ ] Revisar listados globales (nominas, OCs, contratos) en la UI.
  - **Esperado:** Todos los resultados pertenecen unicamente al proyecto asignado.
- [ ] Verificar en logs/Supabase RLS que las policies bloquean lecturas cruzadas.
  - **Esperado:** No se registran queries devolviendo filas de otros proyectos.

---

**Criterio de aceptacion:** Todos los items marcados con exito. Cualquier fallo en seccion 9 o 10 es bloqueante.
