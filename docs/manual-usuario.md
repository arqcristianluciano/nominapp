# Manual de Usuario — NominApp

## Introduccion

**NominApp** es el sistema de administracion de construccion de THE HOUSE & CO. Integra en un solo lugar la gestion de proyectos, presupuestos, nominas, compras, almacen, finanzas y reportes ejecutivos. Esta organizado por **roles**: cada usuario ve solo los modulos y acciones que le corresponden a su funcion en la obra o en la empresa.

Este manual da una vision general y enlaza al manual detallado de cada rol.

### Modulos principales

- **Proyectos** — creacion y configuracion de obras.
- **Presupuesto / Lista de precios / Mercado** — control economico.
- **Nomina** — captura, aprobacion y dispersion de pagos al personal.
- **Requisiciones y Ordenes de Compra (OC)** — ciclo de compras.
- **Inventario / Almacen** — kardex, entradas y salidas.
- **Obra** — bitacora, asistencia, calidad, avances, cortes.
- **Contratos** — subcontratistas y cortes de obra.
- **Finanzas** — libro diario, CxP, cheques, conciliacion bancaria.
- **Director Dashboard** — KPIs cross-empresa y aprobaciones finales.
- **Admin de usuarios** — alta de personas, roles y matriz de capabilities.

### Roles cubiertos en este manual

| Rol                      | Alcance                     | Manual detallado                                                            |
| ------------------------ | --------------------------- | --------------------------------------------------------------------------- |
| Director General         | Cross-empresa, bypass total | [docs/roles/director-general.md](roles/director-general.md)                 |
| Director de Proyecto     | Un proyecto, full control   | [docs/roles/director-proyecto.md](roles/director-proyecto.md)               |
| Planificacion            | Presupuesto y cronograma    | [docs/roles/planificacion.md](roles/planificacion.md)                       |
| Ingeniero de Obra        | Operacion en campo          | [docs/roles/ingeniero-obra.md](roles/ingeniero-obra.md)                     |
| Supervisor Especializado | Solo lectura de su area     | [docs/roles/supervisor-especializado.md](roles/supervisor-especializado.md) |
| Comprador                | Ciclo de compras            | [docs/roles/comprador.md](roles/comprador.md)                               |
| Almacenista              | Inventario fisico           | [docs/roles/almacenista.md](roles/almacenista.md)                           |
| Contabilidad             | Libro diario, CxP, bancos   | [docs/roles/contabilidad.md](roles/contabilidad.md)                         |

---

## Onboarding (primer acceso)

1. **Recibir invitacion.** El Administrador o Director crea tu usuario en `/admin/usuarios` y te llega un correo con el enlace de activacion.
2. **Definir contrasena.** Sigue el enlace, define contrasena y confirma. Recomendado: activar 2FA.
3. **Seleccionar empresa / proyecto.** Si tienes acceso a multiples empresas o proyectos, el primer login te pide elegir el contexto activo. Puedes cambiarlo despues desde el selector superior.
4. **Conocer tu dashboard.** Cada rol ve un dashboard distinto: revisa primero las **alertas** y las **bandejas pendientes**.
5. **Atajo de ayuda.** Pulsa `?` en cualquier pantalla para ver la ayuda contextual y los atajos disponibles.
6. **App movil.** Ingeniero y Almacenista deberian instalar la PWA en su celular (boton "Anadir a inicio" del navegador).

> Modo demo: si abres la app sin credenciales de Supabase configuradas, se carga con datos de prueba en memoria. Util para entrenamiento sin afectar produccion.

---

## Vision general por rol

### Director General

Maximo privilegio. Identificado por `is_director = true`, hace **bypass de toda la matriz de capabilities**. Ve todas las empresas del tenant, crea proyectos, asigna roles, aprueba nominas / OC / cortes / contratos a nivel final. Su dashboard ejecutivo (`/director`) consolida KPIs cross-empresa.

Flujo mensual: crear proyectos > asignar equipo > revisar avances mid-mes > aprobar pagos al cierre.

### Director de Proyecto

Responsable de UN proyecto. Edita presupuesto, aprueba OC y nominas (sin excedente), firma cortes, ve finanzas del proyecto. **No puede** crear empresas, crear usuarios ni ver otros proyectos. OC con excedente se enrutan al Director General.

### Planificacion

