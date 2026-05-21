// supabase/functions/admin-create-user/index.ts
// Edge Function que crea un usuario nuevo en auth.users + user_profiles.
//
// Solo puede ser invocada por un usuario con user_profiles.is_director = true.
// Crea el auth.users con email_confirm = true (no requiere verificacion).
//
// Payload:
//   {
//     email: string,
//     password: string,
//     display_name: string,
//     first_name?: string, last_name?: string,
//     cedula?: string, passport?: string, phone?: string,
//     job_title?: string, hire_date?: string (YYYY-MM-DD),
//     salary?: number, payment_terms?: string,
//   }
//
// Variables de entorno requeridas (las inyecta Supabase):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// CORS: en produccion debe setearse ALLOWED_ORIGIN al dominio del frontend
// (p. ej. 'https://app.nominapp.do') para evitar que cualquier origen llame
// a esta funcion. Por defecto se deja '*' para no romper desarrollo local.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isStrongPassword(pw: string): boolean {
  return (
    typeof pw === 'string' &&
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw)
  )
}

interface CreateUserInput {
  email: string
  password: string
  display_name: string
  first_name?: string | null
  last_name?: string | null
  cedula?: string | null
  passport?: string | null
  phone?: string | null
  job_title?: string | null
  hire_date?: string | null
  salary?: number | null
  payment_terms?: string | null
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'unauthorized' }, 401)

  // 1) Validar que el caller es Director General
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user: caller } } = await callerClient.auth.getUser()
  if (!caller) return jsonResponse({ error: 'unauthorized' }, 401)

  const { data: callerProfile } = await callerClient
    .from('user_profiles')
    .select('is_director')
    .eq('id', caller.id)
    .maybeSingle()
  if (!callerProfile?.is_director) {
    return jsonResponse({ error: 'forbidden', detail: 'solo el director general puede crear usuarios' }, 403)
  }

  // 2) Validar payload
  let body: CreateUserInput
  try {
    body = await req.json() as CreateUserInput
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }
  if (!body.email || !body.password || !body.display_name) {
    return jsonResponse({ error: 'missing_fields', detail: 'email, password y display_name son obligatorios' }, 400)
  }
  if (!EMAIL_REGEX.test(body.email)) {
    return jsonResponse({ error: 'invalid_email' }, 400)
  }
  if (!isStrongPassword(body.password)) {
    return jsonResponse(
      {
        error: 'weak_password',
        detail: 'password debe tener minimo 8 caracteres, mayuscula, minuscula y numero',
      },
      400,
    )
  }

  // 3) Crear el usuario via admin API
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    return jsonResponse({ error: 'auth_create_failed', detail: createError?.message }, 400)
  }

  // 4) Insertar el perfil
  const profilePayload = {
    id: created.user.id,
    display_name: body.display_name,
    is_director: false,
    first_name: body.first_name ?? null,
    last_name: body.last_name ?? null,
    cedula: body.cedula ?? null,
    passport: body.passport ?? null,
    phone: body.phone ?? null,
    job_title: body.job_title ?? null,
    hire_date: body.hire_date ?? null,
    salary: body.salary ?? null,
    payment_terms: body.payment_terms ?? null,
    is_active: true,
  }
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .insert(profilePayload)
  if (profileError) {
    // best-effort rollback: borrar el usuario creado
    await adminClient.auth.admin.deleteUser(created.user.id).catch(() => undefined)
    return jsonResponse({ error: 'profile_insert_failed', detail: profileError.message }, 400)
  }

  // 5) Audit log (queda en los logs de Supabase via console.log)
  console.log(JSON.stringify({
    action: 'admin-create-user',
    actor: caller.id,
    target: created.user.id,
    target_email: created.user.email,
    ts: new Date().toISOString(),
  }))

  return jsonResponse({ id: created.user.id, email: created.user.email })
})
