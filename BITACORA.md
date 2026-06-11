# Bitácora de cambios

Diario en lenguaje sencillo de lo que se va haciendo en la app.

## 2026-06-11 — Cuentas bancarias: errores corregidos y saldo inicial

**Por la mañana** se corrigieron los dos errores que salieron al registrar
la cuenta del fondo de préstamos:

1. **"Permission denied"**: no era un fallo, sino los permisos funcionando —
   solo el administrador y contabilidad pueden crear cuentas. Se decidió
   dejarlo así. Ahora ese mensaje sale en español claro en toda la app.
2. **"project_id violates not-null constraint"**: este sí era un fallo (una
   regla vieja de la base de datos exigía proyecto a toda cuenta). Quedó
   corregido: las cuentas internas de la empresa ya se guardan sin proyecto.

**Por la tarde**, a raíz de una observación de Cristian (si la cuenta nace
en cero, el primer préstamo la deja en negativo), se agregó:

- **Saldo inicial**: al crear una cuenta en Configuración → Cuentas
  bancarias se puede indicar cuánto dinero ya tiene; queda anotado como su
  primera entrada.
- **Movimientos manuales**: en Préstamos → Conciliación de cuentas hay un
  botón "Registrar movimiento" para anotar depósitos o retiros en cualquier
  momento (solo administrador/contabilidad lo ven).
- **Aviso de fondos**: al crear un préstamo, el formulario muestra el saldo
  disponible de la cuenta elegida y, si el préstamo lo supera, avisa en
  amarillo que el saldo quedará negativo — pero deja continuar, por si el
  dinero real ya está en el banco y solo falta anotarlo.

**Qué cambió para Cristian:** puede registrar su cuenta del fondo de
préstamos con el dinero que ya tiene, anotar más depósitos cuando meta
dinero, y la app le avisa si va a prestar más de lo que hay.

**Pendiente:** registrar la cuenta real (Titular PRESTAMOS, BHD León) como
administrador, ahora con su saldo inicial.

## 2026-06-10 — Arreglos del documento de observaciones (PDF del 10/06)

Cristian envió un PDF con 5 observaciones de uso real. Se atendieron todas:

1. **Cronograma: la pantalla baja sola hasta el formulario.** Al pulsar el
   lápiz (editar) o el "+" (añadir subtarea) en cualquier tarea, la página se
   desplaza automáticamente hasta el formulario; ya no hay que subir a mano,
   ni siquiera trabajando en las últimas tareas de la lista.
2. **Cronograma: se acabó el mensaje de error rojo al guardar.** El error de
   "número duplicado" pasaba porque la app calculaba el número de la tarea
   desde el navegador y dos guardados seguidos chocaban. Ahora el número lo
   asigna la propia base de datos en el momento exacto de guardar, de uno en
   uno, así que no puede repetirse. Además el botón Guardar ignora dobles
   clics y la lista se refresca sola después de guardar (con o sin error),
   sin tener que refrescar el navegador.
3. **Unidades nuevas (Atado, Libra, Quintal…).** Las listas de unidades de
   toda la app (solicitudes de compra, nómina, presupuesto y lista de
   precios) ahora salen de la base de datos y tienen una opción
   "+ Añadir nueva unidad…": lo que se escriba queda guardado y disponible
   en todos los formularios para siempre. Ya vienen incluidas Atado, Libra
   y Quintal.
4. **Préstamos: fechas de pago de cuotas.** El formulario del préstamo tiene
   un campo nuevo "Fecha de la primera cuota"; las demás se programan desde
   ahí según la frecuencia. Y en el cronograma de cada préstamo se puede
   cambiar la fecha de cualquier cuota pendiente con el lapicito.
5. **Préstamos: el dinero sale y entra de cuentas.** Al crear el préstamo se
   puede elegir de qué cuenta sale el dinero (eso ya existía pero la lista
   salía vacía porque no hay cuentas registradas; ahora la app lo avisa y te
   lleva a Configuración → Cuentas bancarias para crearlas). Lo nuevo: cada
   cuota tiene un botón verde "Registrar pago" donde se indica la fecha real
   y a qué cuenta entra el dinero; ese cobro queda anotado en la pestaña
   "Conciliación de cuentas". Si se paga la última cuota, el préstamo se
   marca solo como Pagado.

**Qué cambió para Cristian:** el cronograma ya no da el error rojo ni obliga
a subir/refrescar a mano; puede crear unidades nuevas él mismo; y los
préstamos ya manejan fechas de cuotas y cuentas de salida/entrada del dinero.
Para aprovechar lo de las cuentas, el único paso pendiente de su lado es
registrar sus cuentas en Configuración → Cuentas bancarias.

**Probado:** revisión de estilo, tipos, 653 pruebas automáticas y
construcción, todo en verde. Los 3 cambios de base de datos (088, 089, 090)
ya están aplicados en la base real; son aditivos y no tocan datos existentes.

### Anexo (misma fecha) — errores al guardar cuenta bancaria

Cristian intentó registrar una cuenta bancaria y salieron dos errores
técnicos en inglés, con causas distintas:

1. **"row-level security"**: no era un fallo, sino la regla de permisos por
   tipo de usuario — las cuentas bancarias solo las pueden crear el usuario
   administrador y el de contabilidad, y en ese momento la sesión era del
   usuario de planificación. Solución: entrar como administrador. Mejora
   aplicada: cuando un usuario no tenga permiso para algo, la app ahora lo
   dice en claro ("Tu usuario no tiene permiso para realizar esta acción…").
   Cristian decidió dejar los permisos como están.
2. **"null value in column project_id"**: este sí era un choque entre dos
   reglas de la propia app. Un refuerzo de integridad de hace semanas exigía
   que toda cuenta perteneciera a un proyecto, pero las cuentas internas de
   la empresa no son de ningún proyecto. Se ajustó la regla en la base de
   datos (cambio 091): las cuentas internas pueden no tener proyecto; las
   demás lo siguen necesitando. Se probó contra la base real y el guardado
   ya funciona.

## 2026-06-09 (parte 5) — Puesta al día de componentes internos

**Qué se hizo:** Se aplicaron 23 actualizaciones de piezas internas de la app
que estaban pendientes (las propuestas automáticas acumuladas): React,
conexión con la base de datos, generador de PDF, íconos, herramientas de
construcción y pruebas, TypeScript 6 y el conector de Sentry 5, además de 3
piezas de la maquinaria de GitHub. Todo se probó antes de publicar: 647
pruebas en verde y la app construye sin errores.

**Qué cambió para Cristian:** Nada visible; la app queda más segura, más
rápida de construir y sin deudas de mantenimiento acumuladas.

**Lo único que se dejó pendiente a propósito:** el revisor de calidad de
React (eslint-plugin-react-hooks) se quedó en su versión actual, porque la
nueva trae reglas más estrictas que marcan 51 puntos a corregir en 30
archivos; eso es un trabajo de limpieza aparte para otra sesión.

**También se confirmó con Cristian:** el precio de las varillas (RD$70,000
por atado) es correcto; el gasto de Estructura queda como está.

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
