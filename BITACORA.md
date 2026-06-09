# Bitácora de cambios

Diario en lenguaje sencillo de lo que se va haciendo en la app.

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
