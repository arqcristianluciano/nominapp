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

## 2026-06-08 (tarde) — Prueba completa de la app y arreglos

**Qué se hizo:** Recorrí NominApp de principio a fin creando datos de prueba
(un proyecto, un suplidor, un contratista y una orden de compra) y revisé cada
módulo, incluyendo modo claro y oscuro.

**Arreglos dejados en propuestas de cambio (PR), verificados (tipos, pruebas y
build en verde):**
- PR #104: el Reporte consolidado ya no sale en cero; calcula igual que la
  pantalla de Presupuesto de cada proyecto.
- PR #105: el préstamo marcado "Pagado" ya no muestra saldo pendiente; y la
  etiqueta del Panel "Total invertido" ahora dice "Invertido en nóminas".

**Hallazgos:**
- F1: pareció que las listas no se refrescaban al crear, pero el código sí
  vuelve a consultar la lista; fue un artefacto de tiempo de la prueba. No se
  tocó código (ya está correcto).
- Modo claro/oscuro: revisado en 13 pantallas, sin textos ilegibles ni colores
  rotos.
- No se encontraron errores graves ni pérdida de datos.

**Qué cambió para Cristian:** dos correcciones listas para publicar (PR #104 y
#105) y un reporte detallado (REPORTE_QA_2026-06-08.md).

**Pendiente:** revisar a fondo (con datos encadenados) cubicaciones con cortes y
adelantos, generar un reporte de nómina completo, recepción de órdenes con
conduces y el flujo de cotización/aprobación de compras. Quedaron 4 registros de
prueba en la base (PRUEBA QA CLAUDE, FERRETERIA QA PRUEBA, MAESTRO QA PRUEBA,
REQ-2026-9154) que Cristian puede borrar con un clic cuando quiera.

## 2026-06-08 (noche) — Auditoría con 16 agentes y arreglos publicados

**Qué se hizo:** Se auditó todo el código con 16 agentes en paralelo y se
corrigieron y publicaron en producción (cada uno verificado: tipos, pruebas y
build) los siguientes puntos:
- "Crédito" con o sin tilde ya cuenta igual (CxP no desaparece).
- "Depósitos" se detectan sin depender del texto exacto del código.
- El Panel ya no se queda solo con las últimas 200 transacciones.
- CxP suma con precisión de centavos; los montos ya no pueden salir como "NaN".
- Exportación CSV protegida contra inyección de fórmulas.
- Editar un ensayo de calidad ya no borra su estado.
- Topes en formularios (personal en obra, No. de nómina, fecha de colada no futura).
- Suplidores y contratistas ahora muestran el detalle real del error al guardar.

**Seguridad (aplicada en la base real, con verificación previa):**
- S1: se bloqueó que un usuario se auto-asigne "Director" (migración 083).
- S4 y S5: verificados, sin problemas (RLS activo en todas las tablas, sin accesos
  abiertos, proyectos filtrados por empresa).

**Qué cambió para Cristian:** la app calcula y muestra mejor el dinero, exporta más
seguro, y nadie puede auto-darse permisos de director.

**Pendiente (documentado en AUDITORIA_CODIGO y SEGURIDAD_PENDIENTE):** lógica de
préstamos/reportes que necesita decisiones de negocio, candados de base de datos para
uso simultáneo, y validaciones de formularios que conviene verificar en pantalla.
También quedan 5 registros de prueba por borrar y, al salir de pruebas, quitar los
accesos rápidos del login y el código demo "1234".
