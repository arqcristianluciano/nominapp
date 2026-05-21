# Checklist de Pruebas - Rol Almacenista

Checklist manual para validar el flujo operativo del Almacenista en NominApp.
La interfaz principal del Almacenista esta optimizada para uso en dispositivos moviles.

## 1. Login Mobile

- [ ] Abrir la app desde un navegador mobile (o emulador con viewport 375x812).
- [ ] Verificar que el formulario de login se renderiza sin scroll horizontal.
- [ ] Ingresar credenciales validas de un usuario con rol `almacenista`.
- [ ] Confirmar que el boton "Iniciar sesion" responde al primer tap.
- [ ] Validar redireccion al dashboard mobile del almacenista.
- [ ] Verificar que el menu inferior (bottom nav) muestra opciones: OCs, Entradas, Salidas, Inventario.
- [ ] Cerrar sesion y volver a entrar para confirmar persistencia del rol.

## 2. Recibir Orden de Compra (marcar entregada)

- [ ] Navegar al listado de Ordenes de Compra pendientes de recepcion.
- [ ] Confirmar que solo aparecen OCs con estado `aprobada` o `en_transito`.
- [ ] Abrir una OC y verificar el detalle: suplidor, materiales, cantidades.
- [ ] Marcar la OC como "Entregada" desde el boton principal.
- [ ] Validar que el sistema solicita confirmacion antes de actualizar.
- [ ] Confirmar que el estado cambia a `entregada` y desaparece del listado pendiente.
- [ ] Verificar que la fecha de entrega se registra automaticamente.
- [ ] Validar que se genera la entrada de inventario asociada.

## 3. Entrada de Material

- [ ] Acceder al modulo "Entradas" desde el bottom nav.
- [ ] Tap en "Nueva Entrada" y seleccionar OC origen (o entrada manual).
- [ ] Escanear o seleccionar el material desde el catalogo.
- [ ] Ingresar cantidad recibida (validar que acepta decimales si aplica).
- [ ] Confirmar lote, fecha de vencimiento (si el material lo requiere).
- [ ] Adjuntar foto del albaran o nota de entrega (opcional).
- [ ] Guardar la entrada y verificar mensaje de confirmacion.
- [ ] Validar que el stock del material aumenta en el inventario.

## 4. Salida de Material

- [ ] Acceder al modulo "Salidas" desde el bottom nav.
- [ ] Tap en "Nueva Salida" y seleccionar destino: contratista u obra.
- [ ] Buscar el material por nombre, codigo o categoria.
- [ ] Verificar que el sistema muestra el stock disponible en tiempo real.
- [ ] Ingresar cantidad a entregar (debe rechazar si excede stock).
- [ ] Asociar la salida a una requisicion existente si aplica.
- [ ] Confirmar firma o foto de quien recibe (segun configuracion).
- [ ] Guardar y validar que el stock disminuye correctamente.

## 5. Override de Stock con Motivo

- [ ] Desde el detalle de un material, tap en "Ajustar stock".
- [ ] Verificar que la opcion solo aparece para roles con permiso `inventory.override`.
- [ ] Ingresar la cantidad nueva (mayor o menor al stock actual).
- [ ] Seleccionar motivo del listado: merma, robo, conteo fisico, daño, otro.
- [ ] Si el motivo es "otro", validar que el campo de comentario sea obligatorio.
- [ ] Confirmar el ajuste y verificar registro en bitacora de auditoria.
- [ ] Validar que el movimiento queda visible en el historial del material.
- [ ] Confirmar que el stock refleja inmediatamente el nuevo valor.

## 6. Ver Inventario Actual

- [ ] Acceder al modulo "Inventario" desde el bottom nav.
- [ ] Validar que el listado carga sin demoras notables (<2s).
- [ ] Probar el buscador por nombre y por codigo de material.
- [ ] Filtrar por categoria y por estado (en stock, agotado, bajo minimo).
- [ ] Verificar que los materiales en stock minimo aparecen resaltados.
- [ ] Tap en un material para ver su detalle: stock, ubicacion, ultimos movimientos.
- [ ] Validar que el historial muestra entradas, salidas y ajustes.
- [ ] Confirmar que los totales coinciden con la suma de movimientos.
