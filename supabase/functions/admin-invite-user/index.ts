// supabase/functions/admin-invite-user/index.ts
// Edge Function que invita a un nuevo usuario por email. Supabase envia un
// magic link al destinatario para que defina su propia contrasena.
//
// Solo puede ser invocada por un usuario con user_profiles.is_director = true.
//
// Payload:
//   {
//     email: string,
//     role?: string | null,         // ProjectRole opcional
//     project_id?: string | null,   // si se da, se inserta project_members
//   }
//
// Variables de entorno requeridas (las inyecta Supabase):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// CORS: en produccion debe setearse ALLOWED_ORIGIN al dominio del frontend.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface InviteUserInput {
  email: string
  role?: string | null
  project_id?: string | null
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
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser()
  if (!caller) return jsonResponse({ error: 'unauthorized' }, 401)

  const { data: callerProfile } = await callerClient
    .from('user_profiles')
    .select('is_director, display_name')
    .eq('id', caller.id)
    .maybeSingle()
  if (!callerProfile?.is_director) {
    return jsonResponse({ error: 'forbidden', detail: 'solo el director general puede invitar usuarios' }, 403)
  }

  // 2) Validar payload
  let body: InviteUserInput
  try {
    body = (await req.json()) as InviteUserInput
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }
  if (!body.email) {
    return jsonResponse({ error: 'missing_fields', detail: 'email es obligatorio' }, 400)
  }
  if (!EMAIL_REGEX.test(body.email)) {
    return jsonResponse({ error: 'invalid_email' }, 400)
  }
  if (body.project_id && !body.role) {
    return jsonResponse({ error: 'missing_role', detail: 'role es obligatorio cuando se especifica project_id' }, 400)
  }

  // 3) Enviar la invitacion via admin API. Supabase envia el email automatico.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(body.email)
  if (inviteError || !invited.user) {
    return jsonResponse({ error: 'invite_failed', detail: inviteError?.message }, 400)
  }

  // 4) Insertar perfil minimo (display_name = email hasta que el usuario lo
  //    complete al aceptar la invitacion).
  const profilePayload = {
    id: invited.user.id,
    display_name: body.email,
    is_director: false,
    is_active: true,
  }
  const { error: profileError } = await adminClient.from('user_profiles').insert(profilePayload)
  if (profileError) {
    // best-effort rollback: borrar el usuario invitado
    await adminClient.auth.admin.deleteUser(invited.user.id).catch(() => undefined)
    return jsonResponse({ error: 'profile_insert_failed', detail: profileError.message }, 400)
  }

  // 5) Opcionalmente asignar rol en un proyecto
  if (body.project_id && body.role) {
    const { error: memberError } = await adminClient.from('project_members').insert({
      user_id: invited.user.id,
      project_id: body.project_id,
      role: body.role,
    })
    if (memberError) {
      console.warn('project_members insert failed', memberError.message)
    }
  }

  // 6) Loguear a approvals (best-effort)
  const { error: approvalError } = await adminClient.from('approvals').insert({
    entity_type: 'user_profile',
    entity_id: invited.user.id,
    action: 'create',
    actor_user_id: caller.id,
    actor_display_name: callerProfile.display_name ?? null,
    payload_after: {
      email: invited.user.email,
      invited: true,
      role: body.role ?? null,
      project_id: body.project_id ?? null,
    },
    motivo: 'invitacion por email',
    metadata: {},
  })
  if (approvalError) {
    console.warn('approvals insert failed', approvalError.message)
  }

  // 7) Audit log en consola
  console.log(
    JSON.stringify({
      action: 'admin-invite-user',
      actor: caller.id,
      target: invited.user.id,
      target_email: invited.user.email,
      role: body.role ?? null,
      project_id: body.project_id ?? null,
      ts: new Date().toISOString(),
    }),
  )

  return jsonResponse({ id: invited.user.id, email: invited.user.email })
})
