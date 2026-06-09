# Auditoría de código en paralelo — NominApp (8 de junio de 2026)

> ## ✅ Estado de arreglos (actualizado)
> **Ya corregido y publicado en producción (verificado: tipos, pruebas y build):**
> - N1 — "Crédito" con o sin tilde ya se detecta igual (CxP no desaparece).
> - N2 — "Depósitos" se detectan sin depender del texto exacto del código.
> - N3 — el Panel ya no se queda solo con las últimas 200 transacciones.
> - N8 (parte) — sumas de CxP con precisión Decimal.
> - U4 — los montos ya no pueden mostrarse como "NaN" (formato protegido).
> - U5 — exportación CSV protegida contra inyección de fórmulas.
> - R5 — editar un ensayo de calidad ya no borra su estado.
> - (De antes hoy: Reporte consolidado, préstamo "Pagado", etiqueta del Panel.)
>
> **Seguridad (S1–S6):** entregada como migración lista + checklist en
> `SEGURIDAD_PENDIENTE_2026-06-08.md` (no se aplicó a ciegas en la base real).
>
> **Pendiente (documentado, requiere tu validación en vivo o decisiones de negocio):**
> U1 (validaciones de formularios), U2 (errores silenciosos), N4/N5/N6 (lógica de
> préstamos/reportes), N7 y R1/R2/R6 (candados de servidor/base de datos para uso
> simultáneo). Se hacen mejor contigo presente para verificar cada uno.


Se lanzaron **16 agentes simultáneos**, cada uno revisando una parte distinta del
código (solo lectura, sin tocar nada). Aquí está todo consolidado, sin repetidos y
ordenado por importancia. Escrito en lenguaje simple; al final hay un plan sugerido.

> Nota honesta: esto es **revisión de código**, no pruebas en vivo. Algunos puntos
> (sobre todo los de seguridad de base de datos) hay que **confirmarlos en producción**
> antes de dar por hecho que son explotables. Lo indico donde aplica.

---

## 🔴 SEGURIDAD — lo más urgente de revisar

**S1. Un usuario podría auto-convertirse en "Director General".**
La regla de la base de datos que deja a cada quien editar su propio perfil no impide
cambiar el campo "soy director". En teoría alguien con conocimientos podría darse a sí
mismo acceso total. *(Confirmar en la base real y bloquear ese campo.)*

**S2. La clave para aprobar órdenes/cortes es "1234" y vive en el navegador.**
Está escrita en el código y guardada en el navegador, sin validación en el servidor.
Cualquiera con la consola del navegador puede verla o cambiarla. No protege de verdad.

**S3. Hay usuarios y contraseñas de prueba escritos en el código.**
Por ejemplo un usuario "director" con su contraseña a la vista en el código publicado.
Deben sacarse del programa que llega a producción.

**S4. Posibles permisos viejos que darían acceso sin iniciar sesión.**
El historial de la base de datos sugiere reglas muy permisivas que pudieron quedar
activas. *Hay que verificarlo en producción* (es rápido) y, si están, cerrarlas.

**S5. Fugas de datos entre empresas.**
Algunas consultas (ej. el historial de un contratista) traen proyectos de **todas las
empresas**, no solo la del usuario. Conviene filtrar por empresa/aislar por inquilino.

**S6. Las funciones de administrar usuarios aceptan peticiones de cualquier origen** si
no se configura una variable. Conviene forzar esa configuración.

---

## 🟠 NÚMEROS Y LÓGICA — afectan lo que ves en pantalla

**N1. La palabra "Crédito" con tilde se ignora.** El sistema detecta "Credito" (sin
tilde) para las cuentas por pagar; si alguien escribe "Crédito", esa deuda **desaparece**
de los cálculos de CxP. (Lo encontraron varios agentes.)

**N2. Los "depósitos" se detectan por un texto exacto ("19 - DEPOSITOS").** Si una
categoría usa otro código o no tiene categoría, un ingreso se cuenta como gasto y
distorsiona "gastado / disponible / costo real".

**N3. El Panel y algunos reportes solo miran las últimas 200 transacciones** (o se
limitan a 1000 filas). En proyectos grandes, los totales (CxP, gasto del mes) salen
**incompletos sin avisar**.

**N4. El "total pagado" de un préstamo solo suma las deducciones de nómina** e ignora
las cuotas marcadas como pagadas en el cronograma. Por eso un préstamo puede verse con
saldo aunque esté pagado (emparentado con el arreglo que ya hicimos).

**N5. El reporte mensual en PDF está incompleto:** solo arma portada y anexo; el
resumen, el desglose y el flujo de caja **no se incluyen**; varias columnas
("Materiales", "Indirectos", "Esperado") salen siempre en cero.

**N6. El costo promedio de un material es un promedio simple, no ponderado por cantidad**
→ engaña en materiales de mucha rotación.

**N7. Faltan "candados" en el servidor para los estados.** Marcar "pagado/aprobado" o
devolver a borrador se controla casi solo en pantalla; por código se podrían hacer
saltos de estado inválidos (nómina, préstamos, órdenes).

**N8. Sumas de dinero con aritmética común en algunos lugares** (CxP, saldos de cuenta,
total pagado de préstamos) en vez de la librería de precisión que usa el resto → puede
descuadrar centavos.

---

## 🟡 ROBUSTEZ (si dos personas usan la app a la vez)

**R1. La numeración "buscar el último + 1" puede repetir números** cuando dos usuarios
crean a la vez: solicitudes de compra, versiones de presupuesto, códigos de precio,
tareas y materiales. Falta que la base de datos asigne el número.

**R2. Recibir órdenes y distribuir pagos no son operaciones "todo o nada".** Con uso
simultáneo se podría recibir de más o pagar de más.

**R3. La cola "sin internet" tiene un fallo** que puede dejar una operación colgada y
perderse, y reintenta sin pausa. (También hay código duplicado muerto de esa cola.)

**R4. Marcar una cuota de préstamo como pagada no evita el doble clic** → puede duplicar
el movimiento en la cuenta bancaria.

**R5. Al editar parcialmente un ensayo de calidad se borra su estado** (aprobado/fallido).

**R6. Inventario:** el descuento por lotes (FIFO) va fuera de la operación atómica → el
stock total y la suma de lotes pueden quedar distintos; y crear material puede duplicarlo
si llegan dos recepciones iguales a la vez.

---

## 🟢 EXPERIENCIA DE USO / DETALLES (muchos, fáciles)

**U1. Formularios que aceptan datos inválidos** por falta de mínimos: cantidades en 0 o
negativas, montos negativos, fechas futuras (inventario, compras, cubicación, nómina,
calidad, bitácora, transacciones).

**U2. Errores silenciosos:** varios guardados, si fallan, no muestran nada al usuario
(no sabe si guardó). Es el patrón más repetido.

**U3. Listas que no se refrescan tras crear** (ya lo vimos: proyectos, suplidores,
contratistas) — el dato se guarda pero no aparece hasta recargar.

**U4. Montos podrían mostrarse como "NaN"** si llega un dato vacío, porque el formateador
de RD$ no se protege (se usa en ~314 lugares).

**U5. Exportación a Excel/CSV:**
 - Riesgo de "inyección de fórmulas" (un nombre que empieza con "=" se ejecuta al abrir
   el archivo). Ya existe una función para evitarlo pero no se usa en todos l