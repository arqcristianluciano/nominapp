# Checklist de Pruebas - Rol Comprador

Checklist manual para validar el flujo operativo del Comprador en NominApp.
Cubre gestion de catalogos, cotizaciones, validacion presupuestaria y contratos.

## 1. Login

- [ ] Acceder a la URL principal de NominApp desde navegador desktop.
- [ ] Ingresar credenciales validas de un usuario con rol `comprador`.
- [ ] Validar redireccion al dashboard del comprador.
- [ ] Confirmar que el menu lateral muestra: Contratistas, Suplidores, Materiales, Requisiciones, Contratos.
- [ ] Verificar que opciones de otros roles (RH, Almacen) no estan visibles.
- [ ] Probar el cierre de sesion y reingreso.

## 2. CRUD Contratistas

- [ ] Acceder al modulo "Contratistas" y validar el listado.
- [ ] Crear un nuevo contratista con RNC, nombre, contacto y especialidad.
- [ ] Validar que el sistema rechaza RNC duplicado.
- [ ] Editar el contratista creado y confirmar persistencia de cambios.
- [ ] Cambiar estado a inactivo y verificar filtro de activos/inactivos.
- [ ] Eliminar el contratista (o archivar) y verificar confirmacion.
- [ ] Confirmar que no se puede eliminar si tiene contratos vigentes.

## 3. CRUD Suplidores

- [ ] Acceder al modulo "Suplidores" y validar el listado.
- [ ] Crear un nuevo suplidor con RNC, contacto, condiciones de pago y categorias.
- [ ] Validar campos obligatorios y formato de RNC/email.
- [ ] Editar suplidor y modificar condiciones de pago (dias de credito).
- [ ] Asociar uno o varios materiales del catalogo al suplidor.
- [ ] Verificar que el suplidor aparezca disponible al cargar cotizaciones.
- [ ] Archivar suplidor y validar exclusion del selector de cotizaciones.

## 4. CRUD Materiales del Catalogo

- [ ] Acceder al modulo "Materiales" / Catalogo maestro.
- [ ] Crear un material nuevo con codigo, nombre, unidad de medida y categoria.
- [ ] Validar unicidad del codigo de material.
- [ ] Configurar stock minimo y precio referencial.
- [ ] Editar material y modificar la categoria/unidad.
- [ ] Verificar que el cambio se refleja en requisiciones nuevas pero no en historicas.
- [ ] Archivar/desactivar material y confirmar exclusion del selector activo.

## 5. Cargar Cotizaciones a una Requisicion

- [ ] Acceder a una requisicion aprobada y en estado "Solicitar cotizaciones".
- [ ] Tap en "Agregar cotizacion" y seleccionar suplidor del listado.
- [ ] Ingresar precio unitario por material, ITBIS, descuentos y tiempo de entrega.
- [ ] Validar que se permite cargar minimo 3 cotizaciones (regla de negocio).
- [ ] Adjuntar PDF de la cotizacion original del suplidor.
- [ ] Marcar una cotizacion como "Ganadora" y verificar justificacion obligatoria.
- [ ] Confirmar que el sistema calcula el total automaticamente.
- [ ] Validar que la requisicion avanza a estado "Pendiente de OC".

## 6. Validar Excedente de Presupuesto

- [ ] Crear o seleccionar una requisicion cuya cotizacion exceda el presupuesto asignado.
- [ ] Verificar que el sistema muestra alerta visual (banner rojo o badge).
- [ ] Confirmar que el monto excedente se calcula y muestra correctamente.
- [ ] Validar que la requisicion no puede convertirse en OC sin aprobacion adicional.
- [ ] Solicitar aprobacion de excedente y verificar notificacion al supervisor.
- [ ] Una vez aprobado el excedente, confirmar que el flujo continua.
- [ ] Verificar registro del excedente en bitacora del proyecto.

## 7. Crear Contrato de Ajuste

- [ ] Acceder al modulo "Contratos" y filtrar por tipo "Ajuste".
- [ ] Tap en "Nuevo contrato de ajuste" y seleccionar contrato base.
- [ ] Validar que carga automaticamente las partidas del contrato original.
- [ ] Agregar nuevas partidas o modificar cantidades/precios existentes.
- [ ] Verificar calculo automatico del monto del ajuste (positivo o negativo).
- [ ] Adjuntar justificacion del ajuste (campo obligatorio).
- [ ] Guardar como borrador y luego enviar a aprobacion.
- [ ] Confirmar que el contrato base refleja el ajuste vinculado.

## 8. Editar Porcentaje de Indirectos

- [ ] Acceder a configuracion de proyecto o contrato.
- [ ] Localizar el campo "Porcentaje de gastos indirectos".
- [ ] Verificar que solo roles con permiso pueden editar este valor.
- [ ] Modificar el porcentaje (ej. de 12% a 15%) y guardar.
- [ ] Validar que el sistema recalcula los totales de partidas afectadas.
- [ ] Confirmar registro del cambio en bitacora con usuario y timestamp.
- [ ] Verificar que cotizaciones nuevas usan el nuevo porcentaje.
- [ ] Validar que cotizaciones cerradas mantienen el porcentaje historico.
