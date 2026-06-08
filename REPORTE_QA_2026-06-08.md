# Reporte de prueba completa — NominApp (8 de junio de 2026)

Recorrido manual de la app en producción (nominapp-rd.vercel.app), creando datos
de prueba y revisando cada parte en busca de errores, lógica faltante y colores
en modo claro/oscuro. Escrito en lenguaje simple.

---

## 1. Resumen rápido

**La app está en buen estado general.** Todas las pantallas cargan sin trabarse,
los formularios abren bien, los cálculos que revisé dan correctos y los colores se
ven bien tanto en modo claro como oscuro. Encontré un detalle de comodidad (las
listas no se actualizan solas al crear algo) y arreglé los tres puntos que venían
de antes. No encontré ningún error grave que rompa la app ni que haga perder datos.

---

## 2. Arreglos que dejé listos (en propuestas de cambio / PR)

| # | Qué se arregló | Dónde quedó |
|---|----------------|-------------|
| 1 | **Reporte consolidado en cero**: la pantalla de Reportes mostraba presupuesto y gasto en RD$0.00; ahora calcula igual que la pantalla de Presupuesto de cada proyecto. | PR #104 |
| 2 | **Préstamo "Pagado" con saldo**: un préstamo marcado como pagado mostraba saldo pendiente; ahora si está pagado el saldo se ve en RD$0.00 y el pagado completo. | PR #105 |
| 3 | **Etiqueta confusa del Panel**: "Total invertido" ahora dice "Invertido en nóminas" (porque ese número solo suma los reportes de nómina aprobados, no todo el gasto). | PR #105 |

Los tres arreglos fueron verificados (revisión de tipos, pruebas y construcción de
la app, todo en verde) y tienen punto de restauración por si hay que volver atrás.
Quedan esperando tu visto bueno (botón "Merge") en GitHub.

---

## 3. Hallazgos del recorrido

### F1 — (Revisado) Posible demora al ver el registro nuevo en la lista — Baja
Durante la prueba pareció que, al crear un proyecto/suplidor/contratista, la lista no
se actualizaba hasta recargar. **Al revisar el código a fondo, las tres pantallas sí
vuelven a consultar la lista justo después de crear** (no es un defecto del programa).
Lo que vi fue, muy probablemente, un retraso de milésimas entre "guardar" y "leer"
amplificado por mi prueba automática, que tomaba la foto demasiado rápido.

Decisión: **no toqué ese código**, porque ya está correcto y cambiarlo sin un fallo
confirmado solo agrega riesgo. Mejora opcional a futuro: mostrar el registro recién
creado al instante (como ya hace Órdenes de Compra) para que jamás se perciba demora.

### F2 — (Revisado, no es un error) Demora de sincronización
Al principio pareció que una orden de compra "desaparecía" al recargar, pero al
verificar de nuevo **sí estaba guardada y correcta**. Fue una demora de mi recarga
demasiado rápida, no una pérdida de datos. Lo dejo anotado por transparencia.

### F3 — Refresco inconsistente entre módulos — Baja
Mismo tema que F1, visto desde el lado contrario: unos módulos refrescan solos y
otros no. Unificarlo mejora la experiencia.

---

## 4. Modo claro / oscuro

Revisé en **ambos modos**: Panel, Proyectos, Detalle de proyecto, Control Financiero,
Presupuesto, Reportes, Órdenes de Compra, Préstamos, Inventario, Calidad, Cronograma,
Bitácora y Asistencia.

**No encontré textos ilegibles ni colores rotos.** La app usa un sistema de colores
consistente y se ve bien en los dos modos. (Detalle menor: la barra lateral se queda
oscura en modo claro, pero eso es decisión de diseño, no un error.)

---

## 5. Qué se probó y qué falta

**Probado creando datos de prueba:** 1 proyecto, 1 suplidor, 1 contratista y 1 orden
de compra. Todo se guardó correctamente.

**Recorrido (mirando, sin crear):** Cubicaciones, Reportes, Presupuesto, Control
Financiero, Inventario, Calidad, Cronograma, Bitácora, Asistencia, Préstamos.

**Probado además (segunda parte de la sesión):**
- **Cubicaciones / contrato de ajuste:** creé un contrato de prueba (contratista
  MAESTRO QA PRUEBA, retención 5%). Funciona bien: muestra Acordado/Acumulado/
  Pendiente/Retenido y las pestañas Partidas, Cortes, Avances y Préstamos. Agregar
  partida abre una fila que toma los precios del presupuesto. **La validación
  funciona** (probé poner 500000 en "Retención %" y la app lo rechazó con "La
  retención debe estar entre 0 y 100%").
- **Reportes de obra / nómina (/nominas):** carga bien, agrupado por proyecto, con
  totales, % pagado y estados (Aprobado/Pagado/Borrador). Confirmé que el "Gastado"
  del Panel de un proyecto = la suma de sus reportes de nómina (así se aclara la
  duda de las etiquetas).

**Hallazgos menores nuevos:**
- F4 (Baja): el modal de "Nuevo contrato" de cubicaciones **conserva los valores
  anteriores** al cerrarlo y volver a abrirlo (debería empezar en blanco).

**Pendiente para otra sesión (lo más