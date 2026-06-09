# Bitácora de cambios

Diario en lenguaje sencillo de lo que se va haciendo en la app.

## 2026-06-09 (parte 4) — Ver el gasto por subpartida y el costo de cada movimiento

**Contexto:** Dos sesiones de trabajo atendieron en paralelo el mismo reporte
de Cristian (el de la madera de Campamento, ver "parte 3" más abajo). Ambos
trabajos se unieron en uno solo, sin duplicados, y se verificó que la base de
datos en línea quedó correcta: la salida de la madera vale RD$15,900
(100 × RD$159) imputada a Campamento y no queda ninguna salida sin costo.

**Qué agrega esta parte (encima de la parte 3):**

1. **La fila de cada subpartida del presupuesto ahora muestra su gastado y su
   diferencia** (ej. Campamento: gastado RD$15,900 de RD$1,000,000). Antes
   esa casilla siempre mostraba un guion y solo se veía el total del capítulo.
2. **La lista de movimientos del inventario muestra el costo en RD$** de cada
   entrada y salida, no solo la cantidad.
3. Pruebas automáticas nuevas que protegen todo este comportamiento
   (valoración de salidas, exclusión de devoluciones al suplidor, desglose
   por subpartida).

**Cómo quedó:** 647 pruebas automáticas en verde, la app construye sin
errores y los cambios se publicaron en la app oficial con el visto bueno de
Cristian. Punto de restauración: `restore/2026-06-09-costo-salidas-almacen`.

## 2026-06-09 (parte 3) — El gasto de almacén ahora sí llega al presupuesto

**Qué reportó Cristian (con capturas):** pidió madera para "Campamento",
le dio entrada y salida de almacén, pero el presupuesto seguía en RD$0
gastado. Preguntó si el gasto debía salir ahí o al pagar la factura
(la compró a crédito).

**Qué pasaba:** las salidas de almacén se guardaban sin costo (el
formulario solo pide costo en las entradas), y el gasto se calcula
"cantidad × costo", así que siempre daba cero. Pasaba con TODAS las
salidas de la app (las 3 que existían).

**Qué se arregló:**

1. Toda salida de almacén toma ahora automáticamente el costo promedio
   del material (el costo real al que se compró).
2. Se corrigieron las 3 salidas históricas: Campamento ahora marca
   RD$15,900 (100 maderas × RD$159) y Estructura RD$665,000 (varillas).
3. Las "reversas de recepción" (cuando se deshace una entrega) ya no
   se cuentan como gasto de obra: son correcciones, no consumo.
4. El formulario de salida ahora muestra cuánto se cargará al
   presupuesto antes de guardar, para que no haya sorpresas.

**Respuesta a la pregunta de Cristian:** el gasto aparece en la partida
cuando el material SALE del almacén (se consume en la obra), no cuando
se paga la factura. El crédito con el suplidor es un tema de deuda
(cuentas por pagar), separado del consumo del presupuesto. OJO: al
registrar el pago de esa factura en el control financiero, NO hay que
imputarlo otra vez a la misma partida, porque se contaría doble.

**Para revisar con Cristian:** las varillas de 3/8" están registradas a
RD$70,000 cada una (precio que se digitó al darles entrada). Si ese
precio no es correcto, se corrige y el presupuesto se ajusta solo.

**Cómo quedó:** tipos, 640 pruebas, estilo y compilación en verde. La
regla nueva se ensayó en la base real con un ensayo que se deshace solo
(rellenó RD$159 correctamente y no dejó rastro).

## 2026-06-09 — Seguridad, respaldo automático y velocidad

**Qué se hizo:** Una revisión completa de seguridad, un respaldo automático
y una mejora de velocidad.

**Seguridad:** Dos tablas nuevas (los "movimientos de cuenta" del banco y
las "cuotas de préstamo") habían quedado con acceso abierto: cualquier
usuario conectado podía verlas o cambiarlas. Ahora respetan los permisos
por rol igual que el resto de la app (solo entra quien debe). Las tablas
estaban vacías, así que no se perdió nada.

**Respaldo automático:** Se programó un "robot" gratis en GitHub que cada
día guarda una copia completa de toda la base de datos. Si algo sale mal,
se puede volver a la información de un día anterior. (Falta un paso de una
sola vez: pegar la contraseña de la base como "secreto" en GitHub; sin eso
el robot no puede entrar.)

**Velocidad:** Se agregaron cuatro "índices" en la base de datos (atajos de
búsqueda) para que ciertas consultas sean más rápidas a medida que crezcan
los datos. Las pantallas ya venían cargando por partes, así que ahí no hizo
falta tocar nada.

**Cómo quedó:** Tipos, 640 pruebas y compilación: todo en verde. Reglas de
base de datos aplicadas y verificadas en la base real. Punto de
restauración creado: `restore/2026-06-09-antes-seguridad-respaldo-velocidad`.

**Pendiente:** (1) Activar el robot de respaldo pegando el secreto
`SUPABASE_DB_URL` en GitHub → Settings → Secrets and variables → Actions.
(2) Opcional: activar en Supabase la "protección contra contraseñas
filtradas" (un interruptor en el panel de Autenticación).

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
