# Troubleshooting NominApp

Guia rapida de diagnostico para incidencias comunes. Las soluciones incluyen comandos de consola del navegador y SQL contra Supabase cuando aplica.

## 1. "No me deja crear proyecto"

Sintoma: el boton "Nuevo proyecto" no responde, o aparece un error de permisos.

Diagnostico:

1. Verificar la capability del usuario en la sesion actual:

   ```js
   // Consola del navegador
   const { data } = await supabase.auth.getUser()
   console.log('user.id:', data.user?.id)
   console.log('app_metadata:', data.user?.app_metadata)
   ```

2. Confirmar que el rol incluye la capability `projects.create`:

   ```sql
   select r.name, c.key
   from user_roles ur
   join roles r on r.id = ur.role_id
   join role_capabilities rc on rc.role_id = r.id
   join capabilities c on c.id = rc.capability_id
   where ur.user_id = '<USER_ID>';
   ```

3. Revisar que el trigger `handle_new_project` este activo y no falle por RLS. Buscar en Sentry el breadcrumb `projects.create:rls_denied`.

## 2. "Push no llega"

Sintoma: el usuario activa notificaciones pero no recibe pushes.

Diagnostico:

1. Verificar VAPID keys en el cliente:

   ```js
   console.log('VAPID public:', import.meta.env.VITE_VAPID_PUBLIC_KEY)
   const reg = await navigator.serviceWorker.ready
   const sub = await reg.pushManager.getSubscription()
   console.log('subscription:', sub?.toJSON())
   ```

2. Confirmar que la subscription esta persistida en la tabla `push_subscriptions`:

   ```sql
   select endpoint, created_at, last_seen_at
   from push_subscriptions
   where user_id = '<USER_ID>'
   order by created_at desc;
   ```

3. Si la subscription existe pero no llega: revisar logs de la edge function `send-push` (`get_logs` en Supabase). Errores `410 Gone` indican que hay que eliminar la subscription.

## 3. "Login dice credenciales incorrectas"

Sintoma: el usuario insiste en que la contrasena es correcta pero el login falla.

Diagnostico:

1. Reproducir en consola sin el formulario:

   ```js
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: '...',
   })
   console.log({ data, error })
   ```

2. Validar el estado del usuario en Supabase Auth:

   ```sql
   select id, email, email_confirmed_at, banned_until, deleted_at
   from auth.users
   where email = 'user@example.com';
   ```

3. Si `email_confirmed_at` es null: reenviar el email de confirmacion. Si `banned_until` esta en el futuro: revisar por que se aplico el ban.

## 4. "Pierdo cambios al recargar"

Sintoma: el usuario edita algo offline o con conexion intermitente y los cambios desaparecen tras recargar.

Diagnostico:

1. Inspeccionar la cola offline en IndexedDB:

   ```js
   const db = await indexedDB.open('nominapp-offline')
   // En DevTools: Application -> IndexedDB -> nominapp-offline -> mutations
   ```

2. Confirmar que el service worker esta sincronizando:

   ```js
   const reg = await navigator.serviceWorker.ready
   const tags = await reg.sync.getTags()
   console.log('pending sync tags:', tags)
   ```

3. Si hay mutations atascadas: revisar la columna `error` de cada entrada. Errores 4xx requieren resolucion manual; 5xx se reintentan automaticamente.

## 5. "Boton aparece deshabilitado"

Sintoma: un boton de accion (aprobar, exportar, eliminar) esta visible pero gris.

Diagnostico:

1. La logica de UI consulta `useCapability(key)`. Inspeccionar en consola:

   ```js
   // Dentro del componente, en React DevTools
   // Hooks -> capabilities -> ver el set actual
   ```

2. Confirmar el rol asignado:

   ```sql
   select r.name from user_roles ur
   join roles r on r.id = ur.role_id
   where ur.user_id = '<USER_ID>';
   ```

3. Si el rol es correcto pero falta la capability, revisar `role_capabilities` y aplicar el seed migrations correspondiente.

## 6. "PDF mensual no descarga"

