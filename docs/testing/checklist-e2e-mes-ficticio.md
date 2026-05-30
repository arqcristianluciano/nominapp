# Checklist E2E - Mes Ficticio de Operacion de Obra

Flujo end-to-end completo que simula un mes calendario de operacion en NominApp para la empresa **TEST OBRA SRL**, proyecto **Edificio Demo**. Cada paso incluye los datos concretos a ingresar y los criterios de exito.

- **Empresa:** TEST OBRA SRL (RFC: TOS200115ABC)
- **Proyecto:** Edificio Demo (codigo: EDF-DEMO-01)
- **Mes simulado:** 01 al 31 de Mayo 2026
- **Moneda:** MXN

## 1. Setup inicial (Director General - DG)

- [ ] Login como DG (`dg@testobra.mx` / `Test1234!`).
- [ ] Crear empresa **TEST OBRA SRL** con RFC `TOS200115ABC` y direccion `Av. Reforma 100, CDMX`.
- [ ] Crear proyecto **Edificio Demo**, codigo `EDF-DEMO-01`, fecha inicio `2026-05-01`, fecha fin `2026-12-31`.
- [ ] Crear usuarios con roles asignados al proyecto:
  - [ ] `pl@testobra.mx` - Planeador (PL)
  - [ ] `co@testobra.mx` - Compras (CO)
  - [ ] `io@testobra.mx` - Ingeniero de Obra (IO)
  - [ ] `al@testobra.mx` - Almacenista (AL)
  - [ ] `dp@testobra.mx` - Director de Proyecto (DP)
  - [ ] `ct@testobra.mx` - Contador (CT)
- [ ] Verificar que cada usuario aparece en la matriz de permisos del proyecto.

## 2. Presupuesto base (Planeador - PL)

- [ ] Login como PL.
- [ ] Crear presupuesto **PRES-EDF-001** vinculado a Edificio Demo, monto total `$5,000,000.00 MXN`.
- [ ] Cargar partidas:
  - [ ] Cimentacion - `$1,200,000.00`
  - [ ] Estructura - `$2,300,000.00`
  - [ ] Albanileria - `$900,000.00`
  - [ ] Instalaciones - `$600,000.00`
- [ ] Enviar a aprobacion del DP y confirmar estado `APROBADO`.

## 3. Contrato con contratista (Compras - CO)

- [ ] Login como CO.
- [ ] Crear contratista **Constructora Norte SA** (RFC: `CNO180322XYZ`).
- [ ] Crear contrato **CTR-2026-001**:
  - [ ] Partida: Estructura
  - [ ] Monto: `$2,300,000.00`
  - [ ] Fecha inicio: `2026-05-02`
  - [ ] Fecha fin: `2026-09-30`
  - [ ] Retencion: `5%`
- [ ] Adjuntar PDF de prueba `contrato-CTR-2026-001.pdf`.
- [ ] Confirmar contrato en estado `VIGENTE`.

## 4. Bitacora y asistencia diaria (Ingeniero de Obra - IO)

- [ ] Login como IO.
- [ ] Registrar bitacora dia `2026-05-04`: clima `Soleado`, avance `Excavacion 30%`, incidencias `Ninguna`.
- [ ] Registrar asistencia del dia con 15 trabajadores del contratista Constructora Norte SA:
  - [ ] 12 presentes, 2 con permiso, 1 falta.
- [ ] Repetir bitacora + asistencia para `2026-05-05` a `2026-05-08` (5 dias laborales).
- [ ] Verificar contador `Dias trabajados = 5` en el resumen semanal.

## 5. Recepcion de material en almacen (Almacenista - AL)

- [ ] Login como AL.
- [ ] Registrar entrada de material sin OC (compra urgente previa) `ENT-001`:
  - [ ] 50 sacos de cemento gris CPC 40 - `$280.00` c/u
  - [ ] 100 varillas #4 - `$320.00` c/u
- [ ] Confirmar inventario actualizado en la vista de existencias.

## 6. Requisicion (IO)

- [ ] Login como IO.
- [ ] Crear requisicion **REQ-2026-010** para Edificio Demo:
  - [ ] 200 sacos de cemento gris CPC 40
  - [ ] 400 varillas #4
  - [ ] 30 m3 de arena
- [ ] Justificar uso: `Avance cimentacion semana 2`.
- [ ] Enviar a Compras y confirmar estado `PENDIENTE COTIZACION`.

## 7. Cotizaciones y OC (CO)

- [ ] Login como CO.
- [ ] Para REQ-2026-010, cargar 3 cotizaciones:
  - [ ] Proveedor `Materiales SUR` - total `$185,000.00` - entrega 3 dias
  - [ ] Proveedor `Cementos MX` - total `$172,500.00` - entrega 2 dias
  - [ ] Proveedor `Aceros Centro` - total `$190,300.00` - entrega 5 dias
- [ ] Seleccionar ganador `Cementos MX` (mejor precio + plazo).
- [ ] Generar **OC-2026-045** asociada a la cotizacion ganadora.

