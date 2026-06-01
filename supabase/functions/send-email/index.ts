// supabase/functions/send-email/index.ts
// Edge Function que envía correos transaccionales (avisos) vía Resend.
//
// Payload esperado:
//   {
//     user_ids?: string[],  // resuelve los correos desde user_profiles.email
//     to?: string[],        // o se pasan correos directos
//     subject: string,
//     text?: string,        // cuerpo en texto plano
//     html?: string         // cuerpo en HTML (opcional; si falta se usa text)
//   }
//
// Autenticación: acepta EITHER (a) un secreto interno (x-internal-secret ==
// INTERNAL_EMAIL_SECRET) para jobs server-to-server, O (b) cualquier JWT de
// usuario autenticado. A diferencia de send-push (solo director), aquí se
// permite a cualquier usuario válido para que los avisos también se disparen
// cuando, por ejemplo, el Almacenista recibe mercancía.
//
// Secrets requeridos en Supabase:
//   RESEND_API_KEY            (clave del proveedor Resend)
//   RESEND_FROM               (remitente verificado, ej: "NominAPP <avisos@tudominio.com>")
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY (auto)
//   INTERNAL_EMAIL_SECRET     (opcional — habilita llamadas server-to-server)
//
// Si RESEND_API_KEY no está configurado, la función no falla: responde
// { sent: 0, skipped: true } (best-effort, igual que el resto de avisos).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'NominAPP <onboarding@resend.dev>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const INTERNAL_EMAIL_SECRET = Deno.env.get('INTERNAL_EMAIL_SECRET') ?? ''
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface SendEmailPayload {
  user_ids?: string[]
  to?: string[]
  subject: string
  text?: string
  html?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  // Auth: secreto interno O usuario autenticado.
  const internalSecret = req.headers.get('x-internal-secret')
  const hasInternal =
    INTERNAL_EMAIL_SECRET.length > 0 && internalSecret !== null && safeEqual(internalSecret, INTERNAL_EMAIL_SECRET)

  if (!hasInternal) {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'unauthorized' }, 401)
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()
    if (!caller) return jsonResponse({ error: 'unauthorized' }, 401)
  }

  let payload: SendEmailPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }
  if (!payload.subject || (!payload.text && !payload.html)) {
    return jsonResponse({ error: 'subject y (text o html) requeridos' }, 400)
  }

  // Resolver destinatarios.
  let recipients: string[] = Array.isArray(payload.to) ? payload.to.filter(Boolean) : []
  if (recipients.length === 0 && payload.user_ids && payload.user_ids.length > 0) {
    const { data: profiles, error } = await admin.from('user_profiles').select('email').in('id', payload.user_ids)
    if (error) return jsonResponse({ error: error.message }, 500)
    recipients = (profiles ?? []).map((p: { email: string | null }) => p.email).filter((e): e is string => Boolean(e))
  }
  recipients = Array.from(new Set(recipients))
  if (recipients.length === 0) return jsonResponse({ sent: 0, failed: 0 })

  // Sin proveedor configurado: no-op (best-effort).
  if (!RESEND_API_KEY) return jsonResponse({ sent: 0, skipped: true })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: recipients,
        subject: payload.subject,
        text: payload.text ?? undefined,
        html: payload.html ?? undefined,
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      return jsonResponse({ sent: 0, failed: recipients.length, error: detail }, 502)
    }
    return jsonResponse({ sent: recipients.length, failed: 0 })
  } catch (e) {
    return jsonResponse({ sent: 0, failed: recipients.length, error: String(e) }, 502)
  }
})