Sintoma: se hace click en "Descargar PDF" y no pasa nada o sale error.

Diagnostico:

1. Abrir consola y reproducir. Buscar errores de pdfmake:

   ```
   Error: File 'Roboto-Regular.ttf' not found in virtual file system
   ```

2. Confirmar que las fuentes estan cargadas:

   ```js
   import pdfMake from 'pdfmake/build/pdfmake'
   import pdfFonts from 'pdfmake/build/vfs_fonts'
   pdfMake.vfs = pdfFonts.pdfMake.vfs
   console.log(Object.keys(pdfMake.vfs).filter((k) => k.includes('Roboto')))
   ```

3. Si el array esta vacio: el import de `vfs_fonts` se rompio (suele pasar con tree-shaking agresivo). Forzar el import en el bundle.

## 7. "Error 403 al guardar"

Sintoma: al guardar un registro aparece `403 Forbidden` o `new row violates row-level security policy`.

Diagnostico:

1. Identificar la tabla y la operacion en Network tab. Luego inspeccionar la policy:

   ```sql
   select polname, polcmd, polqual, polwithcheck
   from pg_policy
   where polrelid = '<schema>.<table>'::regclass;
   ```

2. Verificar que el usuario tiene la capability requerida por la policy:

   ```sql
   select has_capability('<USER_ID>'::uuid, '<capability_key>');
   ```

3. Si la policy usa `auth.uid()`: confirmar que el JWT no expiro (`supabase.auth.getSession()`).

## 8. "Sentry no captura errores"

Sintoma: hay errores en produccion pero el proyecto en Sentry esta vacio.

Diagnostico:

1. Verificar la DSN en el bundle:

   ```js
   console.log('SENTRY DSN:', import.meta.env.VITE_SENTRY_DSN)
   ```

2. Forzar un evento de prueba:

   ```js
   import * as Sentry from '@sentry/react'
   Sentry.captureMessage('debug ping', 'info')
   ```

3. Revisar `tracesSampleRate` y `replaysSessionSampleRate` en `sentry.client.ts`. En produccion con `sampleRate: 0` no se enviara nada. Confirmar tambien que el ad-blocker no este bloqueando `sentry.io`.

## 9. "Tras la actualizacion de seguridad RLS, un usuario no ve datos que antes veia"

Sintoma: despues de aplicar las migraciones de la auditoria (0.6.0), un usuario reporta que ya no ve proyectos, nominas, compras u otros registros que antes si aparecian.

Causa: la migracion 043 cerro un leak cross-tenant en las lecturas. Antes el SELECT era demasiado permisivo y exponia datos de otros proyectos/empresas. Ahora el SELECT esta acotado a la membresia: el usuario solo ve datos de los proyectos donde es miembro (`project_members`), salvo que tenga un rol de director (acceso global a su empresa). No es un bug: es el comportamiento correcto.

Diagnostico:

1. Confirmar si el usuario es miembro del proyecto en cuestion:

   ```sql
   select pm.project_id, pm.role, p.name
   from project_members pm
   join projects p on p.id = pm.project_id
   where pm.user_id = '<USER_ID>';
   ```

2. Revisar si el usuario tiene un rol de director (acceso amplio):

   ```sql
   select r.name from user_roles ur
   join roles r on r.id = ur.role_id
   where ur.user_id = '<USER_ID>';
   ```

Resolucion:

- Si el acceso es legitimo, dar de alta al usuario como miembro del proyecto:

  ```sql
  insert into project_members (user_id, project_id, role)
  values ('<USER_ID>', '<PROJECT_ID>', '<ROL>');
  ```

  O hacerlo desde la UI en `/admin/usuarios`, asignando el proyecto y el rol correspondiente.

- Si el usuario necesita visibilidad global de la empresa, asignarle un rol de director en lugar de agregarlo proyecto por proyecto.
- Tras el cambio, el usuario debe recargar la sesion (cerrar y volver a abrir, o `supabase.auth.refreshSession()`) para que el nuevo contexto de RLS aplique.
