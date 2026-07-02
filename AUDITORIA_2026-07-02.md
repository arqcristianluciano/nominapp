# Auditoría completa de NominAPP — 2 de julio de 2026

_Revisión de toda la aplicación en busca de errores, lógica faltante, problemas de integración entre módulos y mejoras. La hicieron 16 revisores especializados (uno por cada parte de la app), y los puntos más graves fueron verificados leyendo el código y la base de datos real._

## Resumen en una mirada

Se encontraron **138 temas** en total:

- 🔴 **9 críticos** (tocan dinero, seguridad o pérdida de datos — atender primero)
- 🟠 **47 altos** (cuentas que no cuadran, cosas prometidas que no funcionan)
- 🟡 **60 medios** (fallos molestos o riesgos ocasionales)
- ⚪ **22 bajos** (detalles y mejoras pequeñas)

De todos ellos, **16 ya quedaron confirmados** con evidencia directa. El resto están muy bien fundamentados pero la segunda verificación automática quedó a medias por un límite de uso del servicio; los marco como «por reconfirmar» para ser honestos.

### Los patrones que más se repiten

Muchos de los temas son en realidad **la misma raíz** apareciendo en varias pantallas:

1. **El dinero se cuenta dos veces.** Cuando compras a crédito y luego pagas esa factura, la app suma el gasto dos veces (en "disponible", en "gastado" del presupuesto, en el flujo de caja y en el panel). Es el problema más extendido.
2. **Cadenas de dinero desconectadas.** Pagar la nómina, cobrar cuotas de préstamo o recibir una compra a crédito no siempre mueve el saldo de las cuentas de banco ni las cuentas por pagar. El dinero "desaparece" del control.
3. **Descuentos que no descuentan.** Las deducciones de préstamo y la retención de garantía se muestran en pantalla pero no se restan del pago; los adelantos solo se marcan a medias y se pueden cobrar dos veces.
4. **Candados solo en la pantalla, no en el servidor.** Varias reglas (quién aprueba, qué se puede editar, no pasarse del presupuesto) se revisan solo en el navegador; el servidor las deja pasar.
5. **Cosas prometidas que no están conectadas.** El "modo sin internet", el historial de versiones del presupuesto, importar asistencia: los botones existen pero por dentro no hacen nada.

---

## 🔴 CRÍTICO — 9 temas

### Crítico 1. El circuito de aprobación de compras solo se hace cumplir en la pantalla, no en el servidor

- **Módulo:** Aprobaciones y avisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/migrations/032_rls_capability_based.sql (línea ~84)`
- **Qué pasa:** El proceso de compras exige tres pasos: alguien solicita, el Director aprueba y el Administrador libera la orden. Pero esa separación solo existe en los botones que muestra la app. La regla de seguridad de la base de datos es una sola y le da permiso de escribir CUALQUIER cambio a quien tenga cualquiera de los 5 permisos de compras. Es decir: la misma persona que crea una solicitud podría, con conocimientos básicos (la consola del navegador), marcarla como aprobada y ordenada sin que el Director la vea nunca, moviendo dinero real. Este tema ya aparece en AUDITORIA_CODIGO_2026-06-08.md como N7 y figura como el 'único pendiente'; sigue sin resolverse.
- **Cómo se arregla:** Crear en la base de datos un control de transiciones de estado (trigger o función RPC) que verifique que solo quien tiene el permiso correcto puede pasar la solicitud de un estado al siguiente.

### Crítico 2. Los adelantos se pueden descontar dos veces al contratista

- **Módulo:** Cubicaciones y CxP
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `src/components/features/cubicacion/CubicacionesPayrollSection.tsx (línea ~90)`
- **Qué pasa:** Cuando un contratista tiene varios adelantos y se vincula un corte a la nómina descontando adelantos, la app le resta el total completo del pago, pero en su registro interno solo marca como descontado el primer adelanto. Los demás quedan como si siguieran pendientes. En el próximo corte, la app vuelve a ofrecer descontar ese dinero, y si se acepta, al contratista se le quita el mismo adelanto dos veces. Además, si el corte se manda a nómina desde la página del contrato (en vez de desde la nómina), los adelantos no se descuentan nunca, así que el resultado depende de por dónde se haga la misma operación.
- **Cómo se arregla:** Usar el valor que devuelve addDeductedAmount para saber cuánto se aplicó a cada adelanto y repartir el resto entre los siguientes; y unificar los dos flujos de envío a nómina para que ambos descuenten adelantos.

### Crítico 3. Botones de acceso con contraseñas reales visibles para cualquiera, y el interruptor para ocultarlos no funciona

- **Módulo:** Estructura general
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/login/LoginSections.tsx (línea ~167)`
- **Qué pasa:** La pantalla de entrada muestra botones de 'entrar como Director General', 'Contabilidad', etc. a cualquier persona que abra la dirección de la app publicada, con las contraseñas reales incluidas dentro del programa que se descarga al navegador. Existe un interruptor pensado para apagar esto en producción, pero nunca se conectó: aunque se configure como apagado, los botones siguen apareciendo. Cualquier desconocido con la dirección puede entrar con acceso total de Director General y ver o cambiar nóminas, pagos y presupuestos. Este tema ya está anotado como pendiente (S3 en SEGURIDAD_PENDIENTE_2026-06-08.md) y se mantiene por decisión del dueño durante las pruebas, pero lo nuevo aquí es que el interruptor de seguridad documentado está roto: no hay forma de apagarlo sin cambiar el código.
- **Cómo se arregla:** Conectar el interruptor: mostrar los botones solo si ENABLE_TEST_QUICK_LOGIN es verdadero o si está en modo demo, y al salir de pruebas borrar las cuentas @nominapp.local y el archivo testUsers.ts.

### Crítico 4. Los adelantos descontados en nómina solo se registran en el primer adelanto: se puede descontar dos veces al contratista

- **Módulo:** Integración entre módulos
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `src/components/features/cubicacion/CubicacionesPayrollSection.tsx (línea ~87)`
- **Qué pasa:** Cuando un contratista tiene varios adelantos y se vincula un corte a la nómina, la app le descuenta el total de todos los adelantos en el pago, pero en los registros solo marca como 'descontado' el primer adelanto. Los demás quedan como si siguieran pendientes. La próxima vez que se vincule un corte, la app volverá a ofrecer descontar esos adelantos y el contratista pagaría dos veces el mismo dinero. Es plata real que se le quita de más a una persona.
- **Cómo se arregla:** En el bucle, restar de 'remaining' solo lo que realmente absorbió cada adelanto (addDeductedAmount ya devuelve el adelanto actualizado, se puede calcular cuánto aplicó) y seguir con el siguiente hasta agotar el total.

### Crítico 5. Cualquier usuario con sesión puede alterar el stock y los costos de cualquier proyecto

- **Módulo:** Inventario/Almacén
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `supabase/migrations/087_costo_salidas_almacen.sql (línea ~44)`
- **Qué pasa:** La función del servidor que registra entradas y salidas de almacén no verifica quién la llama: basta con estar conectado a la app (con cualquier rol, de cualquier empresa) para poder registrar movimientos en el inventario de cualquier proyecto, forzar stock negativo saltándose la aprobación del Director, e inflar o vaciar la columna GASTADO del presupuesto de proyectos ajenos. Las reglas de permisos que protegen las tablas de inventario quedan anuladas porque esta función corre con privilegios elevados. Los documentos de seguridad pendiente (S1–S6) no cubren este hueco.
- **Cómo se arregla:** Dentro de la función, antes de tocar datos, verificar que el usuario autenticado tiene la capacidad de almacén sobre el proyecto del material (y que el material pertenece al proyecto indicado), y solo aceptar el override si tiene la capacidad de Director.

### Crítico 6. Los descuentos de préstamos no restan nada del pago al contratista

- **Módulo:** Nómina
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `src/components/features/payroll/LoanDeductionSection.tsx (línea ~87)`
- **Qué pasa:** Cuando en un reporte de nómina se agrega una 'deducción de préstamo' a un contratista, la app la muestra en rojo con signo de menos y además rebaja la deuda del préstamo como si ya se hubiera cobrado. Pero el total general del reporte y el dinero a repartir en pagos NO bajan ni un peso: la app sigue pidiendo distribuir el monto completo. Resultado: el contratista puede recibir su pago íntegro Y su préstamo queda marcado como parcialmente pagado. La empresa pierde ese dinero dos veces y nadie se entera, porque hasta el reporte impreso muestra la deducción en negativo junto a un total que no la resta.
- **Cómo se arregla:** Restar las deducciones de préstamo del total a distribuir (o generar automáticamente una línea negativa de mano de obra para ese contratista), y reflejarlo en el reporte impreso.

### Crítico 7. Desvincular un corte de cubicación deja el cobro en la nómina y permite pagarlo dos veces

- **Módulo:** Nómina
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/cubicacion/CubicacionesPayrollSection.tsx (línea ~131)`
- **Qué pasa:** Al vincular un corte de cubicación a un reporte, la app agrega una línea de pago por ese trabajo. Pero si luego se usa el botón 'Desvincular', solo se quita la marca del corte: la línea de pago se queda en el reporte con su monto. El corte vuelve a aparecer como 'disponible' y se puede vincular de nuevo (al mismo reporte o a otro), creando una segunda línea de pago por el mismo trabajo. Escenario concreto: alguien vincula un corte de RD$63,000, se arrepiente, lo desvincula y lo vuelve a vincular; el reporte ahora paga RD$126,000 por un solo corte. También queda sin revertir el descuento de adelantos que se aplicó al vincular.
- **Cómo se arregla:** Al desvincular, borrar también las líneas de mano de obra creadas al vincular (guardando el id de la línea junto al corte) y revertir los adelantos descontados.

### Crítico 8. El modo sin internet es una promesa vacía: nada se guarda localmente

- **Módulo:** Sin internet / App instalable
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `src/hooks/useOfflineQueue.ts (línea ~9)`
- **Qué pasa:** Cuando no hay internet, la app muestra un aviso que dice: 'Las solicitudes y avances se guardan localmente y se sincronizan cuando vuelva la red'. Eso es falso hoy. Existe una 'libreta de pendientes' (cola offline) lista para recibir registros, pero ninguna pantalla de la app escribe en ella: crear una solicitud de compra, registrar un avance o un movimiento de inventario sin internet simplemente falla con un mensaje de error y el dato se pierde. Un trabajador en obra que confíe en el aviso puede perder registros del día completo. Además, el mecanismo de 'sincronizar en segundo plano' del service worker envía una señal que nadie escucha en la app.
- **Cómo se arregla:** Conectar los tres formularios a la cola: si no hay red, guardar el registro en la cola (offlineQueue.enqueue) y confirmar al usuario; o, mientras tanto, cambiar el texto del aviso para no prometer algo que no ocurre.

### Crítico 9. Cualquier usuario puede alterar inventario y montos de pago de todos los proyectos (funciones sin control de permisos)

- **Módulo:** Seguridad base de datos
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `supabase/migrations/080_atomic_multiuser_locks.sql (línea ~157)`
- **Qué pasa:** Hay dos 'atajos' internos de la base de datos: uno registra entradas/salidas de almacén y recalcula el stock y el costo de un material, y otro suma dinero a un pago. Ambos están abiertos a CUALQUIER persona con sesión iniciada, sin verificar si pertenece al proyecto ni si tiene permiso. Como estos atajos corren 'con privilegios del sistema', se saltan todas las reglas de aislamiento por proyecto. En la práctica, un empleado con acceso a un proyecto (o alguien que copie la forma de llamarlos) podría descuadrar el stock y los costos de materiales de cualquier obra, o inflar el monto a pagar de cualquier nómina. En el caso del pago, el tope del período lo envía el propio que llama, así que puede mandarlo vacío y saltarse el límite, aumentando un pago a voluntad.
- **Cómo se arregla:** Al inicio de cada función, validar con user_has_capability(p_project_id,'inventory_write')/override_stock y, para pagos, comprobar membresía y capacidad sobre el proyecto del payment; calcular el tope del período dentro de la función en vez de recibirlo del cliente.

---

## 🟠 ALTO — 47 temas

### Alto 1. Cualquier usuario con sesión puede enviar correos con cualquier contenido a cualquier dirección desde el remitente oficial

- **Módulo:** Aprobaciones y avisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/functions/send-email/index.ts (línea ~77)`
- **Qué pasa:** La función que manda correos de aviso acepta a cualquier usuario que haya iniciado sesión (no solo directores) y le deja elegir libremente los destinatarios (incluyendo correos externos a la empresa), el asunto y el cuerpo completo en HTML. En la práctica, cualquier empleado con acceso a la app puede mandar correos que parecen oficiales de la empresa (por ejemplo, un falso 'cambio de cuenta bancaria' a un suplidor) sin dejar rastro en la app. No hay límite de cantidad ni registro de quién envió qué.
- **Cómo se arregla:** Restringir la función: solo aceptar destinatarios internos (usuarios de la empresa), generar el HTML en el servidor a partir de plantillas fijas en lugar de aceptarlo del cliente, y registrar cada envío.

### Alto 2. Una aprobación se puede repetir o aplicar fuera de turno: falta el candado de estado en aprobar y rechazar

- **Módulo:** Aprobaciones y avisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~468)`
- **Qué pasa:** Las funciones de 'enviar a aprobación', 'liberar' y 'recibir' verifican en qué estado está la solicitud antes de actuar, pero 'aprobar' y 'rechazar' no lo hacen. Escenario concreto: dos directores tienen abierta la misma solicitud; uno la aprueba y el otro (con la pantalla desactualizada) la vuelve a aprobar eligiendo otra cotización, o peor: una orden ya colocada y con mercancía recibida puede ser 're-aprobada' (vuelve a 'pendiente de liberación' y cambia de suplidor) o 'rechazada' (queda rechazada aunque el material ya entró al almacén). Eso descuadra compras, almacén y pagos.
- **Cómo se arregla:** Agregar en approve() y reject() la misma verificación de estado que ya tienen las otras funciones (solo aprobar/rechazar si está 'pending_approval').

### Alto 3. Los avisos push de 'solicitud excede plan' nunca llegan: el servidor los rechaza y el error se traga en silencio

- **Módulo:** Aprobaciones y avisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~303)`
- **Qué pasa:** Cuando alguien crea una solicitud de compra que excede lo planificado, la app intenta avisar por push a los directores y a planificación. Pero la función del servidor que envía push solo acepta la orden si quien la dispara ES director. Como estas solicitudes las crea normalmente un comprador o residente (no director), el servidor responde 'prohibido' y la app solo anota el fallo en la consola del navegador: nadie se entera. Para este evento no hay correo de respaldo, así que la alerta simplemente no existe. Lo mismo pasa con el aviso push de 'mercancía recibida' que dispara el almacenista (ahí al menos sí sale el correo).
- **Cómo se arregla:** Hacer que estos avisos los envíe el servidor con el secreto interno (como ya hace el recordatorio de préstamos), o permitir en send-push a cualquier usuario autenticado cuando el destino son roles del proyecto; y agregar correo de respaldo al evento de excedente.

### Alto 4. El 'código de aprobación personal' es siempre 1234, vive en el navegador y no hay forma de cambiarlo

- **Módulo:** Aprobaciones y avisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/utils/approvalCode.ts (línea ~5)`
- **Qué pasa:** El código que se pide para aprobar órdenes de compra y cortes de contratista es '1234' para todo el mundo, se valida solo dentro del navegador (no en el servidor) y las pantallas hasta lo muestran ('En modo demo el código es: 1234'). Además, aunque el código tiene una función para cambiarlo, ninguna pantalla la usa: no existe manera de ponerle otro valor. Es decir, no protege nada. Este punto ya está documentado como S2 en SEGURIDAD_PENDIENTE_2026-06-08.md (se dejó así por estar en pruebas), pero conviene recordar que sigue abierto y que ni siquiera existe la pantalla para configurar un código real.
- **Cómo se arregla:** Antes de salir de pruebas: mover la validación al servidor (código por usuario guardado con hash en la base) y quitar el texto que lo revela; mientras tanto, al menos agregar la pantalla para cambiarlo.

### Alto 5. Un usuario marcado como 'Inactivo' sigue entrando y trabajando con todos sus permisos

- **Módulo:** Usuarios y permisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/authService.ts (línea ~23)`
- **Qué pasa:** En la pantalla de administración puedes marcar a una persona como 'Inactivo' (por ejemplo un empleado que ya no trabaja contigo). Pensarías que con eso queda bloqueado, pero no es así: esa persona puede seguir iniciando sesión con su correo y contraseña y usar la app con todos los permisos que tenía. El interruptor 'Activo/Inactivo' es solo un adorno visual; no le quita el acceso a nadie. Para de verdad sacar a alguien hoy habría que borrarle la cuenta o quitarle uno por uno sus roles en cada proyecto.
- **Cómo se arregla:** Al iniciar sesión y al refrescar el usuario, verificar is_active y rechazar/cerrar sesión si es false; además añadir 'is_active del usuario actual = true' como condición en las funciones helper de RLS para cortar el acceso a los datos.

### Alto 6. Quien administre usuarios puede darse a sí mismo poderes de finanzas (escalada de permisos)

