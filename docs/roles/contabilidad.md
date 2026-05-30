# Rol: Contabilidad

Rol orientado al registro y control de las operaciones financieras de la empresa dentro de NominApp. Tiene acceso completo a los modulos contables, bancarios y de cuentas por pagar.

## Responsabilidades principales

- Registrar y mantener el libro diario de la empresa.
- Administrar las cuentas por pagar (CxP) a proveedores y acreedores.
- Emitir, anular y conciliar cheques.
- Gestionar las cuentas bancarias y sus movimientos.
- Generar reportes contables y financieros periodicos.

## Modulos y permisos

### 1. Libro Diario

- Crear, editar y anular asientos contables manuales.
- Consultar el catalogo de cuentas y agregar cuentas auxiliares.
- Generar el balance de comprobacion y mayor general.
- Cerrar periodos contables (mensual / anual).
- Exportar el libro diario a Excel o PDF.

Permisos: lectura, escritura, anulacion, cierre de periodo.

### 2. Cuentas por Pagar (CxP)

- Registrar facturas de proveedores y notas de credito.
- Programar pagos segun fecha de vencimiento.
- Aplicar retenciones (ITBIS, ISR, otras) segun normativa fiscal.
- Conciliar saldos con estados de cuenta del proveedor.
- Generar reportes de antiguedad de saldos.

Permisos: lectura, escritura, aprobacion de pagos hasta el limite asignado.

### 3. Cheques

- Emitir cheques fisicos y electronicos.
- Anular cheques con justificacion y trazabilidad.
- Mantener la chequera digital con numeracion correlativa.
- Imprimir cheques con formato preconfigurado.
- Consultar el historial de cheques por proveedor o cuenta.

Permisos: lectura, escritura, anulacion, impresion.

### 4. Cuentas Bancarias

- Crear y mantener cuentas bancarias activas.
- Registrar depositos, transferencias y retiros.
- Realizar conciliaciones bancarias mensuales.
- Cargar estados de cuenta en formato CSV o OFX.
- Consultar saldos en tiempo real por cuenta y moneda.

Permisos: lectura, escritura, conciliacion.

## Flujos de trabajo tipicos

### Pago a proveedor

1. Recibir factura del proveedor.
2. Registrar la factura en CxP con cuenta contable correspondiente.
3. Verificar retenciones aplicables.
4. Programar el pago y seleccionar la cuenta bancaria.
5. Emitir cheque o transferencia.
6. Registrar el asiento en el libro diario (automatico).
7. Conciliar con el estado de cuenta bancario.

### Cierre mensual

1. Verificar que todas las facturas del mes esten registradas.
2. Conciliar todas las cuentas bancarias.
3. Generar balance de comprobacion.
4. Revisar y ajustar diferencias.
5. Cerrar el periodo contable.
6. Generar y archivar reportes oficiales.

## Reportes disponibles

- Balance General.
- Estado de Resultados.
- Libro Mayor por cuenta.
- Antiguedad de saldos de CxP.
- Flujo de caja proyectado.
- Conciliacion bancaria.
- Reporte de cheques emitidos / anulados.

## Restricciones

- No tiene acceso al modulo de Nomina (calculo de salarios).
- No puede modificar el catalogo de empleados.
- No puede crear ni modificar roles de usuario.
- Las anulaciones de asientos requieren justificacion escrita y quedan auditadas.

## Auditoria

Todas las operaciones contables generan registro en el log de auditoria con: usuario, fecha, hora, operacion, datos previos y datos nuevos. Solo administradores pueden consultar el log completo.
