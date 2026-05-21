# Rol: Supervisor Especializado

Rol de solo lectura orientado a la supervision y monitoreo de las operaciones de un area especifica de la empresa. No tiene permisos de escritura, modificacion ni eliminacion en ningun modulo.

## Caracteristica principal

**Solo lectura.** El Supervisor Especializado puede consultar informacion, generar reportes y exportar datos, pero NO puede realizar cambios en el sistema.

## Lo que puede ver

### Empleados de su area

- Datos generales (nombre, cargo, departamento).
- Estatus laboral (activo, vacaciones, licencia).
- Historial de asistencia y puntualidad.
- Evaluaciones de desempeno.

### Nomina (resumen)

- Resumen quincenal o mensual de su area.
- Totales por departamento sin detalle de salarios individuales sensibles.
- Reportes consolidados de pagos.

### Asistencia

- Marcajes de entrada y salida.
- Permisos y ausencias registradas.
- Horas extras acumuladas.

### Reportes

- Reportes de productividad del area.
- Indicadores de rotacion de personal.
- Estadisticas de asistencia.
- Exportacion a Excel y PDF.

## Lo que NO puede hacer

- NO puede crear, editar ni eliminar empleados.
- NO puede aprobar permisos, vacaciones ni horas extras.
- NO puede modificar marcajes de asistencia.
- NO puede acceder a modulos de Contabilidad, CxP ni Bancos.
- NO puede gestionar usuarios ni roles.
- NO puede ejecutar la corrida de nomina.
- NO puede ver salarios individuales detallados fuera de su area.

## Alcance del area

El acceso esta limitado al departamento o sucursal asignada al supervisor. No tiene visibilidad de otras areas de la empresa.

## Auditoria

Todas las consultas y exportaciones quedan registradas en el log de acceso con usuario, fecha, hora y recurso consultado.