- **Módulo:** Usuarios y permisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/migrations/032_rls_capability_based.sql (línea ~247)`
- **Qué pasa:** El permiso 'Administrar usuarios' se puede delegar a un asistente para que dé de alta gente y asigne roles. El problema es que con ese permiso, esa persona puede asignarse a sí misma (o a un cómplice) el rol 'Director General' o 'Contabilidad' dentro de un proyecto, y eso le entrega de golpe capacidades que nunca debía tener: emitir cheques, exportación bancaria, cuentas bancarias y préstamos. En otras palabras, el que administra usuarios puede convertirse en administrador de la plata sin que nadie lo apruebe, y hasta propagar ese poder a otros.
- **Cómo se arregla:** Separar 'administrar usuarios' de 'otorgar capacidades de finanzas': impedir por RLS que un usuario se asigne a sí mismo roles con caps sensibles, o exigir is_director real para asignar director_general/contabilidad, o registrar/aprobar esos cambios.

### Alto 7. Cada usuario puede modificar por su cuenta su propio sueldo y cuenta bancaria

- **Módulo:** Usuarios y permisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/migrations/051_rls_perf_and_grants.sql (línea ~34)`
- **Qué pasa:** La pantalla de administración solo deja al Director editar los datos del personal (sueldo, cédula, cuenta bancaria, puesto). Pero la regla de la base de datos es más floja que la pantalla: cualquier usuario con sesión puede, saltándose la app, cambiar directamente los datos de SU propia ficha, incluyendo su sueldo registrado y la cuenta bancaria asociada, o reactivarse a sí mismo. Es un riesgo de manipulación de datos de recursos humanos y de cobros.
- **Cómo se arregla:** Restringir la política de auto-edición a un puñado de campos no sensibles (o quitar la escritura propia y dejar solo lectura), y que sueldo, cuenta bancaria, cédula e is_active solo los pueda tocar el Director.

### Alto 8. Recibir la misma orden dos veces a la vez duplica el stock sin avisar

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~747)`
- **Qué pasa:** Si dos almacenistas registran la recepción de la misma orden al mismo tiempo (o si uno reintenta tras un fallo de internet a mitad del proceso), el material entra DOS veces al almacén pero el sistema anota que solo se recibió una vez. El candado que se puso en la base de datos para evitar 'recibir de más' no atrapa este caso, porque cada usuario guarda la cantidad recibida como un valor absoluto calculado con datos viejos, no como una suma. Resultado: stock inflado, costos de consumo mal valorados y nadie recibe un error. Este problema ya está anotado como pendiente en AUDITORIA_CODIGO_2026-06-08.md (punto R2) y en un comentario del propio código; la migración 086 lo mitigó solo parcialmente.
- **Cómo se arregla:** Mover toda la recepción (validar pendiente, sumar received_quantity y dar entrada al stock) a una sola función en la base de datos que lo haga todo-o-nada, con la suma hecha allí mismo (received_quantity = received_quantity + X) y bloqueo de fila.

### Alto 9. El control de presupuesto solo revisa el primer material de cada solicitud

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~216)`
- **Qué pasa:** Cuando una solicitud de compra trae varios materiales, el sistema solo compara contra el plan del presupuesto el PRIMER material de la lista. Los demás materiales pueden pedir cantidades muy por encima de lo planificado y la solicitud pasa como si nada, sin caer en 'pendiente de validación'. Además, al calcular cuánto queda disponible de una partida, solo se suma la cantidad del encabezado (que es la del primer material), así que lo comprometido por las otras líneas de todas las solicitudes nunca se descuenta. En la práctica, la regla de 'no comprar más de lo planificado' solo funciona para solicitudes de un solo material.
- **Cómo se arregla:** Evaluar el excedente y el comprometido línea por línea (recorriendo purchase_requisition_items), y marcar la solicitud como 'pendiente de validación' si CUALQUIER línea excede su partida.

### Alto 10. Las compras a crédito no aparecen en cuentas por pagar (y si se anotan a mano, el gasto se cuenta doble)

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~575)`
- **Qué pasa:** Cuando el administrador libera una orden y elige 'crédito', el sistema solo guarda esa palabra en la orden: nunca crea la deuda en el control financiero. Por eso el tablero y las alertas de 'cuentas por pagar' (que se calculan solo con las transacciones del control financiero) no saben que se le debe dinero al suplidor: se puede pasar la fecha de pago sin ninguna alerta. Y hay un segundo filo: si el contable registra a mano esa factura como transacción imputada a una partida, el presupuesto la contará dos veces (una como transacción y otra cuando el material salga del almacén). Ese riesgo de doble conteo está reconocido en un comentario del código (costoReal.ts) pero no hay ninguna protección.
- **Cómo se arregla:** Al liberar una orden a crédito, crear automáticamente la cuenta por pagar en el control financiero (marcada como originada por la orden, para no imputarla otra vez al presupuesto), o al menos incluir las órdenes a crédito no pagadas en el cálculo de CxP y sus alertas.

### Alto 11. La retención de garantía se muestra pero nunca se descuenta del pago

- **Módulo:** Cubicaciones y CxP
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/cubicacion/LinkToPayrollModal.tsx (línea ~41)`
- **Qué pasa:** El contrato promete retener un porcentaje (por ejemplo 10%) de cada pago como garantía hasta terminar la obra, y la app muestra por todos lados 'Retención' y 'Neto a pagar'. Pero cuando el corte se manda a la nómina, se agrega por el monto COMPLETO (cantidad × precio) y la retención solo queda escrita como una nota de texto. La nómina termina pagando el 100%, así que la empresa cree que tiene un fondo de garantía retenido que en realidad ya entregó. Tampoco existe ninguna función para liberar o devolver retenciones al final de la obra.
- **Cómo se arregla:** Al vincular un corte, agregar automáticamente una línea negativa de deducción por la retención (como ya se hace con los adelantos) y crear un registro para liberarla al recibir la obra.

### Alto 12. Desvincular un corte de la nómina no quita el cobro: riesgo de pago doble

- **Módulo:** Cubicaciones y CxP
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/cubicacion/CubicacionesPayrollSection.tsx (línea ~134)`
- **Qué pasa:** Al vincular un corte a una nómina se agrega una línea de cobro al reporte. Si luego se usa el botón 'Desvincular', el corte vuelve a quedar disponible pero la línea de cobro se queda en la nómina sin que nadie avise. La nómina sigue pagando ese monto, y como el corte quedó 'aprobado' otra vez, se puede vincular de nuevo (a la misma nómina u otra), creando una segunda línea de cobro: el mismo trabajo se paga dos veces.
- **Cómo se arregla:** Guardar en la línea de nómina el identificador del corte y, al desvincular, borrar esa línea automáticamente (o al menos avisar que hay que borrarla a mano).

### Alto 13. El contrato firmado no queda protegido: las firmas se pierden y los precios se pueden cambiar después

- **Módulo:** Cubicaciones y CxP
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/cubicacion/ContratoFirmaSections.tsx (línea ~122)`
- **Qué pasa:** La pantalla de firma del contrato dice 'La firma quedará registrada en este documento', pero las firmas solo viven en la memoria de la pantalla: si no se imprime en ese momento, al salir se pierden y no queda registro en ningún lado. Peor aún, después de firmar/imprimir el contrato, cualquiera puede editar los precios y cantidades de las partidas o borrar cortes ya aprobados con firma, y el sistema no lo impide ni deja rastro visible: el papel firmado y lo que dice la app pueden terminar diciendo cosas distintas en una disputa con el contratista.
- **Cómo se arregla:** Guardar las firmas en la base de datos junto con la fecha, y bloquear (o exigir confirmación especial para) cambios de partidas y borrado de cortes una vez firmado el contrato.

### Alto 14. El flujo de caja y los indicadores cuentan dos veces las compras a crédito

- **Módulo:** Cuentas y flujo de caja
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/cashFlowService.ts (línea ~130)`
- **Qué pasa:** Cuando se compra a crédito, la app registra la factura como un gasto. Después, cuando se paga esa factura, se registra otra transacción (así funciona el módulo de Cuentas por Pagar, que empareja la factura con su pago por el número de factura). El problema es que el flujo de caja y los indicadores de 'dinero disponible' y 'total incurrido' suman las dos: una compra de RD$100,000 a crédito que luego se paga aparece como RD$200,000 de gasto. Eso hace ver menos dinero disponible del real y gastos inflados, y puede llevar a decisiones equivocadas.
- **Cómo se arregla:** Definir una sola regla: las compras a crédito no cuentan como salida de dinero hasta que se pagan (o al revés), y excluir la contraparte en todos los cálculos de caja e incurrido.

### Alto 15. El flujo de caja solo reconoce ingresos si la categoría se llama exactamente '19 - DEPOSITOS'

- **Módulo:** Cuentas y flujo de caja
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/cashFlowService.ts (línea ~5)`
- **Qué pasa:** Para saber si una transacción es un ingreso (depósito) o un gasto, el flujo de caja compara el nombre de la categoría con el texto exacto '19 - DEPOSITOS'. Si el proyecto usa otro nombre (los datos de ejemplo de la propia app tienen un proyecto con 'T12 - DEPOSITOS'), o alguien escribe 'Depósitos' con tilde, ese dinero que ENTRÓ se cuenta como dinero que SALIÓ: el flujo de caja muestra ingresos en cero y gastos inflados. Este problema ya se reportó en la auditoría del 8 de junio (punto N2) y se marcó como corregido, pero solo se arregló en una parte del código; el flujo de caja, el panel del director, los reportes mensuales y las notificaciones siguen con la comparación exacta.
- **Cómo se arregla:** Usar la misma función tolerante isDepositCategory() en todos los archivos que hoy comparan el texto exacto.

### Alto 16. Corregir o cancelar un préstamo deja el movimiento bancario desactualizado y sin forma de arreglarlo

- **Módulo:** Cuentas y flujo de caja
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/loanService.ts (línea ~230)`
- **Qué pasa:** Al crear un préstamo, la app anota la salida del dinero en la cuenta bancaria elegida. Pero si después se edita el préstamo (cambiar el monto, la fecha o la cuenta de desembolso) o se cancela, ese movimiento bancario queda igual que antes: la cuenta sigue mostrando que salió el monto viejo, desde la cuenta vieja. Y como los movimientos generados por préstamos no se pueden corregir ni borrar desde la pantalla (solo los manuales), el saldo de la cuenta queda mal para siempre; lo mismo pasa si se marca una cuota como cobrada por error. La única salida es anotar movimientos manuales 'de ajuste' que ensucian el historial.
- **Cómo se arregla:** Cuando se edite o cancele un préstamo (o se deshaga un cobro), actualizar o revertir el movimiento bancario asociado usando referencia_id, o al menos permitir corregirlo con permiso de banco.

### Alto 17. Pagar una factura a crédito hace que el gasto se cuente dos veces en los indicadores

- **Módulo:** Cálculos de dinero
- **Estado:** ✅ Confirmado (doble revisión)
- **Dónde:** `src/utils/financialCalculations.ts (línea ~47)`
- **Qué pasa:** El sistema espera que cuando pagas una factura comprada a crédito registres una segunda línea (el pago con cheque o efectivo, con el mismo número de factura). Pero al calcular 'Cash disponible' y 'Total incurrido' se suman como gasto TANTO la compra a crédito COMO su pago. Ejemplo: depositas RD$100,000, compras materiales a crédito por RD$40,000 y luego los pagas con cheque: la app dice que solo te quedan RD$20,000 (cuando en realidad tienes RD$60,000) y que has gastado RD$80,000 (cuando gastaste RD$40,000). Si al pago además le pones capítulo de presupuesto, la columna GASTADO del presupuesto también se infla al doble. Esto empeora con cada factura a crédito que se paga.
- **Cómo se arregla:** Decidir una sola convención: que la compra a crédito cuente como gasto y sus pagos vinculados (mismo número de factura y proveedor) se excluyan de egresos e incurrido, o al revés.

### Alto 18. El 'Disponible neto' resta dos veces las deudas y los cheques en tránsito

- **Módulo:** Cálculos de dinero
- **Estado:** ✅ Confirmado (doble revisión)
- **Dónde:** `src/utils/financialCalculations.ts (línea ~82)`
- **Qué pasa:** El indicador 'Disponible neto' se calcula como Cash disponible menos cuentas por pagar menos cheques en tránsito. Pero el 'Cash disponible' YA descontó esas compras a crédito y esos cheques (los cuenta como egresos), así que se restan dos veces. Ejemplo: depositas RD$100,000, compras a crédito RD$40,000 (sin pagar) y emites un cheque de RD$10,000 (sin cobrar): la app muestra Disponible neto RD$0 y enciende la alerta roja 'SOLICITAR FONDOS', cuando en realidad, después de pagar todo, quedarían RD$50,000. Esto puede llevar a pedir fondos al cliente o frenar compras sin necesidad.
- **Cómo se arregla:** Definir qué significa cada tarjeta y restar cada compromiso una sola vez; por ejemplo, que 'Cash disponible' solo reste salidas de dinero efectivas y que 'Disponible neto' reste encima lo que aún se debe.

### Alto 19. La tarjeta 'CxP pendiente' del Panel nunca baja aunque se paguen las facturas

- **Módulo:** Cálculos de dinero
- **Estado:** ✅ Confirmado (doble revisión)
- **Dónde:** `src/services/dashboardService.ts (línea ~36)`
- **Qué pasa:** El Panel principal muestra cuánto se debe a proveedores, pero la consulta que trae las transacciones NO pide el número de factura ni el proveedor, que son justo los datos que se usan para descontar los pagos. Resultado: para el Panel, toda compra a crédito queda 'pendiente' para siempre, aunque ya esté pagada. Ejemplo: compras a crédito RD$50,000 y las pagas por completo; el Control Financiero muestra CxP RD$0 pero el Panel sigue mostrando RD$50,000. Dos pantallas dan números distintos y la deuda del Panel solo crece. La prueba automática no lo detecta porque sus datos simulados sí incluyen esos campos.
- **Cómo se arregla:** Agregar invoice_number y supplier_id a la consulta del Panel y añadir un caso de prueba con una factura pagada.

### Alto 20. Escribir cantidades con 3 decimales al estilo dominicano las multiplica por mil

- **Módulo:** Cálculos de dinero
- **Estado:** ✅ Confirmado (doble revisión)
- **Dónde:** `src/utils/decimalInput.ts (línea ~89)`
- **Qué pasa:** El lector de números que usan los formularios de cubicación, nómina, inventario y compras interpreta la coma como decimal solo si le siguen 1 o 2 dígitos; con 3 dígitos la trata como separador de miles. Ejemplo real de construcción: una cantidad de '2,375' metros cúbicos se guarda como 2375, y '0,125' (o incluso '0.125', que no es ambiguo) se convierte en 125. Multiplicado por el precio unitario, una partida de RD$2,375 puede convertirse en RD$2,375,000 sin ningún aviso. Verifiqué el comportamiento ejecutando el código: '0,125' → 125, '2,375' → 2375, '0.125' → 125.
- **Cómo se arregla:** Tratar como decimal todo caso no ambiguo (por ejemplo, cuando el grupo inicial es '0' o cuando solo hay una coma y el resultado con miles carece de sentido) y/o pedir confirmación visual mostrando el número interpretado.

### Alto 21. El guardado 'sin internet' no existe: la app promete guardar localmente pero nunca guarda nada

- **Módulo:** Estructura general
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `src/utils/offlineQueue.ts (línea ~57)`
- **Qué pasa:** Cuando se va el internet, la app muestra un aviso que dice 'Las solicitudes y avances se guardan localmente y se sincronizan cuando vuelva la red'. Eso es falso: existe toda la maquinaria para reenviar cambios guardados (la cola, el botón Sincronizar, el contador de pendientes), pero ninguna pantalla de la app deposita nada en esa cola jamás. Si un encargado en la obra crea una solicitud de compra o registra un avance sin señal, la operación simplemente falla y el dato se pierde, aunque el aviso le hizo creer que quedó guardado. Para una app pensada para usarse en obra con mala señal, esto es una pérdida de datos con falsa sensación de seguridad.
- **Cómo se arregla:** Conectar los formularios de solicitud, avance e inventario para que, al fallar por falta de red, guarden la operación en la cola; o quitar el aviso que promete guardado local mientras no exista.

### Alto 22. La memoria del navegador guarda respuestas de la base de datos y puede mostrárselas al siguiente usuario del mismo aparato

- **Módulo:** Estructura general
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `public/sw.js (línea ~238)`
- **Qué pasa:** La app guarda en el navegador una copia de todas las lecturas de la base de datos (nóminas, pagos, cuentas) durante 5 minutos para funcionar más rápido. El problema es que esa copia es una sola para todo el aparato: no distingue quién está conectado y no se borra al cerrar sesión. En una tableta compartida en la obra, si el administrador consulta las finanzas y luego entra un almacenista con permisos limitados, durante esos 5 minutos el almacenista puede recibir las pantallas con los datos que vio el administrador. Además, esta misma copia hace que después de guardar algo la pantalla siga mostrando la versión vieja hasta por 5 minutos, incluso recargando la página (coincide con el síntoma conocido U3 de 'listas que no se refrescan').
- **Cómo se arregla:** No cachear las respuestas de Supabase (o cachearlas solo como respaldo cuando no hay red), y borrar la caché de API al cerrar sesión.

### Alto 23. Las pantallas de Finanzas y Cuentas por Pagar se abren escribiendo la dirección, aunque el rol no lo permita

- **Módulo:** Estructura general
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/lib/router.tsx (línea ~97)`
- **Qué pasa:** El menú lateral esconde 'Finanzas', 'Cuentas por Pagar' y 'Calendario' a los usuarios sin permiso financiero, pero las puertas de esas pantallas quedaron sin candado: cualquier usuario con sesión puede entrar escribiendo la dirección (por ejemplo /finanzas o /cxp). Y las reglas de la base de datos sí le entregan los datos, porque para lecturas solo exigen ser miembro del proyecto, no tener rol financiero. Resultado: un almacenista o un supervisor de un proyecto puede ver todos los movimientos de dinero, deudas a suplidores y flujo de caja de ese proyecto, algo que el sistema de roles pretende impedir.
- **Cómo se arregla:** Envolver /finanzas, /cxp (y sus subrutas) y /calendario con el mismo candado de capacidad que usa el menú, y a mediano plazo afinar las reglas de lectura de la base para datos financieros.

