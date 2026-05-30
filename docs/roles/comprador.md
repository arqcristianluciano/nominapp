# Manual del Comprador

Rol: `comprador`

El Comprador es el responsable de gestionar el ciclo de compras de la obra: desde recibir las requisiciones del ingeniero, cotizar con suplidores, liberar ordenes de compra (OC), hasta administrar el catalogo de materiales y los contratos con contratistas.

## Que puede hacer

Capabilities asignadas al rol:

- `load_quotes` — Cargar cotizaciones contra requisiciones existentes.
- `release_purchase_order` — Liberar (emitir) una OC al suplidor seleccionado.
- `write_suppliers` — Crear / editar suplidores en el directorio.
- `write_contractors` — Crear / editar contratistas en el directorio.
- `write_materials_catalog` — Mantener el catalogo maestro de materiales.
- `view_price_history` — Consultar el historial de precios pagados por material.

No puede:

- Crear requisiciones (las crea el Ingeniero de Obra).
- Aprobar excesos sobre presupuesto (Director de Proyecto).
- Recibir mercancia en almacen (Almacenista).
- Firmar contratos (Director de Proyecto / Director General).

## Flujo tipico — Ciclo de compra

1. **Bandeja de requisiciones.** El comprador entra a `Compras > Requisiciones` y ve las requisiciones en estado `aprobada` pendientes de cotizar.
2. **Cargar cotizaciones.** Por cada partida abre la requisicion y registra cotizaciones de 2-3 suplidores (`load_quotes`). Adjunta PDF de la cotizacion.
3. **Seleccionar ganadora.** Marca la cotizacion ganadora — el sistema valida que el total no exceda el presupuesto de la partida; si excede, queda en espera de aprobacion del Director de Proyecto.
4. **Liberar OC.** Una vez aprobado el exceso (si aplica), el comprador presiona "Liberar OC" (`release_purchase_order`). El sistema genera el numero de OC, congela los precios y envia notificacion al suplidor y al almacenista.
5. **Seguimiento.** En `Compras > Ordenes de Compra` ve el estado: `emitida > en_transito > recibida_parcial > recibida_total > facturada`.

## Catalogo de Materiales (`/materiales`)

El catalogo es la fuente unica de SKUs. El comprador puede:

- Crear un nuevo material indicando: codigo interno, descripcion, unidad de medida, familia (cemento, acero, electrico, etc.), marca, especificacion.
- Editar materiales existentes — los cambios solo aplican a OCs futuras; las OCs ya emitidas conservan el snapshot.
- Marcar materiales como `inactivo` cuando se descontinuan (no se pueden borrar si tienen movimientos).

Ejemplo concreto: dar de alta `CEM-PORT-42.5` "Cemento Portland Tipo I 42.5 kg" con unidad `saco` y familia `cementos`.

## Contratistas y Suplidores

**Suplidores** (proveedores de materiales): `Compras > Suplidores`. Datos minimos: RNC, razon social, telefono, contacto, condiciones de pago (contado / credito 30-60-90), CxP asociada. El comprador edita este directorio (`write_suppliers`).

**Contratistas** (mano de obra subcontratada): `Contratistas`. Datos: RNC/cedula, especialidad (plomeria, electricidad, etc.), tarifa, cuentas bancarias. El comprador puede dar de alta a un contratista nuevo (`write_contractors`) para que luego el Director de Proyecto le asigne un contrato.

## Contratos con contratistas

El comprador participa en la fase administrativa del contrato:

1. **Recibir solicitud.** El ingeniero de obra solicita subcontratar una partida.
2. **Crear ficha del contratista** si no existe en el directorio.
3. **Cotizar partidas.** Carga las cotizaciones del contratista en la cubicacion (similar a una OC pero contra partidas de obra).
4. **Pasar a firma.** El Director de Proyecto firma el contrato (`sign_contract` — el comprador NO firma).
5. **Seguimiento de cortes.** Cuando el contratista entrega un avance, el comprador puede consultar el corte; quien lo aprueba es el Ingeniero o Director.

## Ejemplos concretos

**Ejemplo 1 — OC de cemento:**

- Requisicion `REQ-2026-0142`: 200 sacos de cemento para vaciado de losa nivel 3.
- Cotizaciones: Cemex DOP $245/saco, Domicem DOP $238/saco, Argos DOP $251/saco.
- Selecciona Domicem (total DOP $47,600). Esta dentro de presupuesto → libera `OC-2026-0089`.
- Notifica al almacenista que debe recibir 200 sacos antes del viernes.

**Ejemplo 2 — Material nuevo en catalogo:**

- El ingeniero pide "varilla #4 grado 60". No existe en catalogo.
- El comprador la da de alta como `ACE-VAR-04-60`, unidad `quintal`, familia `aceros`.
- Ahora puede cotizarse y agregarse a requisiciones.

**Ejemplo 3 — Suplidor nuevo:**

- Llega oferta de un suplidor nuevo de bloques 20% mas barato.
- El comprador crea la ficha del suplidor con RNC, contacto y terminos (credito 30 dias).
- Lo agrega como tercer cotizador en la proxima requisicion de bloques.

## Reportes utiles

- **Historial de Precios** (`/historial-precios`): ver evolucion de precio pagado por material y por suplidor — util para negociar.
- **OCs abiertas**: cuanto dinero hay comprometido pendiente de recibir.
- **CxP por suplidor**: cuanto se le debe a cada suplidor.

## Buenas practicas

- Siempre 3 cotizaciones por requisicion > DOP $20,000 (politica interna).
- Adjuntar PDF de la cotizacion al cargarla — sirve como respaldo de auditoria.
- No editar el catalogo durante el cierre de mes — esperar al dia 1.
- Avisar al almacenista por WhatsApp cuando se libera una OC urgente (ademas del email automatico).
