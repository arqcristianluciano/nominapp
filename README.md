# NominaAPP

Sistema de administración de construcción para THE HOUSE & CO.

## Stack

- React 19 + TypeScript + Vite 8
- React Router v7
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth + RLS + Storage)
- Zustand (estado global)
- TanStack Query (data fetching)
- Vitest (unit) + Playwright (e2e)
- Sentry (errores en producción)
- PWA responsive

## Setup

### Prerequisitos

- Node.js 18+ (recomendado 20 LTS)
- npm 10+
- Supabase CLI (opcional, solo para correr Supabase en local o aplicar migraciones desde la consola)

### Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno (opcional, ver "Demo mode")
cp .env.example .env
# Editar .env con tus credenciales de Supabase:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY

# Iniciar desarrollo
npm run dev
```

## Comandos

| Comando            | Descripción                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Servidor de desarrollo (Vite, HMR)           |
| `npm run build`    | Type-check + build de producción             |
| `npm run preview`  | Sirve el build de producción localmente      |
| `npm run lint`     | ESLint sobre todo el repo                    |
| `npm test`         | Unit tests (Vitest, single run)              |
| `npm run test:watch` | Vitest en modo watch                       |
| `npm run test:ui`  | UI interactiva de Vitest                     |
| `npm run test:e2e` | Tests end-to-end con Playwright              |

## Estructura

```
src/
  components/     → UI y features (auth, layout, ui, features)
  pages/          → Páginas/rutas (Dashboard, Projects, Payroll, CxP, ...)
  hooks/          → Lógica reutilizable (useAppRoles, useProjectRoles, ...)
  services/       → Interacción con Supabase (uno por dominio)
  stores/         → Estado global Zustand (auth, payroll, project, theme)
  types/          → Interfaces TypeScript
  utils/          → Funciones puras
  constants/      → Valores fijos
  lib/            → Config (supabase, router, mockSupabase, seeds)
supabase/
  migrations/     → SQL migrations versionadas
  functions/      → Edge functions
  seed.sql        → Datos iniciales
e2e/              → Specs de Playwright
```

## Deploy

Deploy automático a **Vercel** al hacer push a `main`. La configuración (cache headers y rewrites para SPA) vive en `vercel.json`. Variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, Sentry, etc.) se configuran en el dashboard de Vercel.

## Demo mode

La app detecta automáticamente si está en modo demo. En `src/lib/supabase.ts`:

```ts
const isDemo = !supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co'
export const supabase = isDemo ? mockSupabase : createClient(...)
export const isDemoMode = isDemo
```

Si arrancas la app **sin** `.env` (o con `VITE_SUPABASE_URL` vacía/placeholder), el cliente real se reemplaza por `mockSupabase` (`src/lib/mockSupabase.ts`), que implementa la API mínima usada por la app sobre datos en memoria. Útil para demos, onboarding, y desarrollo offline sin necesidad de un proyecto Supabase.

Para forzar modo real: define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env`.

## Roles y permisos

Los roles se gestionan en la página **[`/admin/usuarios`](src/pages/AdminUsuarios.tsx)** (requiere capability `manage_users`).

Capabilities efectivas se resuelven en `src/hooks/useAppRoles.ts` (app-wide) y `src/hooks/useProjectRoles.ts` (por proyecto).

### Matriz de roles (resumen)

| Rol                  | Edita proyecto | Presupuesto | Nómina | Requisiciones | Finanzas | Admin usuarios |
| -------------------- | :------------: | :---------: | :----: | :-----------: | :------: | :------------: |
| `director_proyecto`  |       OK       |     OK      |   OK   |      OK       |    OK    |       OK       |
| `planificacion`      |       OK       |     OK      |        |      OK       |          |                |
| `ingeniero_obra`     |                |             |   OK   |      OK       |          |                |
| `comprador`          |                |             |        |      OK       |          |                |
| `almacenista`        |                |             |        |               |          |                |
| `contabilidad`       |                |             |        |               |    OK    |                |

Detalle completo de capabilities en `useAppRoles.ts` (write_ledger, view_cashflow, write_loans, view_director_dashboard, view_approvals_log, etc.).

## Migraciones

Las migraciones SQL viven en `supabase/migrations/` (numeradas, ej. `001_schema.sql` → `020_harden_function_search_path.sql`). Hay dos formas de aplicarlas:

### Opción A: Supabase CLI (recomendado)

```bash
# Link al proyecto remoto (una vez)
supabase link --project-ref <project-ref>

# Aplicar migraciones pendientes
supabase db push
```

### Opción B: MCP server / SQL Editor

- Usando el **MCP de Supabase** desde Claude/agentes: `apply_migration` aplica directo al proyecto remoto.
- Manual: pegar el contenido de cada migración en el SQL Editor del dashboard, en orden.

Para datos iniciales: ejecutar `supabase/seed.sql` tras las migraciones.

## Compatibilidad con estatePRO

Mismo stack, misma arquitectura, mismas convenciones. Diseñado para fusionarse en el futuro bajo un solo proyecto.