### Alto 24. La retención de los cortes de cubicación no se descuenta: la nómina paga el monto completo aunque la app diga 'Neto a pagar'

- **Módulo:** Integración entre módulos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/cubicacion/CubicacionesPayrollSection.tsx (línea ~63)`
- **Qué pasa:** Cada contrato de cubicación retiene un porcentaje (ej. 5%) de cada corte como garantía hasta la entrega final. La app calcula esa retención y hasta muestra 'Neto a pagar: monto − retención' en el diálogo de confirmación. Pero al enviar el corte a la nómina, agrega el monto COMPLETO (sin restar la retención); la retención solo queda escrita como nota de texto. Resultado: al contratista se le paga el 100% y la 'garantía retenida' que muestra el contrato es ficticia. Si además al final de la obra se paga la retención acumulada, se pagaría dos veces.
- **Cómo se arregla:** Al vincular un corte, agregar una segunda línea negativa por la retención (como se hace con los adelantos), y crear un flujo para liberar/pagar las retenciones acumuladas al cierre del contrato.

### Alto 25. Desvincular un corte de la nómina no quita su monto del reporte: al re-vincular se cobra doble

- **Módulo:** Integración entre módulos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/cubicacion/CubicacionesPayrollSection.tsx (línea ~131)`
- **Qué pasa:** Al vincular un corte, la app agrega su monto como línea de trabajo en la nómina. Pero al usar el botón 'Desvincular', solo cambia el estado del corte de vuelta a 'aprobado': la línea con el dinero se queda dentro de la nómina. El corte vuelve a aparecer como disponible y, si alguien lo vincula de nuevo (o a otro reporte), se agrega una segunda línea con el mismo monto. La nómina terminaría pagando dos veces el mismo trabajo, salvo que alguien se acuerde de borrar la línea vieja a mano.
- **Cómo se arregla:** Al desvincular, buscar y borrar la línea de mano de obra creada al vincular (y la de deducción de adelantos si aplica), o bloquear la re-vinculación mientras exista esa línea.

### Alto 26. Las órdenes de compra nunca llegan a Cuentas por Pagar ni al flujo de caja: una compra a crédito desaparece del dinero

- **Módulo:** Integración entre módulos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/cashFlowService.ts (línea ~23)`
- **Qué pasa:** Cuando el administrador libera una orden de compra y elige 'Crédito' o 'Contado', ese dato solo se guarda para mostrarse en pantalla. La deuda con el suplidor NO aparece en Cuentas por Pagar (que solo se alimenta de lo que se escribe a mano en Control Financiero) y el dinero de la compra NO aparece en el flujo de caja. Si nadie re-escribe la compra a mano como transacción, la empresa puede creer que debe menos de lo real; y si sí la escriben a mano, el propio código advierte que existe riesgo de contar el gasto dos veces. El comentario del código promete que el flujo de caja incluye las 'OC liberadas', pero la implementación no las incluye.
- **Cómo se arregla:** Al liberar (o recibir) una orden a crédito, crear automáticamente su registro en cuentas por pagar (una transacción a crédito con el total de la cotización aprobada) y sumar las OC liberadas al flujo de caja, como ya promete el comentario.

### Alto 27. Las deducciones de préstamos no reducen el total a pagar de la nómina: se puede pagar completo y aun así abonar al préstamo

- **Módulo:** Integración entre módulos
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `src/components/features/payroll/LoanDeductionSection.tsx (línea ~87)`
- **Qué pasa:** Cuando se agrega una 'deducción de préstamo' en un reporte de nómina, el saldo del préstamo del contratista baja de inmediato. Pero el total del reporte (el número que se usa para repartir los pagos y para el flujo de caja) NO baja. Es decir: la app permite distribuir y pagar al contratista el 100% de su dinero y, a la vez, registra que ya abonó a su préstamo. El dinero no cuadra por los dos lados: el préstamo aparece cobrado sin que ese dinero se haya retenido, y el flujo de caja muestra una salida mayor a la real.
- **Cómo se arregla:** Restar las deducciones de préstamo del total a distribuir (o generarlas como línea negativa en la nómina, como se hace con los adelantos), para que lo que se paga al contratista y lo que se abona al préstamo cuadren.

### Alto 28. El costo promedio de los materiales se corrompe tras reversas de recepción o stock negativo, y ese costo va directo al presupuesto

- **Módulo:** Inventario/Almacén
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/migrations/087_costo_salidas_almacen.sql (línea ~120)`
- **Qué pasa:** Dos situaciones dejan el precio promedio de un material mal calculado para siempre: (1) si se recibe mercancía con un precio equivocado y luego se revierte la recepción, la reversa devuelve el stock pero NO devuelve el precio promedio al valor anterior; (2) si el stock quedó negativo (cosa que la propia reversa provoca a propósito cuando ya se consumió material), la fórmula del promedio mezcla cantidades negativas y puede dar precios disparatados. Como desde la migración 087 cada salida de almacén se carga al presupuesto usando ese promedio, la columna GASTADO queda inflada o desinflada sin que nadie lo note. Ejemplo concreto: stock -80 a RD$200 (tras una reversa), se reciben 81 unidades a RD$210 → el promedio queda en RD$1.010 por unidad (casi 5 veces el precio real) y cada salida posterior carga eso al presupuesto.
- **Cómo se arregla:** En la fórmula del promedio, tratar el stock negativo como cero (usar GREATEST(stock,0)), y al revertir una recepción restaurar el costo promedio que tenía el material antes de esa recepción.

### Alto 29. El descuento de lotes va fuera de la operación segura, sin bloqueo y con errores ignorados

- **Módulo:** Inventario/Almacén
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/inventoryService.ts (línea ~351)`
- **Qué pasa:** Cuando sale material, el stock total se descuenta de forma segura en la base de datos, pero el descuento de los lotes (para saber qué partidas de compra y vencimientos quedan) se hace después, desde el navegador, uno por uno. Si la conexión se cae a mitad, si dos personas despachan a la vez el mismo material, o si la base rechaza la actualización por permisos, los lotes quedan diciendo que hay más material del real y nadie recibe aviso. Además, al revertir una recepción, se descuentan los lotes más antiguos aunque pertenezcan a OTRA orden de compra distinta a la que se está devolviendo. Este problema ya está listado como conocido (R6) en AUDITORIA_CODIGO_2026-06-08.md, pero sigue sin corregirse y tiene un agravante no listado: los errores de escritura se ignoran.
- **Cómo se arregla:** Mover el descuento de lotes dentro de la misma función de base de datos que descuenta el stock (todo o nada), y en la reversa descontar solo los lotes creados por esa orden.

### Alto 30. La retención de los contratistas se paga completa aunque la app diga 'Neto a pagar'

- **Módulo:** Nómina
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/cubicacion/LinkToPayrollModal.tsx (línea ~45)`
- **Qué pasa:** Los contratos de cubicación tienen una retención (por ejemplo 5-8%) que según el contrato firmado en la app 'se liberará al completar los trabajos'. Al enviar un corte a la nómina, la pantalla muestra claramente 'Neto a pagar: monto − retención', pero lo que realmente se agrega al reporte es el monto COMPLETO (cantidad × precio); la retención solo queda anotada como comentario. Es decir, se le paga al contratista el dinero que se supone quedaba retenido como garantía. En cada corte la empresa entrega de más el valor de la retención y pierde su garantía de terminación.
- **Cómo se arregla:** Agregar a la nómina el monto neto (o el monto completo más una línea negativa de retención) y crear un registro de retenciones por liberar al final de la obra.

### Alto 31. Pagar la nómina no descuenta el dinero de las cuentas bancarias

- **Módulo:** Nómina
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/paymentDistributionService.ts (línea ~158)`
- **Qué pasa:** En la distribución de pagos se elige de qué cuenta del banco sale cada pago ('Cuenta origen') y luego se marca como 'Completado'. Pero ese paso solo cambia la etiqueta: nunca se anota la salida de dinero en la cuenta. El módulo de cuentas bancarias calcula el saldo sumando y restando movimientos, y los únicos movimientos automáticos que existen son los de préstamos. Resultado: después de pagar una nómina de, por ejemplo, RD$500,000 por transferencia, la app sigue mostrando ese medio millón como disponible en la cuenta, y las decisiones de caja se toman con un saldo falso.
- **Cómo se arregla:** Al marcar un pago como completado con cuenta de origen, crear automáticamente un movimiento de débito en esa cuenta (y borrarlo/revertirlo si el pago se cancela).

### Alto 32. Al descontar adelantos, solo el primer adelanto queda registrado como descontado

- **Módulo:** Nómina
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `src/components/features/cubicacion/CubicacionesPayrollSection.tsx (línea ~87)`
- **Qué pasa:** Cuando se vincula un corte y se aceptan descontar los adelantos pendientes del contratista, la nómina le resta el total correcto de una vez, pero en el registro de adelantos solo el primero queda marcado como descontado; los demás siguen apareciendo con saldo pendiente. Escenario: un contratista tiene dos adelantos, uno de RD$10,000 y otro de RD$5,000. Se le descuentan RD$15,000 en la nómina, pero el segundo adelanto sigue mostrando RD$5,000 pendientes. En el próximo corte la app vuelve a proponer descontarle esos RD$5,000, y si se acepta, al contratista se le cobra dos veces el mismo adelanto.
- **Cómo se arregla:** Usar lo que devuelve addDeductedAmount para restar del total solo lo realmente aplicado a cada adelanto y seguir con el siguiente hasta agotar el descuento.

### Alto 33. El Calendario de Pagos muestra deudas ya pagadas y usa la fecha equivocada

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/useCalendarEvents.ts (línea ~138)`
- **Qué pasa:** El Calendario de Pagos marca como "pendiente" y "vencida" toda compra a crédito, aunque ya se haya pagado: nunca resta los pagos que sí están registrados en el sistema (la pantalla de Cuentas por Pagar sí lo hace). Además, coloca la deuda en la fecha en que se compró, no en la fecha en que hay que pagar, así que una compra a "crédito 30 días" aparece como vencida al día siguiente de comprar. Resultado: el calendario y su contador de "vencidos" exageran las deudas y Cristian puede creer que debe dinero que ya pagó.
- **Cómo se arregla:** Reusar la misma lógica de Cuentas por Pagar (calcCxPDetails) para mostrar solo lo realmente pendiente, y usar la fecha de vencimiento (due_date) para ubicar el evento y marcar vencidos.

### Alto 34. Si una foto de la bitácora falla al subirse, se pierde sin avisar a nadie

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/bitacora/useBitacoraPage.ts (línea ~101)`
- **Qué pasa:** Al guardar una entrada de bitácora con fotos, cada foto se sube una por una; si alguna falla (mala señal en la obra, archivo problemático), el sistema la descarta en silencio: el registro se guarda, el formulario se cierra y nadie se entera de que la foto no quedó. Las fotos de bitácora son la evidencia de lo que pasó en la obra ese día (incidentes, avances) y ese momento no se puede volver a fotografiar. Es pérdida de información sin aviso.
- **Cómo se arregla:** Contar las fotos que fallaron y mostrar un aviso claro ("2 de 3 fotos no se pudieron subir, reinténtalo"), manteniendo las fallidas en el formulario para reintentar.

### Alto 35. Las listas muestran datos viejos hasta 5 minutos después de guardar (caché del service worker sobre la base de datos)

- **Módulo:** Sin internet / App instalable
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `public/sw.js (línea ~238)`
- **Qué pasa:** La app guarda en el dispositivo una copia de TODAS las lecturas a la base de datos (Supabase) y la reutiliza durante 5 minutos, aunque haya internet. Escenario concreto: un usuario registra un avance, la app dice 'Avance registrado' y recarga la lista, pero la lista llega desde la copia guardada (que aún no tiene el avance nuevo), así que el registro 'desaparece'. El usuario cree que falló y lo vuelve a guardar, creando duplicados (en avances de partidas eso infla la cubicación y lo que se paga al contratista). Esto afecta a todos los módulos: nóminas, compras, inventario, aprobaciones, etc., y ni siquiera recargar la página lo arregla dentro de esos 5 minutos.
- **Cómo se arregla:** No cachear las lecturas a Supabase con 'stale-while-revalidate'; usar 'red primero, caché solo si no hay internet' (network-first) para /rest/v1/ y /functions/v1/.

### Alto 36. Datos sensibles quedan guardados en el dispositivo y sobreviven al cierre de sesión; otro usuario puede verlos

- **Módulo:** Sin internet / App instalable
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `public/sw.js (línea ~169)`
- **Qué pasa:** Las respuestas de la base de datos (nóminas con sueldos, préstamos, cuentas bancarias) quedan copiadas en el almacenamiento del navegador sin cifrar. Al cerrar sesión, esas copias NO se borran. En un dispositivo compartido (una tablet de obra, algo muy común), si un usuario con menos permisos entra dentro de los 5 minutos siguientes, el service worker puede entregarle las respuestas guardadas del usuario anterior, porque la copia se busca solo por la dirección de la consulta, sin fijarse en quién está conectado. Además, la 'libreta de pendientes' offline tampoco se vacía al cerrar sesión.
- **Cómo se arregla:** Al cerrar sesión, borrar el caché de API del service worker (caches.delete del caché 'nominaapp-api-\*') y vaciar la cola offline; y no cachear respuestas que llevan credenciales, o incluir al usuario en la clave del caché.

### Alto 37. Los pagos por nómina y los cobros de cuotas no se cruzan: el saldo puede salir más alto que la deuda real

- **Módulo:** Préstamos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/loanService.ts (línea ~50)`
- **Qué pasa:** Un contratista puede pagar su préstamo de dos formas: se le descuenta de la nómina, o paga una cuota directamente. La app guarda cada forma por separado y, para calcular cuánto ha pagado, toma solo la cifra MAYOR de las dos (no las suma, para no contar dos veces lo mismo). El problema: si el contratista pagó la cuota 1 en efectivo (RD$1,100) y la cuota 2 se le descontó de nómina (RD$1,100), pagó RD$2,200 pero la app muestra solo RD$1,100 pagados — el saldo sale RD$1,100 más alto y se le podría cobrar de más. Además, un descuento de nómina nunca marca la cuota como pagada, así que la cuota sigue apareciendo 'Vencida' y el aviso diario al celular sigue reclamando un dinero que ya se cobró. Peor aún: la pantalla de nómina y la de cubicaciones calculan el saldo contando SOLO los descuentos de nómina (ignoran las cuotas cobradas), por lo que permiten descontar de la nómina dinero que ya se pagó por cuotas. La auditoría del 8 de junio ya señaló algo parecido (punto N4); el arreglo aplicado (tomar el mayor) alivia pero no resuelve el fondo del problema.
- **Cómo se arregla:** Unificar los dos caminos: que un descuento de nómina marque automáticamente las cuotas cubiertas como pagadas (o llevar un solo registro de pagos), y que todas las pantallas calculen el saldo con la misma fórmula.

### Alto 38. Préstamos mensuales desembolsados a fin de mes generan fechas de cuotas mal calculadas (se salta un mes)

