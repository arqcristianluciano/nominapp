# Bitácora de cambios

Diario en lenguaje sencillo de lo que se va haciendo en la app.

## 2026-06-09 — El costo de los materiales despachados ahora sí llega al presupuesto

**Qué reportó Cristian (por WhatsApp):** Pidió madera para la partida de
Campamento, le dio entrada al almacén y luego salida hacia la obra, pero el
gasto no aparecía en el presupuesto: la partida seguía en RD$0 y la fila de
Campamento mostraba un guion.

**Qué causaba el problema:** Al registrar una salida de almacén, la app
guardaba la cantidad pero NO el costo del material. Como el gasto se calcula
"cantidad × costo", el resultado siempre era cero.

**Qué cambió para Cristian:**

1. **Toda salida de almacén ahora se valora sola** al costo promedio de
   compra del material (el mismo que alimentan las órdenes de compra). No hay
   que escribir el costo a mano: la app lo toma del historial de compras.
2. **Ese costo ya suma al GASTADO del presupuesto**, tanto en la fila del
   capítulo (ej. Preliminares) como en la fila de la subpartida exacta
   (ej. Campamento), que antes solo mostraba un guion.
3. **La lista de movimientos del inventario ahora muestra el costo en RD$**
   de cada entrada y salida, no solo la cantidad.
4. **El formulario de salida avisa** a qué costo se valorará el despacho
   antes de guardar.
5. **Las salidas viejas que quedaron en cero se reparan** con el costo
   promedio actual del material (incluida la salida de la madera 2x4x16).
6. Detalle técnico importante: cuando se devuelve mercancía al suplidor
   (deshacer una recepción), esa salida NO cuenta como gasto de obra; solo
   cuentan los despachos reales a la obra.

**Respuesta a la pregunta de Cristian sobre la factura a crédito:** El gasto
de la partida se registra cuando el material SALE del almacén hacia la obra
(es cuando se consume), no cuando se paga la factura. La factura a crédito es
otra historia: es una deuda con el suplidor y se controla en Cuentas por
Pagar; pagarla mueve el dinero del banco, pero no cambia el gasto de la
partida. Importante: no registres esa misma factura como gasto manual en
Control Financiero imputada a la misma partida, porque se contaría dos veces.

**Cómo quedó:** 646 pruebas automáticas en verde (6 nuevas protegen este
comportamiento) y la app construye sin errores. Punto de restauración:
`restore/2026-06-09-costo-salidas-almacen`.

**Pendiente:** Aplicar el ajuste a la base de datos en línea (la que usa la
app publicada) para que las salidas ya registradas tomen su costo.

## 2026-06-08 — Arreglo: deshacer recepción de órdenes de compra (Sentry #99)

**Qué se hizo:** Se corrigió un error que tumbaba la app al deshacer la
recepción de una orden de compra. El error decía "Stock insuficiente:
disponible 0, solicitado 100".

**Qué causaba el problema:** Al deshacer una recepción, la app saca del
almacén la misma cantidad que había entrado. Si ese material ya se había
gastado en la obra, no quedaba nada que sacar, y una regla de seguridad
(que evita que el almacén quede en negativo) bloqueaba la operación.

**Qué cambió para Cristian:** Ahora deshacer una recepción funciona aunque
el material ya se haya usado; se trata como una corrección y queda
registrado quién y por qué lo hizo. Se agregó una prueba automática para
que ese error no vuelva sin avisar.

**Cómo quedó:** Revisión de código, tipos, 585 pruebas y compilación: todo
en verde. Cambios guardados y subidos a la rama `claude/sentry-fix-99`.
Punto de restauración creado: `restore/2026-06-08-sentry-fix-99`.

**Pendiente:** GitHub no permitió abrir el Pull Request de forma automática
(protección que bloquea a los robots). Falta abrirlo con un clic desde:
https://github.com/arqcristianluciano/nominapp/pull/new/claude/sentry-fix-99

## 2026-06-08 — Reglas de trabajo y sistema de auto-corrección de errores

**Qué se hizo (en palabras simples):**

1. **Reglas de trabajo unificadas.** Este proyecto ahora tiene un archivo
   `CLAUDE.md` con 11 reglas para que Claude siempre hable en español
   simple, pregunte con opciones (y recomiende una), cree puntos de
   restauración antes de cambios grandes, pruebe antes de decir "listo",
   respalde a GitHub al final, y mantenga esta bitácora. Las mismas reglas
   están en los 3 proyectos (HousePro, Nominapp, Appgenda) y en la
   configuración general de la computadora.

2. **Sistema que arregla errores solo.** Se conectó Sentry (el vigilante
   que detecta errores) con GitHub y con Claude. Ahora el circuito completo
   es: la app falla → Sentry lo detecta → cada hora un "vigilante" revisa y
   crea un aviso → Claude investiga y prepara el arreglo → se prueba solo →
   si todo pasa, se publica solo; si algo falla, queda esperando revisión.