## 8. Aprobacion de OC (Director de Proyecto - DP)

- [ ] Login como DP.
- [ ] Revisar OC-2026-045 en bandeja de aprobaciones.
- [ ] Validar que el monto `$172,500.00` esta dentro del presupuesto de partida `Cimentacion`.
- [ ] Aprobar OC y verificar notificacion al AL.

## 9. Recepcion de OC (AL)

- [ ] Login como AL.
- [ ] Buscar OC-2026-045 en bandeja de recepciones pendientes.
- [ ] Registrar recepcion parcial `REC-OC-045-A`:
  - [ ] 200 sacos cemento (completo)
  - [ ] 400 varillas (completo)
  - [ ] 25 m3 arena (faltan 5 m3)
- [ ] Adjuntar foto remision (`remision-cementosmx.jpg`).
- [ ] Confirmar estado OC `RECIBIDA PARCIAL`.

## 10. Corte de obra (IO)

- [ ] Login como IO.
- [ ] Crear **CORTE-2026-05-Q1** del contrato CTR-2026-001, periodo `2026-05-01` a `2026-05-15`.
- [ ] Avance reportado: `30%` de Estructura (`$690,000.00`).
- [ ] Adjuntar reporte fotografico y memoria de calculo.
- [ ] Enviar a aprobacion del DP.

## 11. Aprobacion de corte (DP)

- [ ] Login como DP.
- [ ] Revisar CORTE-2026-05-Q1 contra bitacora y avance fisico declarado.
- [ ] Aplicar retencion del `5%` (= `$34,500.00`).
- [ ] Aprobar corte; verificar monto neto a pagar `$655,500.00`.

## 12. Nomina semanal (IO)

- [ ] Login como IO.
- [ ] Crear **NOM-2026-W19** (semana del 04 al 10 de Mayo).
- [ ] Cargar 15 trabajadores del contratista, con jornales segun asistencia (12 jornadas completas, 3 incompletas).
- [ ] Total bruto calculado: `$48,750.00`.
- [ ] Aplicar deducciones (IMSS, prestamos): `$3,200.00`.
- [ ] Enviar a aprobacion del DP.

## 13. Aprobacion de nomina (DP)

- [ ] Login como DP.
- [ ] Revisar NOM-2026-W19 contra asistencia registrada.
- [ ] Aprobar nomina; total neto `$45,550.00`.
- [ ] Verificar que se genera orden de pago `PAGO-NOM-W19`.

## 14. Distribucion de pagos (DP)

- [ ] Login como DP.
- [ ] En modulo Tesoreria, distribuir pagos del periodo:
  - [ ] OC-2026-045 - `$172,500.00` a Cementos MX (transferencia)
  - [ ] CORTE-2026-05-Q1 - `$655,500.00` a Constructora Norte SA (transferencia)
  - [ ] PAGO-NOM-W19 - `$45,550.00` distribuido en 15 trabajadores (efectivo/transferencia mixta)
- [ ] Confirmar saldos pendientes actualizados en el dashboard financiero.

## 15. Registro contable (Contador - CT)

- [ ] Login como CT.
- [ ] Registrar transacciones bancarias del periodo en cuenta `BBVA-1234`:
  - [ ] Egreso `$172,500.00` ref `OC-2026-045`
  - [ ] Egreso `$655,500.00` ref `CORTE-2026-05-Q1`
  - [ ] Egreso `$45,550.00` ref `PAGO-NOM-W19`
- [ ] Conciliar contra estados de cuenta (subir CSV `bbva-mayo-2026.csv`).
- [ ] Verificar que el modulo marca el periodo como `CONCILIADO`.

## 16. Cierre de mes y reporte PDF (DG)

- [ ] Login como DG.
- [ ] Ir a `Proyectos > Edificio Demo > Cierre Mensual`.
- [ ] Seleccionar mes `Mayo 2026`.
- [ ] Validar checklist automatico:
  - [ ] Presupuesto aprobado
  - [ ] Contratos vigentes con cortes al dia
  - [ ] OC del periodo recibidas/cerradas
  - [ ] Nominas aprobadas y pagadas
  - [ ] Tesoreria conciliada
- [ ] Ejecutar `Cerrar mes`; confirmar bloqueo de edicion retroactiva.
- [ ] Descargar **Reporte Mensual PDF** (`reporte-EDF-DEMO-01-2026-05.pdf`).
- [ ] Verificar que el PDF incluye: portada, resumen ejecutivo, avance fisico, estado financiero, OC, cortes, nomina y conciliacion bancaria.

## Criterios de aceptacion final

- [ ] Ningun paso requirio acciones fuera del rol asignado (no hubo escalamientos manuales).
- [ ] Saldos en dashboard coinciden con conciliacion contable.
- [ ] PDF generado contiene los 7 bloques esperados y suma de egresos = `$873,550.00`.
- [ ] Mes `Mayo 2026` queda en estado `CERRADO` y no permite nuevas operaciones sin reapertura.