- **Módulo:** Préstamos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/loanService.ts (línea ~34)`
- **Qué pasa:** Si un préstamo mensual se desembolsa el día 29, 30 o 31, las fechas de las cuotas salen mal. Ejemplo comprobado ejecutando el código: préstamo desembolsado el 31 de enero de 2026 → la cuota 1 cae el 3 de MARZO (no a fin de febrero), la cuota 2 el 31 de marzo. Resultado: en febrero la app no espera ningún cobro y en marzo aparecen dos cuotas casi seguidas. Pasa también si la 'fecha de primera cuota' elegida es un 31: la siguiente cae el 1 del mes subsiguiente. Además, en un celular o computadora con zona horaria adelantada a la de República Dominicana (por ejemplo España), TODAS las fechas del cronograma se corren un día hacia atrás, incluso la fecha exacta de primera cuota que eligió el usuario (comprobado: se elige 20/06 y se guarda 19/06).
- **Cómo se arregla:** Calcular las fechas con aritmética de calendario segura: si el día no existe en el mes destino, usar el último día de ese mes; y armar la fecha como texto sin pasar por conversión de zona horaria.

### Alto 39. El total del presupuesto se calcula distinto en cada pantalla: la página del proyecto, el panel del director y las alertas pueden mostrar RD$0

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/useProjectDetailPage.ts (línea ~140)`
- **Qué pasa:** Cuando el presupuesto se importa desde Excel, el valor queda guardado en las subpartidas (cantidad × precio), y el 'monto presupuestado' de cada partida queda en 0 para siempre (nada lo actualiza al agregar o editar subpartidas). La pantalla de Presupuesto y el reporte mensual sí suman las subpartidas, pero la página del proyecto, el panel del Director y las alertas automáticas solo suman ese monto que quedó en 0. Resultado: el proyecto puede mostrar 'Presupuesto total RD$0' en unas pantallas y millones en otra, los indicadores del director salen mal, y la alerta de 'Presupuesto excedido' NUNCA se dispara para proyectos importados desde Excel porque el código salta los proyectos con presupuesto 0.
- **Cómo se arregla:** Crear una sola función compartida de 'presupuesto total' (suma de subpartidas con respaldo al monto de la partida) y usarla en la página del proyecto, el panel del director y las alertas.

### Alto 40. La importación de Excel lee mal los números con comas de miles: '1,500' se convierte en 1.5

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/utils/excel.ts (línea ~43)`
- **Qué pasa:** Si en el Excel una cantidad o un precio viene como texto con comas de miles (por ejemplo '1,500' o '1,000,000', que es justo el formato que la propia ventana de importación muestra como ejemplo), la app lo convierte en 1.5 o en 1. El presupuesto queda mal por un factor de mil o de un millón, sin ningún aviso de error. Afecta tanto la importación del presupuesto de obra como la del presupuesto de mercado.
- **Cómo se arregla:** Detectar el formato: si hay comas y punto decimal, quitar las comas; si solo hay una coma con 1-2 decimales, tratarla como decimal. Y avisar en la vista previa cuando un número parezca sospechoso.

### Alto 41. El historial de versiones del presupuesto nunca se guarda: la función existe pero nadie la llama

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/budgetVersionService.ts (línea ~43)`
- **Qué pasa:** La base de datos tiene una tabla para guardar 'fotos' del presupuesto cada vez que se cambia después de aprobado (la regla 7.7 del proyecto), y el código para crearlas y listarlas existe y está probado. Pero ninguna pantalla ni acción de la app lo usa: se puede cambiar el monto de una partida, importar un Excel encima o borrar partidas sin que quede ninguna versión guardada, y tampoco hay pantalla para ver versiones. Si alguien cambia el presupuesto por error, no hay forma de saber cómo estaba antes ni de volver atrás. Los documentos de auditoría solo mencionan un detalle menor de la numeración (R1), no que la función esté completamente desconectada.
- **Cómo se arregla:** Llamar a snapshot() antes de cambios grandes (editar montos, importar Excel, borrados masivos) y agregar una vista simple de versiones con opción de comparar/restaurar.

### Alto 42. Se puede borrar una subpartida que ya tiene gasto y avances registrados, sin ningún aviso

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/budget/BudgetPartidaRow.tsx (línea ~209)`
- **Qué pasa:** El botón de basura de cada subpartida funciona aunque esa subpartida ya tenga dinero gastado (la propia fila lo muestra en la columna Gastado). Al borrarla: (1) el gasto imputado a esa subpartida pierde el vínculo y desaparece del desglose por subpartida, (2) los avances de obra registrados sobre ella (usados en cubicaciones) se borran de la base de datos en cascada y no se pueden recuperar, y (3) el presupuesto de la partida baja pero el gasto se queda, distorsionando la columna Diferencia. El mensaje de confirmación solo dice '¿Eliminar esta subpartida?' sin advertir nada de esto.
- **Cómo se arregla:** Antes de borrar, consultar si la subpartida tiene gasto o avances; si los tiene, bloquear el borrado o pedir una confirmación explícita que explique lo que se perderá.

### Alto 43. El panel muestra cuentas por pagar infladas: nunca descuenta los pagos ya realizados

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/dashboardService.ts (línea ~36)`
- **Qué pasa:** La tarjeta "CxP pendientes" del panel principal suma todas las compras a crédito completas, sin restar los abonos que ya se pagaron. Para descontar un pago, el cálculo necesita saber el número de factura y el proveedor, pero la consulta del panel no trae esos dos datos, así que trata cada compra a crédito como si estuviera 100% pendiente. Resultado: el panel muestra una deuda mayor que la real y nunca coincide con la pantalla de CxP (que sí descuenta los pagos). Lo mismo pasa en el tablero del Director: su columna "CxP" suma todo el crédito sin restar pagos. Cristian puede creer que debe mucho más de lo que realmente debe.
- **Cómo se arregla:** Agregar `invoice_number` y `supplier_id` a las consultas del panel y del director para que el cálculo pueda descontar los pagos, igual que la pantalla de CxP.

### Alto 44. El reporte mensual en PDF presenta cifras de un solo mes como si fueran del proyecto completo

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/reports/monthlyReportData.ts (línea ~500)`
- **Qué pasa:** En el PDF mensual, las casillas "Invertido total", "Variance", "% Avance" y el número grande "Total del proyecto" se calculan solo con las nóminas y transacciones del mes elegido, pero las etiquetas dicen que son totales del proyecto. Ejemplo real: un proyecto con presupuesto de RD$10 millones que ya invirtió RD$5 millones en un año mostraría en el reporte de junio "Invertido total: RD$400,000" (solo junio), "% Avance: 4%" y un "Variance" verde enorme, como si el proyecto casi no hubiera gastado. Es información engañosa para tomar decisiones o mostrar a terceros, y contradice al "Reporte para cliente", que sí calcula el acumulado completo.
- **Cómo se arregla:** Calcular esas casillas con el acumulado del proyecto hasta el fin del mes reportado (como hace el reporte para cliente), y mostrar aparte lo invertido en el mes.

### Alto 45. La exportación "Exportar todo a CSV" (el respaldo) se corta en silencio a ~1000 filas por tabla

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/exportService.ts (línea ~122)`
- **Qué pasa:** El botón de Ajustes "Exportar todo a CSV" se ofrece como respaldo de los datos, pero descarga cada tabla con una sola consulta y el servidor devuelve como máximo ~1000 filas por consulta. Cuando una tabla pase de 1000 registros (transacciones, líneas de nómina y asistencia lo harán pronto), el respaldo saldrá incompleto sin ningún aviso: el resumen incluso mostrará "1000 filas ok". Un respaldo incompleto es peligroso justamente el día que se necesita. Este problema ya estaba anotado en AUDITORIA_CODIGO_2026-06-08.md (U5): se arregló para el respaldo en Excel (que sí pagina) pero NO para este export CSV.
- **Cómo se arregla:** Reutilizar la misma descarga por páginas del respaldo Excel (fetchAll) dentro de exportService para que el ZIP traiga todas las filas.

### Alto 46. Los tableros y reportes consolidados leen los datos sin paginar: los totales saldrán incompletos al crecer los datos

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/directorService.ts (línea ~52)`
- **Qué pasa:** Casi todas las consultas que alimentan el panel principal, el tablero del Director, el Resumen Financiero y los PDF traen los datos de una sola vez, y el servidor entrega máximo ~1000 filas por consulta. En cuanto haya más de 1000 transacciones (o nóminas, o partidas), los totales de "Ejecutado", "CxP", "Gasto mensual" y los reportes en PDF quedarán cortos sin ningún aviso. La auditoría anterior (N3) marcó esto como corregido, pero el arreglo fue subir un solo límite a 5000 en una sola consulta; ese pedido de 5000 también puede ser recortado por el tope del servidor, y el resto de consultas quedó sin tocar. Solo el respaldo en Excel pagina correctamente.
- **Cómo se arregla:** Crear una función común de lectura por páginas (como fetchAll del respaldo Excel) y usarla en dashboardService, directorService y transactionService, o mover estas sumas al servidor (vistas/consultas agregadas).

### Alto 47. Dos archivos con el número 083 y dos con el 084: la reinstalación de la base puede fallar o dejar sin aplicar el candado de los movimientos de dinero

- **Módulo:** Seguridad base de datos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/migrations/083_rls_harden_movements_installments.sql (línea ~1)`
- **Qué pasa:** Existen dos archivos de cambios numerados 083 y dos numerados 084. El método de instalación documentado ('subir cambios con supabase db push') usa ese número como identificador único, así que al montar la base de datos desde cero (una copia nueva, recuperación ante desastre, o un ambiente de pruebas) el proceso choca con números repetidos: puede fallar por completo o aplicar solo uno de cada par. Lo grave es que uno de esos archivos es justamente el que cierra un hueco de seguridad: pone candado a los 'movimientos de cuenta bancaria' y a las 'cuotas de préstamo'. Si ese archivo se salta, esas dos tablas quedan como nacieron: abiertas para que CUALQUIER usuario con sesión lea, cambie o borre TODOS los movimientos de dinero y cronogramas de cuotas de todas las empresas.
- **Cómo se arregla:** Renumerar a versiones únicas y correlativas (p. ej. 083, 084, 085, 086...) manteniendo el orden lógico, verificar con 'supabase migration list' que no haya versiones duplicadas, y confirmar que la política endurecida quede aplicada.

---

## 🟡 MEDIO — 60 temas

### Medio 1. Las alertas de facturas a crédito siguen sonando aunque ya se pagaron, y pueden omitir facturas reales

- **Módulo:** Aprobaciones y avisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/notificationService.ts (línea ~256)`
- **Qué pasa:** La campanita avisa de 'CxP vencida (+60 días)' mirando solo la fecha y la condición 'crédito' de la factura, sin revisar si ya se registró el pago. El resto de la app sí cruza la factura con sus pagos (por número de factura y suplidor) para saber lo pendiente. Resultado: una factura a crédito ya pagada seguirá apareciendo como 'vencida' para siempre, generando ruido y desconfianza en las alertas. Además, la consulta trae como máximo 100 transacciones viejas sin ningún orden definido: en un proyecto con historial grande, facturas realmente vencidas pueden quedarse fuera de la alerta sin aviso.
- **Cómo se arregla:** Reutilizar la misma lógica de 'pendiente' de financialCalculations para las alertas (solo avisar si el saldo pendiente es mayor que cero) y ordenar/filtrar la consulta en el servidor.

### Medio 2. La bitácora de aprobaciones registra nombres escritos a mano y a veces ningún responsable

- **Módulo:** Aprobaciones y avisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~516)`
- **Qué pasa:** El registro de auditoría promete 'toda acción queda registrada con fecha, hora y responsable', pero el 'responsable' es un texto que la persona escribe libremente en el campo 'Aprobado por' (puede poner el nombre de otro), y nunca se guarda el identificador real del usuario con sesión. Peor: al 'devolver' o 'rechazar' una solicitud no se pasa ningún nombre, así que esas filas quedan sin responsable (se ven como '—' en la página de Aprobaciones). Si algún día hay un problema con una compra, la bitácora no permite saber con certeza quién hizo qué.
- **Cómo se arregla:** Guardar siempre el id y el nombre del usuario con sesión (del authStore) en cada registro de auditoría, en vez del texto tecleado; y pasar el actor en devolver/rechazar.

### Medio 3. Al cerrar sesión, el dispositivo sigue recibiendo las notificaciones del usuario anterior

- **Módulo:** Aprobaciones y avisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/stores/authStore.ts (línea ~30)`
- **Qué pasa:** Cuando alguien activa las notificaciones push en un teléfono o computadora y luego cierra sesión, la suscripción queda viva: ese aparato seguirá recibiendo alertas del negocio (montos, órdenes pendientes, nóminas) aunque el usuario ya no esté conectado, o aunque el aparato pase a otra persona. La única forma de cortarlo es entrar a Ajustes y desactivarlas manualmente antes de salir. Además, si el navegador renueva la suscripción por su cuenta, la app no se entera (no maneja ese evento) y la fila queda obsoleta hasta que un envío falle.
- **Cómo se arregla:** Al cerrar sesión, dar de baja la suscripción push del dispositivo (o al menos borrar la fila en la base), y agregar el manejador de renovación de suscripción en el service worker.

### Medio 4. La opción 'Invitar por email' no se puede completar: falta la pantalla para definir contraseña

- **Módulo:** Usuarios y permisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/admin/AdminUserForm.tsx (línea ~366)`
- **Qué pasa:** Al crear un usuario puedes elegir 'Invitar por email' para que la persona reciba un enlace y ponga su propia contraseña. El correo se envía, pero la app no tiene ninguna pantalla que reciba ese enlace ni que permita escribir la contraseña. Resultado: el invitado hace clic, llega a la app, y queda en un callejón sin salida; nunca puede fijar su clave y por lo tanto no puede volver a entrar. La función se ofrece como si funcionara pero está a medias.
- **Cómo se arregla:** Agregar una pantalla pública de 'definir/restablecer contraseña' que capture el token del enlace (supabase.auth.updateUser) y sincronice la sesión, o de momento usar solo 'Crear con contraseña' hasta tener ese flujo.

### Medio 5. La sesión se confía al navegador sin revalidar contra el servidor

- **Módulo:** Usuarios y permisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/stores/authStore.ts (línea ~44)`
- **Qué pasa:** Quién eres y si eres Director se guarda en el navegador (almacenamiento local) y la app confía en ese dato. Si el Director borra o desactiva a alguien, o si la sesión caduca, la app en la pantalla de esa persona sigue mostrándola como conectada y con su rol, porque nunca vuelve a preguntarle al servidor. Los datos sensibles siguen protegidos por las reglas del servidor, pero la persona ve la interfaz de administración/director y puede confundir o intentar acciones. Sumado a que 'Inactivo' no bloquea, refuerza la sensación falsa de que alguien fue removido cuando no lo fue.
- **Cómo se arregla:** Escuchar los cambios de sesión de Supabase y limpiar/refrescar el usuario cuando la sesión caduque o se cierre; revalidar is_director/is_active del servidor al abrir la app.

### Medio 6. Se puede cotizar y comprar una cantidad mayor a la solicitada sin ningún aviso

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/quoteService.ts (línea ~29)`
- **Qué pasa:** La solicitud de compra dice cuánto se necesita (y eso es lo que se valida contra el presupuesto), pero las cotizaciones se escriben libres: nadie compara las cantidades cotizadas con las solicitadas. Un comprador puede pedir 100 fundas de cemento validadas contra el plan y luego cargar una cotización de 500 fundas; el director la aprueba, se libera la orden y el almacén recibe 500 sin que salte ninguna alerta. Esto deja una puerta trasera al control de 'no comprar más de lo planificado', porque lo que de verdad se compra es lo que dice la cotización, no la solicitud.
- **Cómo se arregla:** Al guardar o aprobar una cotización, comparar sus cantidades con las de la solicitud y exigir validación (como el excedente de plan) cuando la cotización supere lo solicitado.

### Medio 7. El Historial de Precios mezcla materiales distintos de un mismo suplidor

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/usePriceHistory.ts (línea ~57)`
- **Qué pasa:** La pantalla 'Historial de Precios' agrupa las compras por SUPLIDOR en vez de por material. Si a la Ferretería Central le compraste cemento a RD$400 y varillas a RD$1,200, la pantalla muestra UNA sola fila con mínimo RD$400, máximo RD$1,200 y una 'tendencia de subida' de +200% que en realidad es solo el cambio de un producto a otro. Los promedios, mínimos, máximos y flechas de tendencia de esa pantalla no son confiables para decidir a quién comprarle.
- **Cómo se arregla:** Agrupar por descripción del material (o por material + suplidor), de modo que cada fila compare precios del mismo producto.

### Medio 8. El precio negociado no se usa: el almacén y los costos quedan con el precio viejo

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/quoteService.ts (línea ~71)`
- **Qué pasa:** Cuando el comprador negocia una rebaja con el suplidor, el sistema guarda el nuevo total solo como dato informativo de la cotización. Al recibir la mercancía, cada material entra al almacén con el precio unitario ORIGINAL (el de antes de la rebaja). Consecuencia: el valor del inventario, el costo promedio del material, el historial de precios y el gasto que se imputa al presupuesto cuando el material se consume quedan todos inflados con el precio sin descuento. Ejemplo con los propios datos de prueba: una cotización de RD$202,960 negociada a RD$196,000 igual entra al almacén valorada como si no hubiera rebaja.
- **Cómo se arregla:** Al registrar un precio negociado, prorratear la rebaja entre las líneas de la cotización (o pedir los nuevos precios por línea) para que la recepción use el precio realmente pagado.

