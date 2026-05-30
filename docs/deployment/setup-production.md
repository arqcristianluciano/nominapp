# Setup Producción - NominApp

Guía paso a paso para desplegar NominApp en producción (Supabase + Vercel).

## 1. Crear proyecto Supabase

### Opción A: Proyecto nuevo

1. Ir a https://supabase.com/dashboard y crear un nuevo proyecto.
2. Elegir región (recomendado: `us-east-1` o la más cercana a México).
3. Generar y guardar la contraseña de la base de datos en un gestor seguro.
4. Esperar a que el proyecto quede provisionado (~2 min).
5. En `Settings > API` copiar:
   - `Project URL` → será `VITE_SUPABASE_URL`
   - `anon public` key → será `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → solo para backend/CI (nunca exponer al cliente)

### Opción B: Conectar a proyecto existente

1. Vincular CLI: `npx supabase login` y luego `npx supabase link --project-ref <REF>`.
2. Confirmar conexión: `npx supabase projects list`.

## 2. Aplicar migraciones

Las migraciones viven en `supabase/migrations/` (001 a 020+).

### Opción A: Supabase CLI (recomendado)

```bash
npx supabase db push
```

Esto aplica todas las migraciones pendientes en orden. Para verificar:

```bash
npx supabase migration list
```

### Opción B: MCP Supabase

Usar `apply_migration` por cada archivo en orden numérico (001 → 020+). Validar con `list_migrations` y `list_tables` que existan: `user_profiles`, `companies`, `projects`, `project_members`, `purchase_orders`, `push_subscriptions`, `approvals`, etc.

### Validación post-migración

```bash
npx supabase db diff   # debe estar vacío
```

Revisar `get_advisors` (MCP) para asegurar que no haya warnings de RLS o seguridad.

## 3. Variables de entorno en Vercel

En `Project Settings > Environment Variables` (scope: Production, Preview, Development):

| Variable                     | Valor                             | Ejemplo                             |
| ---------------------------- | --------------------------------- | ----------------------------------- |
| `VITE_SUPABASE_URL`          | URL del proyecto Supabase         | `https://xxxxx.supabase.co`         |
| `VITE_SUPABASE_ANON_KEY`     | Clave anon (pública)              | `eyJhbGciOi...`                     |
| `VITE_PUSH_VAPID_PUBLIC_KEY` | VAPID public key (paso 8)         | `BNxxx...`                          |
| `VITE_SENTRY_DSN`            | DSN de Sentry (proyecto frontend) | `https://xxx@o0.ingest.sentry.io/0` |
| `VITE_SENTRY_RELEASE`        | Tag de release (commit SHA)       | `nominapp@1.0.0`                    |

Tras agregarlas, redeploy para que apliquen. El prefijo `VITE_` es obligatorio para que Vite las exponga al cliente.

## 4. Secrets en Supabase Functions

Las Edge Functions (`admin-create-user`, `send-push`) requieren secrets. Setear desde CLI:

```bash
npx supabase secrets set ALLOWED_ORIGIN=https://nominapp.vercel.app
npx supabase secrets set VAPID_PUBLIC_KEY=BNxxx...
npx supabase secrets set VAPID_PRIVATE_KEY=xxxxx
npx supabase secrets set VAPID_SUBJECT=mailto:admin@nominapp.com
```

Verificar: `npx supabase secrets list`.

Deploy de las functions:

```bash
npx supabase functions deploy admin-create-user
npx supabase functions deploy send-push
```

## 5. Primer deploy a Vercel

1. Importar repo desde https://vercel.com/new (GitHub).
2. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
3. Confirmar las env vars del paso 3.
4. Hacer push a `main`:
   ```bash
   git push origin main
   ```
5. Vercel detecta el push y dispara el deploy automáticamente.
6. Verificar build en `Deployments`. Una vez `Ready`, abrir la URL y comprobar que la SPA carga.

## 6. Crear el primer Director General

Como no hay usuarios todavía, debe crearse manualmente vía SQL. En `SQL Editor` de Supabase (o `execute_sql` MCP):

```sql
-- 1. Crear usuario en auth.users (Supabase Auth)
-- Mejor: usar Dashboard > Authentication > Add user > Create new user
-- y luego copiar el UUID generado.

-- 2. Crear perfil con rol director_general
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
) VALUES (
  '<UUID_DEL_USUARIO_AUTH>',
  'director@empresa.com',
  'Director General',
  'director_general',
  true,
  now()
);
```

Validar:

```sql
SELECT id, email, role, is_active FROM user_profiles WHERE role = 'director_general';
```

## 7. Crear primera empresa y proyecto

Login con el Director General desde la app, luego desde la UI:

1. **Empresa**: ir a `Configuración > Empresas > Nueva empresa`. Llenar RFC, razón social, dirección.
2. **Proyecto**: ir a `Proyectos > Nuevo proyecto`. Asignar empresa, fechas, presupuesto inicial.

Alternativamente vía SQL:

```sql
INSERT INTO public.companies (name, rfc, created_by)
VALUES ('Mi Empresa SA de CV', 'XAXX010101000', '<UUID_DG>')
RETURNING id;

INSERT INTO public.projects (name, company_id, start_date, end_date, created_by)
VALUES ('Obra Piloto', '<COMPANY_ID>', '2026-01-01', '2026-12-31', '<UUID_DG>');
```

## 8. Activar push notifications

Generar par de claves VAPID:

```bash
npx web-push generate-vapid-keys
```

Salida ejemplo:

```
Public Key:  BNxxxxxxxxxx...
Private Key: yyyyyyyy...
```

1. Copiar `Public Key` → setear en Vercel como `VITE_PUSH_VAPID_PUBLIC_KEY` y en Supabase como `VAPID_PUBLIC_KEY`.
2. Copiar `Private Key` → setear en Supabase como `VAPID_PRIVATE_KEY` (nunca en Vercel/cliente).
3. Setear `VAPID_SUBJECT` con un `mailto:` válido del operador.
4. Redeploy de Vercel y de la function `send-push` para que tomen los nuevos secrets.
5. Probar desde la app: `Perfil > Notificaciones > Activar`. Verificar que la suscripción quede en `push_subscriptions`.

## Checklist final

- [ ] Migraciones aplicadas (`migration list` sin pendientes)
- [ ] Env vars en Vercel (5 variables `VITE_*`)
- [ ] Secrets en Supabase (4 secrets)
- [ ] Edge functions desplegadas (`admin-create-user`, `send-push`)
- [ ] Primer Director General creado y puede hacer login
- [ ] Primera empresa y proyecto creados
- [ ] Push notifications funcionando en al menos un dispositivo
- [ ] Sentry recibiendo eventos (provocar un error de prueba)