Estrategia economica: presupuesto, lista de precios, catalogo Mercado, avances fisicos, cronograma Gantt. Aprueba cambios de precio que reportan los Compradores. Veta requisiciones fuera de presupuesto.

### Ingeniero de Obra

Operativo de campo. Captura nomina del personal de obra, lleva bitacora diaria con fotos geolocalizadas, valida asistencia (biometrica o geocerca), levanta requisiciones, emite cortes de obra. Trabaja idealmente desde la PWA movil con soporte offline.

### Supervisor Especializado

**Solo lectura.** Consulta empleados, asistencia, resumenes de nomina y reportes de su area asignada. Todas sus consultas quedan en log de acceso. No aprueba ni modifica nada.

### Comprador

Ciclo de compras: recibe requisiciones aprobadas, carga cotizaciones (3 cotizaciones para montos > DOP $20,000), selecciona ganadora, libera OC. Mantiene catalogo de materiales, suplidores y contratistas. **No** crea requisiciones ni recibe mercancia.

### Almacenista

Inventario fisico. Recibe OC contra factura/conduce, despacha al frente de trabajo, hace ajustes (mermas, conteo fisico). Es el unico rol con `override_stock`. Recepciones > 5% de variacion alertan al Director.

### Contabilidad

Registro financiero: libro diario (asientos, balance, cierre de periodo), CxP (facturas, retenciones, antiguedad de saldos), cheques (emision, anulacion, impresion), cuentas bancarias (conciliacion). **No** accede a calculo de nomina ni gestion de usuarios.

---

## Flujos transversales clave

### Ciclo de compra extremo a extremo

1. **Ingeniero** levanta requisicion desde el frente de obra.
2. **Planificacion** verifica que entre en presupuesto.
3. **Comprador** carga 2-3 cotizaciones y selecciona ganadora.
4. **Director de Proyecto** aprueba (o **Director General** si hay excedente).
5. **Comprador** libera OC, congela precios y notifica al suplidor + almacenista.
6. **Almacenista** recibe la mercancia, registra conduce y cantidades.
7. **Contabilidad** registra factura en CxP, programa pago y emite cheque/transferencia.

### Ciclo de nomina

1. **Ingeniero / capturista** arma prenomina con asistencias, destajos y deducciones.
2. **Ingeniero** cierra la prenomina; sistema calcula percepciones y neto.
3. **Director de Proyecto** revisa contra presupuesto y aprueba (o rechaza con comentario).
4. **Director General** da aprobacion final si aplica.
5. **Tesoreria / Contabilidad** ejecuta layout bancario para dispersion.
6. **Contabilidad** registra asiento contra el presupuesto del proyecto.

### Ciclo de corte de obra

1. **Ingeniero** captura avances del periodo, adjunta memoria y fotos.
2. **Planificacion** valida avances contra cronograma y presupuesto.
3. **Director de Proyecto** firma el corte.
4. **Director General** lo aprueba si supera umbral.
5. **Contabilidad** programa pago al contratista.

---

## Funciones recientes (v0.5.0)

### Generar reporte mensual PDF

El reporte mensual consolida en un solo PDF el resumen ejecutivo, la nomina, las compras y los avances del proyecto. Util para juntas de cierre con el Director.

1. Entra al modulo **Reportes** desde el sidebar.
2. Abre **Reporte mensual**.
3. Selecciona el **proyecto** y el **mes** que quieres reportar.
4. Pulsa **Generar**. El PDF se descarga en pocos segundos con las 4 secciones armadas.

> Tip: si una seccion sale vacia, revisa que la nomina del mes este aprobada y que los avances esten capturados antes de generar.

### Instalar la app en tu telefono

NominApp funciona como PWA: se instala como una app nativa y soporta uso offline en Bitacora, Asistencia y Requisiciones.

- **Android (Chrome / Edge):** al entrar a la app desde el navegador, aparece un prompt **"Anadir a pantalla de inicio"**. Si no sale, abre el menu del navegador (los tres puntos) y elige **Instalar app** o **Anadir a inicio**.
- **iOS (Safari):** pulsa el icono de **Compartir** (cuadrado con flecha arriba) y elige **Anadir a inicio**. La app aparece como icono independiente.

Una vez instalada, abrela desde el icono y haz login normal. Ingeniero y Almacenista la necesitan para trabajar en obra.