### Medio 9. Los precios de las compras nunca llegan al Historial de Precios

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/usePriceHistory.ts (línea ~31)`
- **Qué pasa:** La pantalla 'Historial de Precios' solo lee las transacciones del control financiero. Todo lo que se compra por el módulo de compras (cotizaciones aprobadas y entradas al almacén con su precio) queda invisible para esa pantalla. Es decir: el flujo de compras, que es donde están los precios más confiables y comparables, no alimenta la herramienta hecha para comparar precios. Curiosamente, ya existe en el código una función que calcula el histórico por material usando las entradas de almacén (promedio ponderado, último precio, último suplidor), pero ninguna pantalla la usa: es código muerto.
- **Cómo se arregla:** Conectar el Historial de Precios (o el catálogo de materiales) con la función existente que lee las entradas de almacén, para que las compras reales alimenten la comparación de precios.

### Medio 10. Una solicitud que excede el plan queda atascada: no se puede corregir, borrar ni rechazar

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~323)`
- **Qué pasa:** Si alguien crea una solicitud con una cantidad equivocada (por ejemplo 1000 en vez de 100) y eso excede el plan, la solicitud cae en 'pendiente de validación'. En ese estado NO se puede editar (el sistema lo bloquea), NO aparece el botón de eliminar, y tampoco hay forma de rechazarla (el rechazo solo existe en la etapa de aprobación). La única salida en pantalla es que un director 'valide el excedente', o sea, aprobar formalmente un error de dedo. Las solicitudes con errores quedan atascadas para siempre o fuerzan una validación falsa.
- **Cómo se arregla:** Permitir editar o eliminar solicitudes en 'pendiente de validación' (para corregir la cantidad), o darle al validador un botón de 'devolver para corrección'.

### Medio 11. Se puede medir y pagar más de lo acordado en el contrato sin ninguna alerta

- **Módulo:** Cubicaciones y CxP
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/cubicationService.ts (línea ~176)`
- **Qué pasa:** Al registrar un corte no hay ningún tope: se puede capturar una cantidad mayor que la acordada en la partida (o registrar cortes de más una y otra vez) y la app lo acepta, lo aprueba y lo manda a pagar. Encima, los resúmenes lo disimulan: el porcentaje de avance se topa en 100% y el 'Pendiente' nunca baja de 0, así que en la vista general del proyecto no se nota que ya se pagó de más. La auditoría de junio (punto U1) menciona la falta de validaciones de cantidades en general, pero este exceso sobre lo contratado no está listado.
- **Cómo se arregla:** Avisar (o bloquear) cuando la cantidad acumulada de cortes de una partida supere la cantidad acordada, y mostrar el exceso en los resúmenes en vez de taparlo en 0 y 100%.

### Medio 12. Borrar una partida (o el contrato) elimina también cortes ya pagados y su respaldo

- **Módulo:** Cubicaciones y CxP
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/cubicacion/PartidaSection.tsx (línea ~535)`
- **Qué pasa:** La app no deja borrar un corte 'pagado' de uno en uno, pero si se borra la partida completa (o el contrato), todos sus cortes se van en cascada, incluyendo los pagados y firmados. El pago sigue existiendo en la nómina, pero desaparece el registro de qué avance lo justificaba, quién lo aprobó y su firma. Se pierde el respaldo de pagos ya hechos con un par de clics.
- **Cómo se arregla:** Impedir borrar partidas o contratos que tengan cortes pagados (o exigir primero desvincularlos), igual que ya se protege el borrado individual.

### Medio 13. El 'Pendiente' del contrato descuenta adelantos que ya fueron cobrados, mostrando menos deuda de la real

- **Módulo:** Cubicaciones y CxP
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/cubicationService.ts (línea ~38)`
- **Qué pasa:** El monto 'Pendiente' de cada contrato se calcula restando SIEMPRE el total de adelantos, aunque esos adelantos ya se hayan descontado de una nómina anterior. Una vez que un adelanto se recuperó (se le descontó al contratista en un pago), restarlo otra vez hace que el 'Pendiente' se vea más chico de lo que realmente se le debe al contratista. Cristian podría creer que le debe menos al contratista de lo que corresponde.
- **Cómo se arregla:** Restar solo el saldo vivo de cada adelanto (amount − deducted_amount) en vez del monto original completo.

### Medio 14. La ficha del contratista lee una tabla vieja: nunca muestra sus contratos de cubicación reales

- **Módulo:** Cubicaciones y CxP
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/contractorService.ts (línea ~58)`
- **Qué pasa:** En la página de cada contratista, el dato 'Total contratado' y la lista de cubicaciones salen de una tabla antigua (contract_cubications) que la app ya no llena: el módulo actual de cubicaciones guarda todo en otra tabla (adjustment_contracts). Resultado: por más contratos que se creen hoy, la ficha del contratista siempre mostrará 0 contratado y ninguna cubicación, dando una imagen falsa de su historial.
- **Cómo se arregla:** Cambiar la consulta del historial para leer los contratos de adjustment_contracts con sus partidas, y calcular el total contratado desde ahí.

### Medio 15. El semáforo de documentos del contratista se congela: un documento vencido puede seguir marcado 'Vigente'

- **Módulo:** Cubicaciones y CxP
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/contractorDocService.ts (línea ~71)`
- **Qué pasa:** El estado de cada documento (vigente / por vencer / vencido) se calcula una sola vez, en el momento de guardarlo, y queda grabado así para siempre. Como la pantalla solo permite agregar o borrar documentos (no editarlos), un seguro o una cédula que venza el próximo año quedará marcado 'Vigente' eternamente, incluso años después de vencido. La función que buscaría documentos por vencer para alertar (getAllExpiring) además no se usa en ninguna pantalla, así que nunca hay aviso.
- **Cómo se arregla:** Calcular el estado a partir de la fecha de vencimiento cada vez que se muestran los documentos (en lugar de guardarlo fijo) y conectar la alerta de vencimientos a alguna pantalla o notificación.

### Medio 16. No existe un cierre de mes real: los datos financieros de meses pasados se pueden cambiar o borrar sin rastro

- **Módulo:** Cuentas y flujo de caja
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/pages/CierreMes.tsx (línea ~4)`
- **Qué pasa:** La página 'Cierre de Mes' es solamente una lista de pendientes para revisar; no guarda ningún cierre. No hay forma de 'cerrar' un mes: cualquier transacción del libro diario o movimiento bancario de hace seis meses se puede editar o borrar hoy mismo, y los reportes históricos cambian silenciosamente. Además no queda registro de quién cambió qué (el registro de auditoría solo cubre roles y permisos de usuarios). Para un negocio que compara mes contra mes, esto significa que los números del pasado nunca son definitivos.
- **Cómo se arregla:** Guardar un 'mes cerrado' por proyecto y bloquear (en la base de datos) ediciones y borrados de transacciones y movimientos con fecha dentro de meses cerrados, con opción de reabrir solo para el director.

### Medio 17. Los pagos de nómina y compras nunca se reflejan en las cuentas bancarias

- **Módulo:** Cuentas y flujo de caja
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/payments/DistributionForm.tsx (línea ~88)`
- **Qué pasa:** Al distribuir los pagos de una nómina, la app pregunta de qué cuenta bancaria sale el dinero, pero ese pago nunca se anota como movimiento en la cuenta. Lo mismo con las compras y órdenes: no generan movimientos bancarios. Hoy solo los préstamos, el saldo inicial y las anotaciones manuales alimentan el saldo de las cuentas. Resultado: el 'Saldo neto' que muestra la Conciliación de cuentas está sobrevalorado si esas mismas cuentas se usan para pagar nómina o proveedores, y Cristian podría creer que hay más dinero del que hay.
- **Cómo se arregla:** Decidir el alcance: o generar movimientos bancarios también al pagar nóminas/compras, o dejar claro en pantalla que ese saldo solo refleja el fondo de préstamos.

### Medio 18. Si falla el registro del movimiento bancario de un préstamo, el dinero desaparece del control sin avisar

- **Módulo:** Cuentas y flujo de caja
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/loanService.ts (línea ~183)`
- **Qué pasa:** Crear un préstamo y anotar la salida del dinero en la cuenta son dos pasos separados (no una operación 'todo o nada'). Si el segundo paso falla (mala conexión, permiso, etc.), el préstamo queda creado pero la cuenta bancaria no registra la salida: el saldo mostrado queda más alto que el real. Al usuario no se le avisa nada (el error solo va a un registro técnico interno) y no hay ninguna pantalla que detecte el descuadre entre préstamos y movimientos. Lo mismo ocurre con el cobro de cuotas.
- **Cómo se arregla:** Hacer préstamo y movimiento en una sola operación de base de datos (función RPC), o al menos avisar en pantalla cuando el movimiento no se pudo anotar y ofrecer reintentarlo.

### Medio 19. Si falla la carga de datos, el Flujo de Caja muestra ceros como si todo estuviera bien

- **Módulo:** Cuentas y flujo de caja
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/cashFlowService.ts (línea ~83)`
- **Qué pasa:** Al armar la proyección mensual, el servicio consulta presupuesto, nóminas y transacciones pero ignora si esas consultas fallaron: si una falla (sin internet, permiso denegado), simplemente actúa como si no hubiera datos y la tabla muestra gastos reales en cero o meses vacíos, sin ningún mensaje de error. La página tampoco atrapa errores al cargar ni al borrar un ingreso esperado. Cristian podría mirar un flujo de caja 'en cero' y creer que no se ha gastado nada ese mes.
- **Cómo se arregla:** Revisar el error de cada consulta y, si algo falla, mostrar el aviso de error en la página en vez de una tabla en ceros.

### Medio 20. Una compra a crédito sin número de factura queda como deuda para siempre

- **Módulo:** Cálculos de dinero
- **Estado:** ✅ Confirmado (doble revisión)
- **Dónde:** `src/utils/financialCalculations.ts (línea ~62)`
- **Qué pasa:** Si registras una compra a crédito sin escribir el número de factura (el formulario no lo exige), no existe ninguna forma de marcarla como pagada: los pagos se enlazan únicamente por número de factura exacto más proveedor. Esa deuda aparecerá eternamente en las cuentas por pagar, en los recordatorios de WhatsApp a proveedores y restará del 'Disponible neto'. Lo mismo pasa si el número de factura del pago se escribe con alguna diferencia (mayúsculas, un espacio, un guion) o si al pago no se le pone el proveedor: el enlace no se hace y la deuda 'no baja'.
- **Cómo se arregla:** Exigir número de factura cuando la condición es a crédito, y comparar números de factura normalizados (sin espacios ni distinción de mayúsculas).

### Medio 21. Si la sesión real se vence, la app se queda 'conectada' para siempre mostrando pantallas vacías

- **Módulo:** Estructura general
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/stores/authStore.ts (línea ~44)`
- **Qué pasa:** La app recuerda al usuario en el navegador por su cuenta, separada de la sesión real con el servidor. Nadie vigila si esa sesión real sigue viva: si se vence (por ejemplo, tras semanas sin abrir la app en la obra, o si un administrador cambia la contraseña del usuario), la app sigue mostrando al usuario como conectado, pero todas las consultas al servidor fallan. El resultado para una persona no técnica es una app 'rota': listas vacías o errores en todas las pantallas, sin ningún aviso de que debe volver a iniciar sesión. Solo se arregla si se le ocurre pulsar el botón de salir.
- **Cómo se arregla:** Escuchar los cambios de sesión del servidor (onAuthStateChange) y, cuando la sesión muera, limpiar el usuario guardado y llevarlo a la pantalla de entrada con un mensaje claro.

### Medio 22. Si falta la configuración al publicar, la app real se convierte en silencio en una app de mentira con datos falsos

- **Módulo:** Estructura general
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/lib/supabase.ts (línea ~7)`
- **Qué pasa:** La app tiene un 'modo demo' con datos inventados (proyectos, contratistas y nóminas de ejemplo) que se activa automáticamente cuando falta la dirección de la base de datos al momento de construir la app. No hay ninguna alarma que detenga la publicación: si algún día se borra o se escribe mal esa variable en Vercel, la versión publicada mostraría datos falsos y dejaría entrar con usuarios de juguete (cristian/cristian123), y lo que la gente escriba se perdería al cerrar la pestaña. Además, todo ese paquete de datos y usuarios de demostración viaja siempre dentro de la app publicada (unos 70 KB de más en la primera carga).
- **Cómo se arregla:** Hacer que la construcción de producción falle con un mensaje claro si falta la dirección de la base de datos, y cargar el modo demo solo bajo demanda para que no viaje en la app real.

### Medio 23. La cola de cambios pendientes borra operaciones en silencio tras 5 intentos fallidos

- **Módulo:** Estructura general
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/utils/offlineQueue.ts (línea ~136)`
- **Qué pasa:** Cuando la cola de sincronización intenta reenviar un cambio guardado y falla 5 veces (por ejemplo porque el servidor lo rechaza siempre por un dato inválido o falta de permiso), el cambio se elimina definitivamente sin avisarle a nadie: no hay mensaje, ni lista de fallidos, ni registro. El usuario cree que su solicitud o movimiento quedó sincronizado y en realidad desapareció. Hoy el impacto está limitado porque la cola nunca se llena (ver hallazgo aparte), pero en cuanto se conecte, este comportamiento perdería datos calladamente. La cola tampoco se limpia al cerrar sesión, así que lo pendiente de un usuario se enviaría con la cuenta del siguiente que entre en el mismo aparato. Relacionado con el punto conocido R3 de la auditoría del 8 de junio.
- **Cómo se arregla:** Avisar al usuario cuando un cambio pendiente no se pudo sincronizar (y conservarlo marcado como fallido en vez de borrarlo), y vaciar la cola al cerrar sesión.

### Medio 24. Los errores que rompen una pantalla nunca llegan a Sentry, el vigilante de errores queda ciego

- **Módulo:** Estructura general
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/RouterErrorBoundary.tsx (línea ~67)`
- **Qué pasa:** El proyecto montó todo un circuito automático (según la bitácora): la app falla, Sentry lo detecta, y Claude prepara el arreglo. Pero la pieza que atrapa los errores dentro de las páginas (la gran mayoría de los fallos posibles) muestra la pantalla de 'Algo salió mal' sin reportar nada a Sentry. Como el atrapador de páginas intercepta el error antes de que llegue al atrapador general que sí reporta, casi ningún fallo real de las pantallas queda registrado, y el sistema de auto-corrección no se entera de que pasó.
- **Cómo se arregla:** Agregar una línea que envíe el error a Sentry (captureException) dentro de RouterErrorBoundary antes de mostrar la pantalla de error.

### Medio 25. Completar un pago de nómina desde una cuenta interna no genera movimiento: los saldos de las cuentas quedan inflados

- **Módulo:** Integración entre módulos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/paymentDistributionService.ts (línea ~158)`
- **Qué pasa:** Al distribuir los pagos de una nómina, la app deja elegir la 'cuenta de origen' entre las cuentas internas de la empresa (las mismas del fondo de préstamos). Pero al marcar el pago como 'completado', no se anota ninguna salida de dinero en esa cuenta. Resultado: la tarjeta 'Disponible en cuentas' del fondo y la conciliación de cuentas muestran más dinero del que realmente hay, porque solo registran préstamos y anotaciones manuales.
- **Cómo se arregla:** Al marcar un pago como completado con cuenta de origen interna, crear automáticamente un movimiento de débito en esa cuenta (y revertirlo si el pago se cancela).

### Medio 26. Editar, cancelar o borrar un préstamo deja los movimientos de la cuenta desactualizados: el saldo del fondo queda mal para siempre

- **Módulo:** Integración entre módulos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/loanService.ts (línea ~203)`
- **Qué pasa:** Al crear un préstamo con cuenta de desembolso, la app anota la salida del dinero en esa cuenta. Pero si después el préstamo se edita (por ejemplo, se corrige el monto de 100.000 a 50.000 o se cambia la cuenta), se cancela o se borra, esa anotación original no se corrige ni se elimina. El saldo del fondo de préstamos queda descuadrado permanentemente: mostraría 100.000 menos aunque el préstamo real fuera de 50.000 o ya no exista. Existe una función para limpiar esos movimientos, pero nadie la usa (código muerto).
- **Cómo se arregla:** Al editar el monto o la cuenta de un préstamo, ajustar/reemplazar el movimiento de desembolso; al cancelarlo o borrarlo, revertir o eliminar sus movimientos usando deleteByReferencia.

### Medio 27. El control de 'no exceder el plan' solo revisa la primera línea de una solicitud de compra multi-material

- **Módulo:** Integración entre módulos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~216)`
- **Qué pasa:** Cuando una solicitud de compra trae varios materiales (líneas), la regla que impide pedir más de lo planificado en el presupuesto solo se aplica al primer material. Los demás materiales de la solicitud pueden exceder su partida sin que la app pida validación, y además nunca cuentan como 'comprometidos', así que futuras solicitudes contra esas partidas tampoco ven ese consumo. También al recibir la mercancía, todas las líneas se imputan a la partida de la primera línea, no a la suya propia. El candado del presupuesto se puede saltar simplemente poniendo el material grande en la segunda línea.
- **Cómo se arregla:** Validar la disponibilidad de cada línea contra su propia partida (y sumar las líneas al comprometido), e imputar cada recepción a la partida de su línea.

### Medio 28. El versionado del presupuesto (regla 7.7) existe pero nunca se usa: los cambios post-aprobación no dejan copia histórica

