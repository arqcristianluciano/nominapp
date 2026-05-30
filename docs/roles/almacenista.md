# Manual del Almacenista

Rol: `almacenista`

El Almacenista controla el inventario fisico de la obra: recibe los materiales que llegan contra OC, despacha materiales al frente de trabajo, y mantiene la kardex actualizada. Es el unico rol (junto con Director) con capacidad para ajustar stock manualmente.

## Que puede hacer

Capabilities asignadas al rol:

- `receive_order` — Recibir mercancia contra una OC emitida.
- `inventory_write` — Registrar entradas y salidas de almacen.
- `override_stock` — Ajustar stock manualmente (mermas, conteos fisicos, correcciones).

No puede:

- Liberar OCs (Comprador).
- Editar el catalogo de materiales (Comprador).
- Aprobar requisiciones (Ingeniero / Director de Proyecto).

## Flujo tipico — Recepcion de OC

1. **Bandeja de OCs por recibir.** En `Inventario > Por recibir` ve las OCs en estado `emitida` o `en_transito` asignadas a su obra.
2. **Verificar fisicamente.** Cuando llega el camion, el almacenista cuenta y verifica las cantidades contra la OC.
3. **Registrar recepcion** (`receive_order`):
   - Abre la OC y presiona "Recibir".
   - Por cada partida indica cantidad recibida (puede ser parcial).
   - Indica numero de factura/conduce del suplidor.
   - Si hay diferencias (menos de lo pedido, dano, mala calidad) lo nota en observaciones.
4. **Estado.** Si recibio todo, la OC pasa a `recibida_total`. Si recibio parcial, queda en `recibida_parcial` esperando el resto.
5. **Stock automatico.** El sistema suma al inventario las cantidades recibidas y notifica al Comprador y a Contabilidad.

## Flujo tipico — Salida de materiales

1. **Solicitud del frente.** El maestro/encargado pide materiales (verbal, vale fisico, o WhatsApp).
2. **Registrar salida** en `Inventario > Salida` (`inventory_write`):
   - Selecciona el material y la cantidad.
   - Indica destino: partida de obra o frente (ej: "estructura nivel 2").
   - Opcional: nombre de quien recibe.
3. El sistema descuenta del stock al instante.
4. Si la cantidad a sacar excede el stock disponible, el sistema bloquea — debe ajustarse primero (ver override).

## Override de stock

Para casos especiales el almacenista usa `override_stock` desde `Inventario > Ajuste`:

- **Conteo fisico:** despues del inventario fisico mensual, ajusta cada SKU a la cantidad real.
- **Mermas:** registra mermas por dano (sacos rotos, varilla oxidada).
- **Correccion de error:** si registro mal una entrada/salida.

Cada ajuste requiere motivo y queda en bitacora con usuario + timestamp. Director de Proyecto recibe alerta de ajustes > 5% del stock.

## Ejemplos concretos

**Ejemplo 1 — Recepcion completa:**

- Llega OC `OC-2026-0089` con 200 sacos de cemento Domicem.
- Almacenista cuenta: 200 sacos OK, sin danos.
- Registra recepcion total, conduce `CD-44521`. Stock de cemento sube de 15 a 215 sacos.
- OC pasa a `recibida_total`, Contabilidad recibe aviso para registrar la factura.

**Ejemplo 2 — Recepcion parcial con merma:**

- OC de 1000 bloques, llegan 950 (50 rotos en transporte).
- Almacenista recibe 950, anota en observaciones "50 bloques rotos, devueltos al suplidor".
- OC queda `recibida_parcial`. Comprador decide si reclama al suplidor o ajusta la OC.

**Ejemplo 3 — Salida al frente:**

- El maestro de estructura pide 30 sacos de cemento y 5 quintales de varilla #4 para vaciado.
- Almacenista registra salida: 30 sacos cemento + 5 qq varilla, destino "Losa nivel 3".
- Stock cemento baja de 215 a 185, varilla de 80 a 75.

**Ejemplo 4 — Ajuste por conteo fisico:**

- Conteo fisico de fin de mes: cemento tiene 182 sacos, el sistema dice 185.
- Almacenista hace ajuste `-3` con motivo "Conteo fisico noviembre — diferencia no identificada".
- Director recibe notificacion si la merma supera 5%.

## Buenas practicas

- Recibir siempre con la OC impresa en mano — no recibir "de palabra".
- Anotar inmediatamente conduce y placa del camion.
- Hacer conteo fisico semanal de materiales criticos (cemento, varilla, bloques).
- Nunca dejar salir material sin registrar — la kardex debe coincidir con el fisico.
- Pedir foto del vale firmado para salidas grandes (> DOP $10,000).