### Tomar fotos en Asistencia y Bitacora

Ahora puedes adjuntar foto en la captura de asistencia diaria y en las entradas de bitacora. La asistencia ademas guarda la geolocalizacion (GPS) del dispositivo.

1. Entra a **Asistencia** o **Bitacora** desde el frente de obra.
2. Pulsa **Tomar foto** dentro del registro.
3. La primera vez el navegador pide permisos de **camara** (y de **ubicacion** en Asistencia). Acepta para continuar.
4. Captura la foto, revisa la previsualizacion y guarda.

> Si tu telefono niega el permiso, ve a los ajustes del navegador y habilita camara/ubicacion para el dominio de NominApp.

### Cambiar idioma (ES / EN)

La app soporta espanol e ingles. El selector de idioma esta en el **sidebar** (barra lateral izquierda), abajo del menu principal. Elige **ES** o **EN** y la interfaz se traduce al instante. La preferencia queda guardada en tu usuario.

### Invitar usuarios por email

Como administrador puedes invitar personas por correo sin tener que armar su cuenta manualmente: el sistema envia un email con el enlace de alta.

1. Entra a `/admin/usuarios`.
2. Pulsa **Nueva persona**.
3. En el modal, abre la pestana **Invitar por email**.
4. Captura el correo, el rol y los proyectos asignados.
5. Pulsa **Enviar invitacion**. La persona recibe el correo y define su contrasena al entrar.

> El invitado queda en estado `pendiente` hasta que activa su cuenta. Desde la lista de usuarios puedes reenviar la invitacion si caduca.

---

## FAQs

**No veo un modulo que esperaba ver.**
Cada modulo depende de capabilities asignadas a tu rol. Pide al Administrador que revise tu rol en `/admin/usuarios → Roles` y la matriz de capabilities en la pestana **Matriz**.

**No puedo aprobar una OC con excedente, aunque soy Director de Proyecto.**
Es por diseno. El DP no aprueba OC que excedan el presupuesto disponible: o **reasigna fondos** desde otra partida, o **enruta al Director General** para autorizar el sobrecosto.

**Mi cambio en la matriz de capabilities no se ve reflejado.**
Cierra sesion y vuelve a entrar. Las capabilities se cachean en el cliente; el hook las recarga al iniciar sesion.

**Trabajo en obra sin senal: pierdo los datos?**
No. La PWA (Ingeniero y Almacenista) funciona offline y sincroniza al recuperar conexion. Bitacora, asistencia y requisiciones quedan en cola local.

**Como cambio de empresa o proyecto activo?**
Selector superior en la barra de navegacion. El Director General ve todas; los demas roles solo ven aquellos a los que esten asignados via `project_members`.

**Que pasa si anulo un asiento contable?**
Se requiere justificacion escrita, queda en log de auditoria con datos previos y nuevos. Asientos de periodos cerrados no se pueden anular: hay que abrir el periodo primero (privilegio de Contabilidad).

**Puedo borrar un material del catalogo?**
No, solo marcarlo como `inactivo`. Materiales con movimientos historicos (OC, kardex) son inmutables para conservar trazabilidad.

**Aparece una alerta de "variacion atipica" en mi nomina.**
El sistema marca diferencias > 15% contra el periodo anterior. Revisa altas/bajas de personal, bonos extraordinarios o finiquitos antes de aprobar.

**Como exporto un reporte?**
La mayoria de pantallas tienen el atajo `Ctrl + E` para exportar a Excel. Reportes contables y de auditoria tambien exportan a PDF.

**Quien firma los contratos con subcontratistas?**
El Comprador prepara la ficha y carga cotizaciones, pero la firma corresponde al **Director de Proyecto** o **Director General** (capability `sign_contract`).

**Que es el modo demo?**
Si la app arranca sin variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, usa un cliente Supabase mock con datos en memoria. Ideal para entrenamiento, onboarding o demos sin tocar produccion. Detalles en `README.md > Demo mode`.

---

## Soporte

- Documentacion tecnica y migraciones: `/README.md`, `/PROJECT.md`, `/CHANGELOG.md`.
- Manuales detallados por rol: carpeta [`docs/roles/`](roles/).
- Esquema de base de datos: `supabase/migrations/`.
- Reportar incidencias: contacta al Administrador de tu empresa o al equipo de soporte de THE HOUSE & CO.