- **Módulo:** Integración entre módulos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/budgetVersionService.ts (línea ~18)`
- **Qué pasa:** Existe un mecanismo completo para guardar una 'foto' del presupuesto cada vez que se modifique después de aprobado (con motivo y autor), incluida su tabla en la base de datos y su registro en Aprobaciones. Pero ninguna pantalla ni servicio lo llama: es código muerto. En la práctica, el presupuesto se puede editar después de aprobado sin que quede ninguna versión histórica ni rastro del motivo, que era justamente lo que la regla interna 7.7 quería garantizar.
- **Cómo se arregla:** Llamar a budgetVersionService.snapshot (pidiendo el motivo) antes de guardar cualquier edición de presupuesto en proyectos ya aprobados, o retirar el mecanismo si se decidió no usarlo.

### Medio 29. La reversa de una recepción puede quedar a medias o ser imposible si la orden no tiene capítulo imputado

- **Módulo:** Inventario/Almacén
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~861)`
- **Qué pasa:** Devolver una recepción de mercancía se hace con varios pasos separados desde el navegador (una salida por material, luego poner en cero lo recibido, luego cambiar el estado de la orden). Si falla a mitad (se va el internet, un material da error), quedan salidas hechas pero la orden sigue figurando como recibida: el stock y la orden se contradicen. Peor aún: como el capítulo/partida de una solicitud de compra es opcional al crearla, una orden sin imputación no se puede revertir nunca — el sistema responde con el mensaje confuso 'Toda salida de almacén debe imputarse a una partida del presupuesto' y bloquea la corrección. La falta de atomicidad en recepciones está reconocida en un comentario del propio código.
- **Cómo se arregla:** Hacer la reversa (y la recepción) en una sola función de base de datos todo-o-nada, y permitir que las salidas de reversa (que no son gasto) no exijan partida imputada.

### Medio 30. Riesgo documentado de contar dos veces el mismo gasto de materiales en el presupuesto

- **Módulo:** Inventario/Almacén
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/utils/costoReal.ts (línea ~24)`
- **Qué pasa:** La columna GASTADO del presupuesto suma dos fuentes independientes: los pagos registrados en el control financiero y las salidas de almacén valoradas a costo promedio. Si Cristian paga una compra de materiales y la registra como transacción imputada a un capítulo, y además el almacenista despacha esos mismos materiales imputándolos al mismo capítulo, el gasto se suma DOS veces y el presupuesto aparenta estar más gastado de lo real. El propio código lo reconoce como riesgo conocido ('⚠️ RIESGO DE DOBLE CONTEO... Hoy NO hay deduplicación automática'), pero no hay ninguna alerta en pantalla que avise al usuario, que no tiene forma de conocer esa regla implícita.
- **Cómo se arregla:** Como mínimo, avisar en pantalla cuando un capítulo tiene a la vez transacciones de materiales y salidas de almacén; idealmente, permitir enlazar la transacción con la orden de compra para descontar una de las dos.

### Medio 31. No existe traslado de materiales entre proyectos: moverlos infla el gasto del proyecto de origen

- **Módulo:** Inventario/Almacén
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/inventoryService.ts (línea ~203)`
- **Qué pasa:** La app maneja varios proyectos, pero no hay ninguna función para trasladar material sobrante de un proyecto a otro (algo cotidiano en constructoras). La única vía es registrar una 'salida' en el proyecto origen — que obligatoriamente se imputa a una partida del presupuesto y se carga como gasto consumido a costo promedio — y luego una 'entrada' manual en el otro proyecto re-tecleando el costo. Resultado: el presupuesto del proyecto que presta el material aparece con un gasto que no es real, y el costo del material puede llegar distorsionado al proyecto receptor.
- **Cómo se arregla:** Crear un movimiento de tipo 'traslado' que saque del proyecto origen sin cargar gasto a ninguna partida y entre al proyecto destino con el mismo costo, en una sola operación.

### Medio 32. Al recibir una compra, el stock puede acreditarse a un material equivocado o duplicarse

- **Módulo:** Inventario/Almacén
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/inventoryService.ts (línea ~123)`
- **Qué pasa:** Cuando llega mercancía de una orden, la app busca el material por nombre para sumarle el stock. Esa búsqueda trata los caracteres % y \_ como comodines: un material llamado 'Varilla 3_8' encaja también con 'Varilla 3/8' o 'Varilla 328', y un nombre con % encaja con casi cualquier cosa, así que la entrada puede acreditarse al material equivocado sin aviso. Además, si dos recepciones del mismo material nuevo llegan a la vez, se crean dos fichas duplicadas porque no hay candado de nombre único (esto último ya está listado como conocido en R6 de AUDITORIA_CODIGO_2026-06-08.md).
- **Cómo se arregla:** Escapar los caracteres comodín antes de buscar (o comparar con igualdad sin distinguir mayúsculas) y añadir en la base de datos una regla de nombre único por proyecto.

### Medio 33. Duplicar un reporte comparte los comprobantes (se pueden borrar los originales), pierde los vínculos con el presupuesto y muestra totales en cero

- **Módulo:** Nómina
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/payrollService.ts (línea ~282)`
- **Qué pasa:** La función de duplicar un reporte tiene tres problemas. (1) Las facturas copiadas apuntan al MISMO archivo de comprobante que las originales: si alguien borra o reemplaza la factura duplicada, la app elimina el archivo del comprobante y el reporte original (que puede estar aprobado o pagado) se queda sin su respaldo — pérdida de un documento contable. (2) Las partidas de mano de obra copiadas pierden su vínculo con el presupuesto (capítulo/partida), así que el control de 'presupuesto vs gastado' deja de contar esos montos hasta que alguien los reasigne a mano. (3) El reporte nuevo muestra todos los totales en RD$0 aunque tenga las partidas copiadas, porque nunca se recalculan.
- **Cómo se arregla:** Al duplicar: copiar físicamente los archivos de comprobante (o no copiarlos), conservar los vínculos con el presupuesto y recalcular los totales del reporte nuevo.

### Medio 34. Nunca queda registrado quién aprobó un reporte de nómina

- **Módulo:** Nómina
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/usePayroll.ts (línea ~371)`
- **Qué pasa:** Cuando el Director aprueba un reporte o lo marca como pagado, la app guarda la fecha pero no el nombre de quien lo hizo: el campo 'Aprobado por' queda vacío para siempre (en la pantalla, en el historial de cambios y en el respaldo a Excel). El código sí sabe registrar el nombre —lo hace al 'devolver a borrador'— pero al aprobar no se lo pasa. Con varios usuarios aprobando nóminas, no hay forma de saber después quién autorizó cada pago, que es justo la trazabilidad que este flujo debía dar.
- **Cómo se arregla:** Pasar el nombre del usuario logueado (como ya hace 'devolver a borrador') en las llamadas de aprobar/pagar.

### Medio 35. Dos personas editando el mismo reporte a la vez pueden dejar totales incorrectos o indirectos duplicados

- **Módulo:** Nómina
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/payrollService.ts (línea ~582)`
- **Qué pasa:** El sistema permite que varios usuarios editen el mismo reporte en borrador, pero el recálculo de totales se hace con la copia local que cada navegador tiene en memoria y 'el último que guarda gana'. Escenario: Ana agrega una partida de mano de obra y, casi al mismo tiempo, Luis agrega una factura; el recálculo de Luis no incluye la partida de Ana, así que el total guardado no cuadra con las partidas reales del reporte. Además, el recálculo borra y vuelve a crear los gastos indirectos automáticos sin protección: si dos recálculos se cruzan, los indirectos quedan duplicados y el total de indirectos se infla al doble.
- **Cómo se arregla:** Recalcular siempre en el servidor leyendo la base de datos (como hace recalculateTotals) o mover el recálculo a una función de base de datos que borre e inserte en una sola transacción.

### Medio 36. Un reporte pagado se puede borrar por fuera de la pantalla (el servidor no lo impide)

- **Módulo:** Nómina
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/migrations/032_rls_capability_based.sql (línea ~56)`
- **Qué pasa:** La pantalla solo muestra el botón de borrar en reportes en borrador, pero esa protección vive únicamente en la pantalla. En el servidor, cualquier usuario con algún permiso de nómina (incluso solo el de repartir pagos) puede borrar un reporte APROBADO o PAGADO hablando directamente con la base de datos, y con él se borran en cascada todas sus partidas y facturas. Eso haría desaparecer gasto ya comprometido: el 'invertido', el flujo de caja y el presupuesto-vs-real cambiarían sin dejar el detalle. El equipo ya blindó en el servidor los cambios de estado y la edición del contenido (migraciones 069/070), pero el borrado quedó fuera de ese blindaje.
- **Cómo se arregla:** Agregar en el servidor una regla que solo permita borrar reportes en borrador (o exigir el permiso de aprobar para borrar los comprometidos).

### Medio 37. El calendario solo lee 300 movimientos, sin orden, y puede omitir pagos sin avisar

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/useCalendarEvents.ts (línea ~86)`
- **Qué pasa:** La página de Calendario pide los movimientos de TODOS los proyectos sin filtrar por fechas y con un tope de 300 filas, sin indicar ningún orden. Cuando la empresa acumule más de 300 movimientos (algo normal en construcción), la base de datos devuelve 300 cualesquiera: pueden faltar justamente los pagos próximos y el calendario los omite sin ninguna advertencia. Es pariente del problema ya anotado en la auditoría de junio (N3: pantallas que se cortan a 200/1000 filas sin avisar), pero en el calendario no estaba listado.
- **Cómo se arregla:** Pasar siempre el rango del mes visible desde la página, ordenar por fecha, y avisar (o paginar) si se alcanza el tope.

### Medio 38. Las fechas del cronograma se corren un día por la zona horaria

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/scheduleService.ts (línea ~243)`
- **Qué pasa:** El cronograma calcula "hoy" con la hora universal (UTC) en vez de la hora local. En República Dominicana (4 horas detrás de UTC), desde las 8 de la noche el sistema ya cree que es "mañana": una tarea que vence hoy aparece marcada "⚠ Retraso" esa misma noche, la línea roja de "hoy" del Gantt se corre, y el reporte PDF para el cliente puede marcar un hito como "Atrasado" antes de tiempo. Además, en la vista móvil del Gantt las fechas de inicio/fin se muestran un día antes del real. El proyecto ya tiene la utilidad correcta (todayISO en dateLocal.ts) y la usa en asistencia y calendario, pero no aquí; en la bitácora del 9 de junio se anotó un arreglo similar solo para "alertas".
- **Cómo se arregla:** Usar todayISO() de dateLocal.ts en los tres puntos y formatear las fechas del Gantt móvil igual que la tabla (agregando 'T12:00:00').

### Medio 39. El gráfico de avance mensual del proyecto cuenta las tareas dos veces

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/projects/ProjectTendencias.tsx (línea ~49)`
- **Qué pasa:** En la pantalla de detalle del proyecto, la línea de "avance de obra mensual" suma tanto las tareas padre como sus subtareas, cuando el padre ya representa el conjunto de sus hijas: el mismo trabajo se cuenta dos veces. Peor aún: cuando una tarea tiene subtareas, su porcentaje guardado queda congelado (el formulario bloquea ese campo porque "se calcula solo"), así que el gráfico usa un número viejo del padre más los números reales de las hijas. El resumen de arriba (avance general) sí lo calcula bien; el gráfico de tendencia no, y muestran cifras distintas para lo mismo.
- **Cómo se arregla:** En buildScheduleProgress usar la misma lógica del resumen: construir el árbol y ponderar solo las tareas hoja (o las raíces con sus valores calculados).

### Medio 40. Un ensayo de calidad puede quedar 'Aprobado' aunque se borre su resultado

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/qualityControlService.ts (línea ~41)`
- **Qué pasa:** Si se edita un ensayo de hormigón que ya tenía resultado (por ejemplo se anotó 300 por error y se borra el campo de "resistencia real" para esperar el dato del laboratorio), el ensayo sigue marcado "Aprobado" o "Fallido" aunque ya no tenga ningún resultado: el estado viejo no se limpia. Ese registro tampoco aparece en el filtro de "Pendientes", así que puede olvidarse. Esto es un efecto secundario del arreglo R5 de la auditoría de junio ("editar un ensayo ya no borra su estado"): se protegió de más.
- **Cómo se arregla:** Recalcular el estado siempre que la edición incluya los campos de resistencia, poniéndolo en null (pendiente) cuando falte la resistencia real.

### Medio 41. Un doble clic en Guardar puede duplicar registros de asistencia, bitácora y calidad

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/useAttendancePage.ts (línea ~103)`
- **Qué pasa:** En asistencia (y también en bitácora y calidad), dos toques rápidos al botón "Guardar" —muy común en celular en la obra— pueden crear el mismo registro dos veces, porque el bloqueo del botón tarda un instante en activarse. El propio cronograma ya reconoce y corrige este problema con una protección instantánea, pero los otros tres módulos no la tienen. Un registro de asistencia duplicado infla las tarjetas de "trabajadores hoy" y "horas hoy".
- **Cómo se arregla:** Copiar la misma protección de doble clic (savingRef) del cronograma a los guardados de asistencia, bitácora y calidad.

### Medio 42. El modo 'sin internet' prometido para asistencia y bitácora no está conectado

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/useOfflineQueue.ts (línea ~10)`
- **Qué pasa:** La app tiene una "cola" para guardar acciones cuando no hay señal y enviarlas al volver la conexión, pensada —según el propio código— para que el personal de obra registre asistencia y bitácora sin internet. Pero esa cola solo está conectada a solicitudes de compra, avances de partida y movimientos de inventario: si alguien registra asistencia o bitácora sin señal, el guardado simplemente falla y los datos (y la foto) se pierden si cierra la app. La auditoría de junio ya menciona un fallo y "código duplicado muerto" en esta cola (R3); este hueco de integración es el complemento: el módulo muerto es justamente el que decía cubrir asistencia/bitácora.
- **Cómo se arregla:** Conectar asistencia y bitácora a la cola sin internet existente (o quitar el módulo muerto y avisar claramente que se requiere señal para estos registros).

### Medio 43. Al publicarse una versión nueva, la app se recarga sola sin avisar y se pierde lo que se estaba escribiendo

- **Módulo:** Sin internet / App instalable
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `public/sw.js (línea ~46)`
- **Qué pasa:** Existe un aviso bonito de 'Nueva versión disponible — Recarga para aplicar', pero en la práctica casi nunca aparece: el service worker se activa solo apenas se instala (skipWaiting automático), y el componente de actualización recarga la página en cuanto detecta el cambio de controlador. Resultado: si se publica una versión mientras alguien tiene la app abierta llenando un formulario (una nómina, una solicitud), la pantalla se recarga sin preguntar y se pierde lo escrito. También ocurre una recarga sorpresa en la primera visita, cuando el service worker toma control de la página.
- **Cómo se arregla:** Quitar el skipWaiting automático del evento install y dejar que el service worker nuevo espere hasta que el usuario pulse 'Actualizar' (que ya envía el mensaje SKIP_WAITING).

### Medio 44. La cola offline borra cambios para siempre tras 5 intentos fallidos, sin avisar, y no sincroniza al abrir la app

- **Módulo:** Sin internet / App instalable
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/utils/offlineQueue.ts (línea ~136)`
- **Qué pasa:** Si algún día la cola offline se conecta de verdad (ver hallazgo 1), tiene fallos de diseño peligrosos: (1) un registro que falle 5 veces (por ejemplo porque la sesión venció y todo devuelve 'no autorizado') se BORRA definitivamente sin decirle nada al usuario; (2) la sincronización solo se dispara cuando el teléfono pasa de 'sin red' a 'con red' o al pulsar un botón — si el trabajador cierra la app sin señal y la abre después con señal, los pendientes no se envían solos; (3) si la app se cierra justo entre 'enviado con éxito' y 'quitar de la cola', el registro se enviaría dos veces (duplicado); (4) como la cola no se vacía al cerrar sesión, los pendientes de un usuario se enviarían con la cuenta del siguiente que entre. Este tema ya está anotado parcialmente como R3 en AUDITORIA_CODIGO_2026-06-08.md.
- **Cómo se arregla:** No borrar los pendientes agotados (marcarlos como 'requiere revisión' y avisar al usuario), sincronizar también al arrancar la app, y vaciar o etiquetar la cola por usuario al cerrar sesión.

### Medio 45. El aviso diario al celular puede estar bloqueado en la puerta: la llamada programada no lleva la credencial que Supabase exige por defecto

