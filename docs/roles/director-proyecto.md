# Manual del Director de Proyecto

El Director de Proyecto (DP) es el responsable operativo y financiero de UN proyecto especifico dentro de una empresa de NominApp. Su alcance esta limitado al proyecto asignado.

## 1. Permisos: Que PUEDE hacer en SU proyecto

Dentro del proyecto del que es titular, el DP puede ejecutar las siguientes acciones:

- **Editar presupuesto**: modificar partidas, montos asignados y reasignar fondos entre conceptos del proyecto. Cada cambio queda registrado en el historial de auditoria.
- **Aprobar Ordenes de Compra (OC)**: validar y autorizar OC generadas por el equipo de compras del proyecto, siempre que no excedan el presupuesto disponible (ver Seccion 4).
- **Aprobar nominas**: revisar y autorizar la nomina semanal/quincenal del personal asignado al proyecto antes de su dispersion (ver Seccion 3).
- **Ver finanzas del proyecto**: consultar reportes de flujo de efectivo, ejercido vs presupuestado, OC abiertas, cuentas por pagar y avance financiero.
- **Firmar cortes**: validar y firmar digitalmente los cortes semanales, quincenales y mensuales del proyecto. La firma del DP es requisito para cerrar el periodo.

## 2. Restricciones: Que NO puede hacer

El DP NO tiene acceso a las siguientes funciones, reservadas a Administradores de Empresa o Super Administradores:

- **Crear empresas**: no puede dar de alta nuevas entidades juridicas en NominApp.
- **Crear usuarios**: no puede invitar, dar de alta ni asignar roles a nuevos usuarios. Debe solicitarlo al Administrador de la empresa.
- **Ver informacion cross-empresa**: solo ve datos de SU proyecto. No puede consultar otros proyectos de la misma empresa, ni proyectos de empresas distintas, ni reportes consolidados a nivel corporativo.
- **Modificar catalogos globales**: no puede editar tabuladores, catalogos de puestos, ni configuraciones fiscales.
- **Eliminar registros historicos**: los cortes firmados y OC aprobadas son inmutables.

## 3. Flujo de aprobacion de nomina (paso a paso)

1. **Generacion**: el capturista o jefe de obra arma la prenomina con las asistencias, destajos y deducciones del periodo.
2. **Cierre de captura**: el responsable cierra la prenomina; el sistema calcula percepciones, deducciones y neto a pagar.
3. **Revision del DP**: el DP recibe notificacion en su bandeja. Abre la nomina y revisa:
   - Total a dispersar vs presupuesto de mano de obra disponible.
   - Lista de trabajadores y conceptos atipicos (bonos, finiquitos, prestamos).
   - Comparativo contra el periodo anterior (alertas si la variacion supera 15%).
4. **Acciones disponibles**:
   - **Aprobar**: firma la nomina; pasa a tesoreria para dispersion.
   - **Rechazar**: regresa al capturista con comentarios obligatorios.
   - **Solicitar ajuste**: bloquea conceptos especificos sin rechazar el total.
5. **Dispersion**: una vez aprobada, tesoreria ejecuta el layout bancario. El DP recibe confirmacion del CEP/comprobante.
6. **Cierre**: la nomina queda contabilizada contra el presupuesto y se refleja en el dashboard.

## 4. Flujo de aprobacion de OC (validar excedente, liberar)

1. **Solicitud**: compras o residente genera una OC con proveedor, partidas, cantidades y precios.
2. **Validacion automatica del sistema**:
   - Verifica saldo disponible en la partida presupuestal.
   - Si la OC NO excede el presupuesto, queda lista para aprobacion del DP.
   - Si EXCEDE el presupuesto, el sistema marca la OC con bandera roja "EXCEDENTE" e indica el monto sobregirado.
3. **Revision del DP**:
   - **Caso normal (sin excedente)**: el DP revisa proveedor, montos y partida; aprueba o rechaza.
   - **Caso con excedente**: el DP tiene dos opciones:
     - **Reasignar presupuesto**: mover fondos desde otra partida para cubrir el excedente, luego aprobar.
     - **Solicitar autorizacion superior**: enrutar la OC al Administrador de Empresa para liberar excedente. El DP NO puede aprobar directamente OC con excedente.
4. **Liberacion**:
   - OC aprobada cambia a estado "LIBERADA"; se envia al proveedor.
   - Se reserva el monto en el presupuesto (compromiso).
5. **Seguimiento**: el DP ve la OC en el tablero hasta su cierre (recepcion de material/servicio y pago al proveedor).

## 5. Como leer el dashboard del proyecto

El dashboard del proyecto presenta cinco bloques principales:

1. **Cabecera**: nombre del proyecto, cliente, fecha de inicio, avance fisico (%), avance financiero (%), dias transcurridos vs programados.
2. **Indicadores financieros** (tarjetas superiores):
   - **Presupuesto total**: monto autorizado del proyecto.
   - **Ejercido**: lo gastado a la fecha (nominas pagadas + OC liberadas + gastos).
   - **Comprometido**: OC liberadas pero no pagadas.
   - **Disponible**: presupuesto - ejercido - comprometido. Si es negativo se muestra en rojo.
3. **Grafica de flujo**: curva de gasto real vs gasto planeado por semana. Sirve para detectar desviaciones tempranas.
4. **Bandejas de aprobacion**: nominas pendientes, OC pendientes, cortes por firmar. Cada item enlaza al detalle.
5. **Alertas**:
   - Partidas presupuestales por debajo del 10% disponible.
   - OC con excedente esperando reasignacion.
   - Nominas con variacion atipica vs periodo anterior.
   - Cortes vencidos sin firmar.

**Lectura sugerida diaria**: revisar primero las alertas, despues las bandejas de aprobacion, y al final el comparativo ejercido vs planeado para anticipar desviaciones del mes.