3. **Llaves y permisos.** Se guardaron en GitHub la llave de Claude
   (`ANTHROPIC_API_KEY`) y la del vigilante (`SENTRY_WATCH_TOKEN`), y se
   activó el permiso para que el sistema pueda publicar sus propias
   propuestas de cambio.

**Qué cambió para Cristian:** Los errores de la app ahora se detectan y, en
muchos casos, se corrigen solos sin que tengas que intervenir. Cada arreglo
queda anotado y se puede revisar. Cada corrección automática consume un poco
de crédito de la cuenta de Claude (centavos por arreglo).

**Pendiente / notas:** Mover los proyectos fuera de OneDrive (causa
tropiezos con el historial). Las apps siguen en línea con normalidad.

## 2026-06-09 — Limpieza de datos de prueba y tanda de mejoras

**Qué se hizo (en palabras simples):**

1. **Se borraron los 5 datos de prueba** que quedaron de las pruebas
   (proyecto "PRUEBA QA CLAUDE", suplidor, contratista, una orden de compra
   y un contrato de cubicación). La base quedó limpia, verificado en cero.

2. **Arreglo del registro de auditoría.** Al borrar el proyecto se descubrió
   que las operaciones "del sistema" (sin un usuario en sesión) fallaban por
   una regla muy estricta. Se ajustó para que esas operaciones ya no se
   traben. No afecta el uso normal.

3. **Costo promedio de materiales más justo.** Antes una compra de 1 unidad
   pesaba igual que una de 1000 al sacar el costo promedio. Ahora el promedio
   se pondera por cantidad, así que el número refleja mejor lo que realmente
   costó el material.

4. **Reporte al cliente más honesto.** Un hito (meta del proyecto) se marcaba
   "Completado" solo porque pasó su fecha, aunque tuviera 0% de avance. Ahora
   solo se marca "Completado" al llegar al 100%; si pasó la fecha sin
   terminar, se muestra "Atrasado" en rojo.

5. **Respaldo en Excel completo.** El respaldo se cortaba a 1000 filas sin
   avisar (peligroso para un respaldo). Ahora trae todos los datos por
   páginas, sin importar cuántos sean.

6. **Fechas de alertas sin correrse un día.** Algunas alertas podían mostrar
   las fechas/días corridos por la zona horaria. Se corrigió para que el
   conteo de días sea por calendario local.

**Qué cambió para Cristian:** números de materiales más reales, reporte al
cliente sin "completados" falsos, respaldos completos y alertas con fechas
correctas. Todo probado (tipos, pruebas y construcción en verde) y publicado.

**Pendiente (para hacer contigo en vivo o con tu decisión):** validaciones de
formularios que aún aceptan datos raros, avisos cuando un guardado falla,
reporte mensual en PDF incompleto, y candados de servidor para uso simultáneo
(numeración, recibir/pagar, inventario). Ayudas de demo (código 1234, accesos
rápidos del login) se quitan al salir de pruebas.

## 2026-06-09 (parte 2) — "Hazlo todo": cierre de pendientes

Antes de empezar dejé un punto de restauración para poder volver atrás si algo
salía mal.

1. **Avisos cuando algo falla (U2).** Revisé todos los guardados: ya avisan al
   usuario si fallan. Solo las listas desplegables fallan calladas (correcto).

2. **Validaciones de formularios (U1).** Los formularios de dinero ya validaban
   al guardar; reforcé los mínimos que faltaban (monto de distribución y
   cantidad de avances) para que no acepten negativos.

3. **Reporte mensual en PDF (N5) — el más grande.** Antes el PDF solo traía
   portada y anexo. Ahora incluye el resumen ejecutivo, el desglose por
   capítulos, el flujo de caja y la nómina, y todos los montos salen en RD$.

4. **Candados para uso simultáneo (varias personas a la vez):**
   - Números de tarea del cronograma ya no se pueden repetir (los de órdenes,
     requisiciones y cortes ya estaban protegidos).
   - Pagar una cuota de préstamo es a prueba de doble clic: un segundo clic ya
     no registra el cobro dos veces.
   - La base de datos ahora impide recibir más mercancía de la que se pidió,
     aunque dos personas reciban al mismo tiempo.
   - El inventario y los pagos ya eran "todo o nada" (lo confirmé).

**Qué cambió para Cristian:** el reporte mensual ahora sí sale completo, y la
app es más segura cuando varias personas la usan a la vez. Todo probado (tipos,
pruebas y construcción en verde) y publicado.

**Único punto que dejé para hacer contigo en vivo:** reglas de "estados" más
profundas en el servidor (qué transición de estado se permite y cuál no). No
las apliqué a ciegas porque podrían bloquear acciones normales del día a día;
conviene probarlas contigo. Lo esencial (no recibir de más, no pagar dos veces,
no repetir números) ya quedó puesto.