- **Módulo:** Préstamos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/migrations/092_loan_reminders_cron.sql (línea ~42)`
- **Qué pasa:** El recordatorio diario de cobros (la joya del módulo según la bitácora del 12 de junio) funciona así: la base de datos llama cada mañana a un programita del servidor que manda la notificación. El problema es que Supabase, por defecto, rechaza cualquier llamada a esos programitas si no trae una credencial de sesión (JWT), y la llamada programada solo envía el secreto interno propio de la app, sin esa credencial. En el proyecto no hay ninguna configuración ni documento que diga que ese chequeo se desactivó para 'loan-reminders' (la guía de puesta en producción solo menciona desplegar 'admin-create-user' y 'send-push'). Si el chequeo está activo, el aviso diario se rechaza todos los días sin que nadie se entere, porque la llamada programada no revisa la respuesta ni deja registro de error. Y aunque hoy funcione porque se desactivó a mano, cualquier re-publicación futura del programita lo volvería a activar y mataría los avisos en silencio.
- **Cómo se arregla:** Verificar en el panel de Supabase si la llamada llega (registros de la función); dejar escrito en el proyecto que la función se despliega sin verificación de JWT (o agregar el header con la clave anónima a la llamada programada) y revisar a diario el resultado del envío.

### Medio 46. Editar un préstamo con cuotas ya pagadas deja un cronograma que no cuadra con el total, y puede perder cuotas si falla a mitad

- **Módulo:** Préstamos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/loanService.ts (línea ~260)`
- **Qué pasa:** Al editar el monto, interés o número de cuotas de un préstamo que ya tiene cuotas pagadas, la app conserva las pagadas con su monto viejo y regenera solo las pendientes con el monto nuevo. Resultado: la suma de todas las cuotas ya no coincide con el 'Total a pagar'. Ejemplo: préstamo de RD$10,000 al 10% en 10 cuotas de RD$1,100; se paga la cuota 1 y luego se edita el capital a RD$20,000 → total a pagar RD$22,000, pero las cuotas suman RD$1,100 + 9×RD$2,200 = RD$20,900; al pagar todo, quedarían RD$1,100 'en el aire'. Si se reduce el número de cuotas por debajo de una cuota ya pagada (ej. de 10 a 5 con la #8 pagada), la cuota #8 sobrevive como '#8 de 5'. Además, la regeneración borra primero las cuotas pendientes y después inserta las nuevas en dos pasos separados: si el segundo paso falla (se cae el internet), las cuotas pendientes desaparecen y el préstamo queda sin cronograma. La app muestra un aviso amarillo al editar, pero solo dice que 'las pagadas se mantienen', no advierte que los números pueden dejar de cuadrar.
- **Cómo se arregla:** Hacer el borrado e inserción en una sola operación de base de datos (todo o nada) y, al editar con cuotas pagadas, recalcular las cuotas pendientes de modo que el total cuadre (repartir el saldo restante entre las pendientes).

### Medio 47. Cancelar (o borrar) un préstamo deja para siempre la salida de dinero anotada en la cuenta, sin forma de corregirla

- **Módulo:** Préstamos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/loanService.ts (línea ~196)`
- **Qué pasa:** Cuando se crea un préstamo indicando la cuenta de desembolso, la app anota la salida del dinero en esa cuenta. Pero si el préstamo se cancela (por ejemplo porque se creó por error), esa salida NO se revierte ni se puede borrar: la pantalla de conciliación solo permite corregir movimientos anotados a mano, no los generados por préstamos. Resultado: el 'Disponible en cuentas' del fondo queda reducido para siempre por un préstamo que nunca existió de verdad, y la única salida es anotar un movimiento manual de ajuste que ensucia la conciliación. Existe una función interna para borrar los movimientos de un préstamo, pero nunca se usa en ninguna parte de la app.
- **Cómo se arregla:** Al cancelar un préstamo, preguntar si el dinero llegó a salir; si no salió, borrar (o contra-anotar) el movimiento de desembolso automáticamente usando la función que ya existe.

### Medio 48. Crear un préstamo son tres escrituras separadas: si una falla a mitad, quedan préstamos duplicados o cuentas descuadradas sin aviso

- **Módulo:** Préstamos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/loanService.ts (línea ~151)`
- **Qué pasa:** Crear un préstamo hace tres cosas en fila: guarda el préstamo, guarda sus cuotas y anota la salida de dinero en la cuenta. No son 'todo o nada'. Si falla el segundo paso (mala señal de internet, permiso), el préstamo queda guardado sin cronograma pero el usuario ve un error y probablemente vuelva a intentar: se crea un préstamo duplicado y, si indicó cuenta, una segunda salida de dinero. Y si falla solo el tercer paso, la app lo oculta a propósito (solo lo reporta a un sistema interno de errores): el préstamo existe pero la cuenta nunca registró que salió el dinero, así que el 'Disponible en cuentas' queda inflado sin que Cristian se entere.
- **Cómo se arregla:** Mover la creación completa (préstamo + cuotas + movimiento) a una sola operación de base de datos que se haga todo o nada, como ya se hizo con los pagos de nómina (RPC).

### Medio 49. El calendario de la app inventa las fechas de cobro de los préstamos en vez de usar el cronograma real

- **Módulo:** Préstamos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/useCalendarEvents.ts (línea ~147)`
- **Qué pasa:** El calendario de cobros no lee el cronograma de cuotas que existe en la base de datos: recalcula las fechas por su cuenta asumiendo que TODOS los préstamos son mensuales desde la fecha de desembolso. Ignora la frecuencia (semanal/quincenal), la 'fecha de primera cuota' elegida, y las fechas reprogramadas a mano. También decide cuántas cuotas van pagadas mirando solo los descuentos de nómina. Resultado: para un préstamo semanal, el calendario muestra un cobro al mes en fechas equivocadas; para uno con primera cuota elegida o con fechas movidas, muestra días que no corresponden. Cristian podría presentarse a cobrar el día equivocado o creer que no hay cobros una semana en la que sí los hay.
- **Cómo se arregla:** Que el calendario lea directamente la tabla de cuotas (fecha programada y estado), que es la fuente verdadera, en lugar de recalcular.

### Medio 50. La limpieza de 'partidas vacías' puede borrar avances de obra, y el botón Deshacer no los recupera

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/budget/emptyCategories.ts (línea ~12)`
- **Qué pasa:** Una partida se considera 'vacía' si no tiene subpartidas, ni monto, ni gasto — pero no se revisa si tiene avances de obra registrados (el porcentaje ejecutado que alimenta las cubicaciones puede registrarse a nivel de partida sin que haya gasto). Si el usuario acepta la limpieza (el modal viene con todas preseleccionadas), esos avances se borran de la base de datos en cascada. El botón 'Deshacer' recrea la partida con datos nuevos, pero los avances borrados no vuelven, así que el usuario cree que deshizo todo cuando en realidad perdió el historial de avance.
- **Cómo se arregla:** Incluir los avances (partida_progress) en la definición de 'vacía', o cambiar la relación en la base para que no se borren en cascada.

### Medio 51. Importar el mismo Excel dos veces duplica todas las subpartidas y dobla el presupuesto

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/useBudgetItems.ts (línea ~91)`
- **Qué pasa:** La importación siempre agrega: no detecta que una subpartida con el mismo código y descripción ya existe en la partida. Si el usuario importa el Excel de nuevo (por ejemplo para actualizar precios), cada subpartida queda repetida y el total presupuestado se duplica sin ninguna advertencia. No existe un modo de 'reemplazar' ni un aviso de duplicados en la vista previa.
- **Cómo se arregla:** En la vista previa, comparar código+descripción contra lo existente y ofrecer 'omitir', 'actualizar precio' o 'reemplazar partida completa'.

### Medio 52. Filas de datos defectuosas del Excel se convierten en partidas nuevas fantasma o se descartan en silencio

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/budget/parseBudgetExcel.ts (línea ~70)`
- **Qué pasa:** En la importación del presupuesto de obra, cualquier fila que no tenga unidad o cuya cantidad sea 0 o inválida se interpreta como el título de una partida nueva: una subpartida a la que le faltó la cantidad se convierte en 'partida' con el nombre de su descripción, y las subpartidas siguientes se cuelgan de esa partida equivocada. Todas esas partidas fantasma se crean en la base al confirmar. En la importación del presupuesto de mercado es peor: las filas de ítems que aparecen antes de la primera cabecera de categoría simplemente se descartan sin avisar, y el total importado queda menor que el del Excel sin que nadie lo note.
- **Cómo se arregla:** Marcar como error (no como partida nueva) las filas con pinta de subpartida incompleta, y en Mercado mostrar cuántas filas se descartaron y por qué antes de confirmar.

### Medio 53. Reemplazar el presupuesto de mercado no es 'todo o nada': puede quedarse a medias y perder el anterior

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/mercadoBudgetService.ts (línea ~27)`
- **Qué pasa:** Al re-importar el Excel de mercado, la app primero borra el presupuesto anterior, luego crea el nuevo y al final inserta sus líneas, en tres pasos separados. Si algo falla en el medio (se cae el internet, un permiso), el presupuesto viejo ya se borró con todos sus vínculos a contratos y el nuevo no existe o quedó sin líneas. Además, los dos borrados ignoran cualquier error de la base de datos: si el borrado falla en silencio, se crea un segundo presupuesto y los datos viejos quedan huérfanos acumulándose.
- **Cómo se arregla:** Hacer el reemplazo en una sola operación en la base de datos (función RPC) o al menos crear el nuevo antes de borrar el viejo, y revisar los errores de cada paso.

### Medio 54. Riesgo de contar un mismo gasto dos veces (control financiero + reportes/almacén), reconocido en el código pero sin protección

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/utils/costoReal.ts (línea ~24)`
- **Qué pasa:** La columna GASTADO suma dos fuentes independientes: los movimientos del control financiero (transacciones/CxP) y los costos imputados desde nóminas, facturas de materiales y salidas de almacén. Si un mismo gasto se registra por las dos vías (por ejemplo, la factura de un material se anota en el control financiero Y también como factura del reporte de nómina, imputadas a la misma partida), se suma dos veces y el presupuesto aparenta más gastado de lo real. El propio código lo advierte como riesgo conocido, pero no hay ninguna validación ni aviso que ayude al usuario a evitarlo, y este riesgo no figura en los documentos de pendientes (AUDITORIA/SEGURIDAD/QA), solo en comentarios del código.
- **Cómo se arregla:** Como mínimo, avisar al registrar una transacción imputada a una partida que ya tiene facturas/nómina imputadas ese mes, o permitir marcar la transacción como 'ya contada en reporte'.

### Medio 55. El export CSV masivo no protege contra celdas que Excel ejecuta como fórmulas (y abre con acentos rotos)

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/exportService.ts (línea ~74)`
- **Qué pasa:** Si alguien registra un contratista o una nota que empiece con el signo "=" o "+", al abrir el CSV del respaldo en Excel esa celda se ejecuta como fórmula: puede robar datos o ejecutar comandos en la computadora de quien abre el archivo. El proyecto ya tiene la protección escrita (en utils/csv.ts), pero el export masivo usa su propia versión que no la aplica. La auditoría anterior (U5) da esto por corregido, y solo se corrigió en la otra utilidad. Además, este export no incluye la marca UTF-8, por lo que los acentos y las eñes se ven rotos al abrirlo en Excel (también anotado en U5).
- **Cómo se arregla:** Hacer que exportService use sanitizeCsvCell de utils/csv.ts y agregar la marca UTF-8 al inicio de cada CSV.

### Medio 56. Los "respaldos" omiten módulos enteros y no existe forma de restaurar

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/exportService.ts (línea ~26)`
- **Qué pasa:** Ninguno de los dos respaldos que ofrece la app cubre todo el sistema, aunque la pantalla diga "Todos los datos del sistema en un solo archivo". Al ZIP de CSV le faltan, entre otros: los movimientos de las cuentas bancarias, las órdenes de compra y sus renglones, las cuotas de préstamos, los avances por partida y los ingresos esperados. Al respaldo en Excel le faltan las facturas de materiales, los costos indirectos, las compras completas, la asistencia, el cronograma y los movimientos bancarios. Además, el botón "Backup BD" no respalda nada: solo muestra un mensaje con instrucciones, y no hay ningún camino para restaurar datos desde estos archivos. Si se pierde la base de datos, con estos archivos no se recupera el negocio completo.
- **Cómo se arregla:** Completar la lista de tablas en ambos respaldos y programar un respaldo real automático del lado del servidor (pg_dump programado o los backups del propio Supabase), documentando cómo restaurar.

### Medio 57. La gráfica "Tendencias de gasto" cuenta los depósitos (dinero que entra) como gasto

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/dashboardService.ts (línea ~91)`
- **Qué pasa:** La gráfica de gasto mensual del panel suma TODAS las transacciones, incluyendo las de la categoría de depósitos, que son dinero que entra al proyecto (aportes del cliente), no gasto. El resto de la app sí excluye esos depósitos al calcular gasto (tablero del director, reporte mensual, "total incurrido"). Resultado: los meses en que el cliente deposita dinero aparecen como los de "mayor gasto", y el "Total en el periodo" de la gráfica queda inflado y contradice a los demás reportes.
- **Cómo se arregla:** Traer también la categoría de cada transacción en esa consulta y excluir las de depósitos, igual que hace el tablero del director.

### Medio 58. Las flechas de tendencia del panel comparan cifras que no son comparables

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/dashboardService.ts (línea ~51)`
- **Qué pasa:** En las tarjetas del panel, el porcentaje "vs mes ant." compara el acumulado histórico contra lo de un solo mes. "Invertido en nóminas" es la suma de TODAS las nóminas desde el inicio, pero se compara contra lo invertido solo el mes pasado: si llevas RD$50 millones acumulados y el mes pasado invertiste RD$2 millones, la tarjeta dirá "+2400% vs mes ant.", un número sin sentido que siempre se verá como un salto gigante. Lo mismo con "CxP pendientes" (deuda total hoy contra las compras a crédito fechadas el mes pasado). Esas flechas no sirven para detectar si el negocio va mejor o peor.
- **Cómo se arregla:** Comparar mes actual contra mes anterior (dos periodos iguales), o quitar la flecha de las tarjetas acumuladas.

### Medio 59. Los datos bancarios y de préstamos son visibles/editables entre todas las empresas para quien tenga un permiso financiero en cualquier proyecto

- **Módulo:** Seguridad base de datos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/migrations/032_rls_capability_based.sql (línea ~230)`
- **Qué pasa:** Las cuentas bancarias y sus movimientos de dinero no se filtran por empresa ni por proyecto: basta tener un permiso financiero (por ejemplo el rol de Contabilidad) en UN solo proyecto para poder ver y modificar las cuentas y los movimientos de dinero de las 6 empresas del grupo. Para un dueño que centraliza la contabilidad puede ser intencional, pero significa que un usuario de finanzas de una obra ve la información bancaria de todas las demás, sin barrera. Conviene decidirlo a conciencia, no dejarlo por defecto.
- **Cómo se arregla:** Si el aislamiento por empresa importa, cambiar las políticas para exigir la capacidad en el proyecto/empresa dueño de la cuenta (user_has_capability(project_id, ...)) en lugar de 'anywhere'.

### Medio 60. El archivo de datos de ejemplo contiene números de cuenta y cédulas reales y no es a prueba de duplicados

- **Módulo:** Seguridad base de datos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/seed.sql (línea ~61)`
- **Qué pasa:** El archivo de datos de ejemplo trae información sensible real (números de cuenta bancaria y cédulas de personas y proveedores) escrita directamente en el proyecto. Además, esas inserciones no tienen protección contra repetición: si alguien ejecuta este archivo contra la base de datos en producción (por error de 'reset' o a mano), crearía cuentas y registros duplicados con datos reales, ensuciando la información financiera. Guardar datos personales/bancarios reales en los archivos del proyecto también es un riesgo de fuga.
- **Cómo se arregla:** Sustituir por datos ficticios o mover la carga real fuera del repositorio; y añadir ON CONFLICT DO NOTHING (o WHERE NOT EXISTS) para que la carga sea repetible sin duplicar.

---

## ⚪ BAJO — 22 temas

### Bajo 1. La página de Aprobaciones y su exportación a Excel solo muestran los últimos 200 registros

- **Módulo:** Aprobaciones y avisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/pages/AprobacionesPage.tsx (línea ~63)`
- **Qué pasa:** La pantalla de 'Aprobaciones y auditoría' carga solamente los 200 movimientos más recientes, y el botón 'Exportar' guarda en Excel únicamente esos mismos registros (los que están cargados y filtrados). Con el uso diario, 200 registros se llenan rápido: si algún día se necesita revisar una aprobación de hace meses o entregar la auditoría completa, el Excel saldrá incompleto sin ningún aviso. Este patrón de 'listas cortadas sin avisar' ya se señaló en la auditoría anterior (N3) para el Panel, pero esta página quedó igual.
- **Cómo se arregla:** Que la exportación traiga todos los registros por páginas (como ya se hizo con el respaldo Excel), y avisar en pantalla que se está viendo solo lo más reciente.

### Bajo 2. Las funciones de administrar usuarios aceptan peticiones de cualquier origen (pendiente conocido)

- **Módulo:** Usuarios y permisos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `supabase/functions/admin-create-user/index.ts (línea ~30)`
- **Qué pasa:** Las funciones del servidor que crean e invitan usuarios están configuradas para aceptar llamadas desde cualquier página web por defecto. En la práctica el riesgo es bajo porque igual exigen la credencial de un Director válido, pero conviene cerrarlo antes de producción. Esto ya está anotado como pendiente (S6) en el documento de seguridad.
- **Cómo se arregla:** Definir la variable ALLOWED_ORIGIN con el dominio real de la app en la configuración de las funciones antes de salir de pruebas.

### Bajo 3. En órdenes antiguas (sin desglose), el conduce se sube pero se pierde y el material entra sin costo

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~674)`
- **Qué pasa:** Para las órdenes viejas cuya cotización no tiene desglose por líneas, la recepción usa un camino alterno. En ese camino pasan dos cosas malas: (1) si el almacenista adjunta el conduce (la nota de entrega), el archivo se sube a la nube pero nunca se enlaza a la recepción, así que no aparece en la tarjeta de conduces de la orden y queda ilocalizable; (2) el material entra al almacén sin precio, así que su costo promedio no se actualiza y los consumos posteriores pueden valorarse en cero.
- **Cómo se arregla:** Pasar el conduce también al camino alterno y estimar el costo unitario desde el total de la cotización aprobada (total / cantidad solicitada).

### Bajo 4. La numeración de solicitudes se calcula en el navegador y puede chocar entre dos usuarios

- **Módulo:** Compras
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/requisitionService.ts (línea ~20)`
- **Qué pasa:** El número de cada solicitud (REQ-2026-0001, 0002...) se calcula en el navegador buscando el mayor existente y sumando 1. Si dos personas crean una solicitud al mismo tiempo, ambas calculan el mismo número; gracias a un candado en la base de datos la segunda ya no se duplica, pero falla con un error confuso y el usuario tiene que reintentar. Además, si la consulta falla, se usa un número de respaldo sacado de la hora (por ejemplo REQ-2026-5823) que puede chocar en el futuro con la numeración normal. Este problema ya está anotado como pendiente en AUDITORIA_CODIGO_2026-06-08.md (punto R1).
- **Cómo se arregla:** Dejar que la base de datos asigne el número (una secuencia por año) o reintentar automáticamente con el siguiente número cuando el candado rechace el duplicado.

### Bajo 5. El código para aprobar cortes es '1234' y se valida solo en el navegador (problema ya conocido)

- **Módulo:** Cubicaciones y CxP
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/utils/approvalCode.ts (línea ~7)`
- **Qué pasa:** Para aprobar un corte con firma se pide un 'código personal', pero ese código es '1234' por defecto, se guarda en el propio navegador y la verificación ocurre solo en la pantalla: cualquier persona con acceso a la app puede aprobar cortes de dinero. Este problema ya está documentado como pendiente (punto S2 de SEGURIDAD_PENDIENTE_2026-06-08.md); lo repito aquí porque afecta directamente la aprobación de pagos de cubicaciones.
- **Cómo se arregla:** Mover la verificación al servidor (por ejemplo, un código por usuario validado en Supabase) como ya propone el documento de seguridad pendiente.

### Bajo 6. El saldo de las cuentas se suma con aritmética común en vez de la librería de precisión

- **Módulo:** Cuentas y flujo de caja
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/accountMovementService.ts (línea ~51)`
- **Qué pasa:** La app usa una librería especial para sumar dinero sin perder centavos, pero el cálculo del saldo de cada cuenta bancaria (entradas menos salidas) usa la suma común de la computadora, que con decimales puede descuadrar por centavos. Con muchos movimientos, el saldo mostrado puede diferir por centavos del real, y el aviso de 'saldo insuficiente' al crear un préstamo compara contra ese número. Este punto ya está en la auditoría del 8 de junio como N8 ('saldos de cuenta') y solo se corrigió la parte de CxP; esta parte sigue pendiente.
- **Cómo se arregla:** Usar las funciones add/sub/round2 de utils/money.ts dentro de calcSaldo, igual que en el resto de los cálculos de dinero.

### Bajo 7. El mismo trabajo se calcula con dos 'calculadoras' distintas y puede descuadrar centavos entre pantallas

- **Módulo:** Cálculos de dinero
- **Estado:** ✅ Confirmado (doble revisión)
- **Dónde:** `src/utils/costoReal.ts (línea ~47)`
- **Qué pasa:** El costo de una línea de mano de obra (cantidad × precio) se calcula en dos lugares con métodos distintos: la nómina usa la librería de precisión con redondeo bancario, y el 'costo real' del presupuesto y el reporte mensual usan la multiplicación común de la computadora. Verifiqué un caso concreto: una línea de 0.5 × RD$4.37 aporta RD$2.18 al total de la nómina pero RD$2.19 a la columna GASTADO del presupuesto. Son centavos, pero hacen que dos pantallas 'no cuadren' y generan desconfianza al comparar reportes. Este tema ya está anotado parcialmente como N8 en la auditoría del 8 de junio (se corrigió para CxP, pero no aquí).
- **Cómo se arregla:** Hacer que costoReal.ts use las mismas funciones de money.ts (mul/round2) para que todas las pantallas redondeen igual.

### Bajo 8. Un tropiezo momentáneo de red puede expulsar de una pantalla a un usuario que sí tiene permiso

- **Módulo:** Estructura general
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/useAppRoles.ts (línea ~108)`
- **Qué pasa:** Al entrar a pantallas protegidas por rol (Reportes, Préstamos, Aprobaciones, Administrar usuarios), la app consulta al servidor qué permisos tiene el usuario. Si esa consulta falla por un tropiezo de red (frecuente en obra), la app no reintenta ni avisa: simplemente asume que el usuario no tiene ningún permiso y lo devuelve a la pantalla de inicio sin explicación. También desaparecen opciones del menú. Para el usuario parece que 'le quitaron los permisos' al azar, cuando fue solo mala señal.
- **Cómo se arregla:** Distinguir el caso de error: reintentar la consulta o mostrar un mensaje de 'no pudimos verificar tus permisos, reintenta', en vez de expulsar al usuario.

### Bajo 9. Al cerrar sesión no se borra lo que quedó en memoria: el siguiente usuario puede ver proyectos del anterior en el buscador

- **Módulo:** Estructura general
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/layout/Header.tsx (línea ~350)`
- **Qué pasa:** Cerrar sesión solo olvida quién era el usuario, pero deja en la memoria de la app las listas ya cargadas (proyectos, nóminas). Si en el mismo aparato entra otra persona con menos permisos sin recargar la página, el buscador global y algunas pantallas pueden mostrarle por unos instantes (o hasta que carguen sus propios datos) los proyectos que veía el usuario anterior. Combinado con la copia de 5 minutos del navegador (otro hallazgo), el aislamiento entre usuarios en un aparato compartido es débil.
- **Cómo se arregla:** Al cerrar sesión, vaciar también los almacenes en memoria (proyectos, nóminas) y las cachés del navegador, para que cada usuario arranque limpio.

### Bajo 10. El control por lotes está a medias: las entradas manuales y el stock inicial no crean lote

- **Módulo:** Inventario/Almacén
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/inventory/InventoryForms.tsx (línea ~430)`
- **Qué pasa:** La pestaña de 'Lotes' solo se alimenta cuando una recepción de orden de compra trae número de lote o vencimiento. Las entradas registradas a mano desde la página de inventario no ofrecen campos de lote, y al crear un material se le puede poner 'stock inicial' que no genera ni movimiento ni lote. Resultado: la suma de lotes casi nunca cuadra con el stock real, el consumo FIFO se pasa de largo con stock 'sin lote' (solo deja un aviso interno), y el selector de lotes que existe en el código no se usa en ninguna pantalla — es una función a medio construir.
- **Cómo se arregla:** Decidir si los lotes son obligatorios: si sí, pedir lote en toda entrada (incluida la manual) y convertir el stock inicial en un movimiento de entrada; si no, ocultar la pestaña para no mostrar datos incompletos.

### Bajo 11. Errores silenciosos en la página de inventario: si algo falla al cargar o guardar, el usuario no ve nada

- **Módulo:** Inventario/Almacén
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/pages/InventarioPage.tsx (línea ~60)`
- **Qué pasa:** Si falla la carga de materiales/movimientos/lotes (por internet o permisos), la página simplemente queda vacía sin ningún mensaje, como si no hubiera inventario — el almacenista puede creer que se borró todo. Igual al guardar un material nuevo: si falla, no aparece aviso y el formulario se queda abierto sin explicación. Este patrón de errores silenciosos ya está listado como conocido (U2) en AUDITORIA_CODIGO_2026-06-08.md, pero sigue presente en esta página.
- **Cómo se arregla:** Capturar los fallos de carga y guardado y mostrar el mismo aviso rojo que ya usa el registro de movimientos.

### Bajo 12. El 'Invertido' de la página del proyecto suma también los borradores

- **Módulo:** Nómina
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/hooks/useProjectDetailPage.ts (línea ~141)`
- **Qué pasa:** La regla acordada en el código es que solo los reportes aprobados o pagados cuentan como gasto comprometido, y así lo hacen el Panel, el flujo de caja, los reportes PDF y el presupuesto-vs-real. Pero la página de detalle del proyecto suma el total de TODOS los reportes, incluidos borradores y enviados. Escenario: un borrador con RD$800,000 a medio capturar infla la barra de 'Invertido' del proyecto y puede pintarla en rojo (>90% del presupuesto), mientras el Panel muestra otra cifra distinta para el mismo proyecto. Dos pantallas con números diferentes generan desconfianza y decisiones equivocadas.
- **Cómo se arregla:** Filtrar en esa suma solo los reportes aprobados o pagados, igual que hace el Panel.

### Bajo 13. El botón 'Importar asistencia' promete algo que no existe

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/pages/AsistenciaPage.tsx (línea ~107)`
- **Qué pasa:** En la página de asistencia hay un botón verde destacado "Importar asistencia" que abre una ventana con instrucciones detalladas, plantilla de Excel descargable y zona para arrastrar el archivo; pero al hacer clic en la zona de carga solo sale un aviso de "Pronto disponible". Además, la plantilla pide columnas (hora de entrada, hora de salida) que la app ni siquiera guarda: los registros de asistencia solo almacenan cantidad de trabajadores, horas y actividad. Alguien puede llenar la plantilla con todo su personal y descubrir al final que no hay forma de cargarla.
- **Cómo se arregla:** Ocultar el botón hasta que la importación funcione, o implementarla alineando la plantilla con los campos reales del registro.

### Bajo 14. Borrar una tarea del cronograma pide confirmación dos veces con mensajes distintos

- **Módulo:** Obra (cronograma/asistencia/calidad)
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/features/schedule/ScheduleTaskTable.tsx (línea ~248)`
- **Qué pasa:** Al eliminar una tarea del cronograma aparecen dos ventanas de confirmación seguidas: la primera (dentro de la tabla) sí advierte que las subtareas también se eliminarán; la segunda (de la página) solo pregunta "¿Eliminar esta tarea del cronograma?" sin mencionar las subtareas. Es confuso y, quien confirme rápido la segunda sin haber leído la primera, puede borrar todas las subtareas de un capítulo sin darse cuenta (el borrado en cadena es real: la base de datos elimina las hijas junto con el padre).
- **Cómo se arregla:** Dejar una sola confirmación (la que advierte sobre las subtareas, idealmente diciendo cuántas son) y que esa misma ejecute el borrado.

### Bajo 15. Hay dos versiones de la cola offline: una está muerta y la única prueba automática está apagada

- **Módulo:** Sin internet / App instalable
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/offlineQueue.ts (línea ~1)`
- **Qué pasa:** Existen dos archivos que implementan la misma 'libreta de pendientes' offline. El de src/services/ no lo usa nadie en la app (solo lo importa una prueba que está desactivada), y el que sí está conectado (src/utils/) no tiene ninguna prueba automática. No chocan entre sí porque usan almacenes distintos, pero es una trampa para el futuro: alguien puede 'arreglar' o conectar el archivo equivocado. Esto ya está anotado como parte de R3 en AUDITORIA_CODIGO_2026-06-08.md ('código duplicado muerto de esa cola').
- **Cómo se arregla:** Borrar el archivo duplicado de src/services/ junto con su prueba desactivada, y escribir pruebas (con fake-indexeddb) para la cola que sí se usa.

### Bajo 16. Dos avisos de 'Sin conexión' aparecen a la vez y uno tapa la parte superior de la pantalla

- **Módulo:** Sin internet / App instalable
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/components/pwa/OfflineIndicator.tsx (línea ~41)`
- **Qué pasa:** Cuando se va el internet aparecen dos carteles al mismo tiempo: una franja roja fija arriba de todo ('Sin conexion') y otra franja oscura dentro de la app ('Sin conexión. Las solicitudes y avances se guardan localmente...'). La franja roja queda fija encima del encabezado y puede tapar los botones del menú mientras dure el corte de red. Es confuso ver dos mensajes distintos (uno de ellos con una promesa falsa, ver hallazgo 1) sobre lo mismo.
- **Cómo se arregla:** Dejar un solo aviso de sin conexión (el del layout, que además muestra los pendientes) y eliminar o reposicionar la franja roja global.

### Bajo 17. Por la noche (después de ~8 PM) las cuotas que vencen hoy aparecen como 'Vencidas' y los pagos se anotan con fecha de mañana

- **Módulo:** Préstamos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/loanService.ts (línea ~77)`
- **Qué pasa:** Para saber 'qué día es hoy', la app usa la hora universal (UTC) en vez de la hora de República Dominicana (4 horas atrás). Desde las 8:00 PM hora local, para la app ya es 'mañana'. Consecuencias: una cuota que vence hoy se pinta en rojo como 'Vencida' esa misma noche (contador de vencidas incluido), y al registrar un pago de noche la fecha propuesta es la de mañana, quedando el cobro anotado con el día equivocado en el recibo y en la cuenta. Curiosamente, el aviso del servidor sí usa la zona horaria correcta; es solo la app la que se adelanta.
- **Cómo se arregla:** Usar en la app la misma función de 'hoy en Santo Domingo' que ya usa el servidor de avisos.

### Bajo 18. Al repartir pagos de nómina, dos registros al mismo tiempo pueden pasarse del total del período

- **Módulo:** Préstamos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/paymentDistributionService.ts (línea ~62)`
- **Qué pasa:** Al crear un pago dentro de la distribución de un período de nómina, la app primero consulta cuánto va repartido y luego guarda el nuevo pago si cabe. Como son dos pasos separados, si dos personas registran pagos al mismo tiempo, ambas consultas ven el mismo 'espacio disponible' y las dos pasan: el total repartido puede superar el total del período. Este mismo problema ya se arregló para la acción de 'sumar a un pago existente' con una operación atómica en la base de datos, pero la creación de pagos nuevos quedó con el método viejo. La auditoría del 8 de junio ya mencionaba este tipo de riesgo (punto R2); quedó a medio resolver.
- **Cómo se arregla:** Usar para la creación el mismo mecanismo atómico en la base de datos que ya existe para sumar montos.

### Bajo 19. Si se borran todas las partidas vacías, las 23 predeterminadas reaparecen al volver a entrar

- **Módulo:** Presupuestos
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/services/budgetCategoryService.ts (línea ~39)`
- **Qué pasa:** Cada vez que se abre la pantalla de Presupuesto de un proyecto sin partidas, la app crea automáticamente las 23 partidas predeterminadas. Si el usuario usa 'Limpiar partidas vacías' y borra todas (en un proyecto que aún no tiene presupuesto cargado), al salir y volver a entrar las 23 vuelven a aparecer: el trabajo de limpieza se deshace solo, una y otra vez.
- **Cómo se arregla:** Crear las partidas predeterminadas solo al crear el proyecto (o recordar con una marca que el usuario las eliminó) en vez de recrearlas en cada visita.

### Bajo 20. En la pantalla de Avances, la columna "Partida" del historial casi siempre sale vacía

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/pages/AvancesPage.tsx (línea ~112)`
- **Qué pasa:** El historial de avances por partida muestra "—" en la columna "Partida" para casi todos los registros. La lista de partidas solo se carga cuando eliges un capítulo en el formulario de captura (que normalmente está cerrado), así que la tabla no sabe el nombre de las partidas ya registradas. El usuario ve fechas y porcentajes pero no sabe a qué partida corresponden, lo que le quita utilidad al historial que alimenta la cubicación mensual.
- **Cómo se arregla:** Cargar las partidas de todos los capítulos del proyecto al abrir la página (o traer el nombre de la partida junto con cada avance) para que el historial siempre las muestre.

### Bajo 21. El Excel del tablero del Director exporta los montos como texto, no como números

- **Módulo:** Reportes y exportaciones
- **Estado:** 🔎 Por reconfirmar
- **Dónde:** `src/pages/DirectorDashboard.tsx (línea ~52)`
- **Qué pasa:** Al exportar el tablero del Director a Excel, las columnas de presupuesto, ejecutado, desviación y CxP se guardan como texto (por convertirlas con decimales fijos antes de exportar). En Excel esas celdas no se pueden sumar, promediar ni ordenar correctamente como números, que es justo lo que uno hace con este tipo de archivo. El export del Resumen Financiero sí guarda números de verdad, así que los dos archivos se comportan distinto.
- **Cómo se arregla:** Pasar los montos como números (sin toFixed) y dejar el formato de dos decimales a Excel.

### Bajo 22. Cualquier usuario puede borrar o renombrar el catálogo compartido de unidades de medida

- **Módulo:** Seguridad base de datos
- **Estado:** ✅ Confirmado (revisión directa)
- **Dónde:** `supabase/migrations/089_measure_units_catalog.sql (línea ~28)`
- **Qué pasa:** La lista de unidades de medida (M², Unidad, Día, Quintal, etc.) que aparece en los menús desplegables de presupuesto, compras y nómina es compartida por todos, y su regla de acceso deja que cualquier usuario con sesión no solo la lea, sino que agregue, cambie o borre entradas. Un usuario descuidado o malintencionado podría borrar unidades que otros están usando y desordenar los formularios para toda la empresa.
- **Cómo se arregla:** Dejar el SELECT abierto pero limitar INSERT/UPDATE/DELETE a un permiso administrativo (por ejemplo current_user_is_director() o una capacidad de configuración).
