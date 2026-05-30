# Manual del Rol: Planificacion

## Descripcion

El rol **Planificacion** es responsable de la estrategia y control economico de la obra. Define el presupuesto base, mantiene actualizada la lista de precios unitarios, gestiona los insumos del modulo Mercado, registra los avances fisicos y administra el cronograma de ejecucion.

---

## Que puede hacer

### Presupuesto

- Crear y editar partidas del presupuesto general de la obra.
- Importar plantillas de presupuesto desde Excel o desde proyectos anteriores.
- Asignar precios unitarios a cada partida con base en la lista vigente.
- Revisar comparativos entre presupuestado vs ejecutado.
- Bloquear partidas para evitar modificaciones posteriores.

### Lista de precios

- Mantener el catalogo maestro de precios unitarios.
- Versionar la lista de precios por periodo (mensual, trimestral).
- Aplicar ajustes masivos por inflacion o variacion de mercado.
- Exportar la lista vigente para distribuirla a otros roles.

### Insumos Mercado

- Dar de alta nuevos insumos en el modulo Mercado.
- Vincular insumos a proveedores aprobados.
- Definir unidades de medida, mermas y rendimientos.
- Aprobar cambios de precio reportados por compras.

### Avances

- Capturar el porcentaje de avance fisico por partida.
- Validar avances reportados por el Ingeniero de Obra.
- Generar curvas S de avance programado vs real.
- Emitir reportes de desviacion semanal y mensual.

### Cronograma

- Construir el cronograma Gantt de la obra.
- Definir ruta critica y dependencias entre actividades.
- Reprogramar actividades ante atrasos o cambios de alcance.
- Comparar cronograma base contra ejecucion real.

---

## Flujo tipico semanal

1. **Lunes:** Revisar avances capturados por el Ingeniero de Obra durante el fin de semana.
2. **Martes:** Actualizar lista de precios si llegaron cotizaciones nuevas desde Mercado.
3. **Miercoles:** Conciliar presupuesto ejecutado con cortes de obra emitidos.
4. **Jueves:** Reprogramar cronograma si hubo atrasos en ruta critica.
5. **Viernes:** Emitir reporte semanal de avance, desviacion y proyeccion de cierre.

### Flujo de aprobacion de cambio de precio

1. Compras solicita cambio desde Mercado.
2. Planificacion revisa impacto en presupuesto.
3. Planificacion aprueba o rechaza con comentario.
4. Lista de precios se actualiza automaticamente.

---

## Atajos UI

| Atajo         | Accion                             |
| ------------- | ---------------------------------- |
| `G` luego `P` | Ir a Presupuesto                   |
| `G` luego `L` | Ir a Lista de precios              |
| `G` luego `M` | Ir a modulo Mercado                |
| `G` luego `C` | Ir a Cronograma                    |
| `Ctrl + N`    | Nueva partida en presupuesto       |
| `Ctrl + S`    | Guardar cambios en pantalla actual |
| `Ctrl + E`    | Exportar vista actual a Excel      |
| `Ctrl + F`    | Buscar partida o insumo            |
| `Shift + A`   | Aprobar item seleccionado          |
| `Shift + R`   | Rechazar item seleccionado         |
| `?`           | Mostrar ayuda contextual           |

### Tips de productividad

- Usa filtros guardados en Presupuesto para volver rapidamente a vistas frecuentes.
- Marca insumos criticos con la estrella amarilla para monitoreo prioritario.
- Configura alertas de desviacion mayor al 5% en el dashboard personal.
- Aprovecha la vista comparativa lado a lado entre versiones de cronograma.

---

## Permisos y limites

- **No puede** capturar nomina, asistencia ni bitacora (corresponde a Ingeniero de Obra).
- **No puede** emitir ordenes de compra (corresponde a Compras).
- **Si puede** vetar requisiciones que excedan el presupuesto vigente.
