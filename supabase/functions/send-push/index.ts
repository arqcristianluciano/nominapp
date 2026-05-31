// supabase/functions/send-push/index.ts
// Edge Function que envía notificaciones Web Push (VAPID) a una o varias
// suscripciones almacenadas en public.push_subscriptions.
//
// Payload esperado:
//   {
//     user_ids?: string[],      // si se pasa, envía a todos los endpoints de esos usuarios
//     subscription_ids?: string[], // o se pasan IDs específicos
//     title: string,
//     body: string,
//     url?: string              // URL relativa a abrir al click
//   }
//
// Solo puede ser invocada por:
//   - un usuario con user_profiles.is_director = true (JWT valido en Authorization), o
//   - un job server-to-server que envie el header x-internal-secret == INTERNAL_PUSH_SECRET.
//
// Requiere los siguientes secrets en el proyecto Supabase:
//   VAPID_PUBLIC_KEY   (base64url)
//   VAPID_PRIVATE_KEY  (base64url)
//   VAPID_SUBJECT      (mailto: o https URL — default: mailto:admin@nominapp.local)
//   SUPABASE_URL       (auto)
//   SUPABASE_ANON_KEY  (auto)
//   SUPABASE_SERVICE_ROLE_KEY (auto)
//   INTERNAL_PUSH_SECRET (opcional — habilita llamadas server-to-server/cron)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@nominapp.local'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const INTERNAL_PUSH_SECRET = Deno.env.get('INTERNAL_PUSH_SECRET') ?? ''

// CORS: en produccion debe setearse ALLOWED_ORIGIN al dominio del frontend
// (p. ej. 'https://app.nominapp.do'). Por defecto se deja '*' para no romper
// desarrollo local, igual que el resto de funciones.
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

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('VAPID keys missing in environment')
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface SendPushPayload {
  user_ids?: string[]
  subscription_ids?: string[]
  title: string
  body: string
  url?: string
}

// Timing-safe comparison para el secreto interno.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  // Autenticacion: aceptar EITHER (a) un secreto interno valido para jobs
  // server-to-server, O (b) un JWT de usuario con is_director = true.
  const internalSecret = req.headers.get('x-internal-secret')
  const hasValidInternalSecret =
    INTERNAL_PUSH_SECRET.length > 0 && internalSecret !== null && safeEqual(internalSecret, INTERNAL_PUSH_SECRET)

  if (!hasValidInternalSecret) {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'unauthorized' }, 401)

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()
    if (!caller) return jsonResponse({ error: 'unauthorized' }, 401)

    const { data: callerProfile } = await callerClient
      .from('user_profiles')
      .select('is_director')
      .eq('id', caller.id)
      .maybeSingle()
    if (!callerProfile?.is_director) {
      return jsonResponse({ error: 'forbidden', detail: 'solo el director general puede enviar notificaciones' }, 403)
    }
  }

  let payload: SendPushPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  if (!payload.title || !payload.body) {
    return jsonResponse({ error: 'title and body required' }, 400)
  }

  // Resolver suscripciones a notificar.
  let query = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth')
  if (payload.subscription_ids && payload.subscription_ids.length > 0) {
    query = query.in('id', payload.subscription_ids)
  } else if (payload.user_ids && payload.user_ids.length > 0) {
    query = query.in('user_id', payload.user_ids)
  } else {
    return jsonResponse({ error: 'user_ids or subscription_ids required' }, 400)
  }

  const { data: subs, error } = await query
  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }
  if (!subs || subs.length === 0) {
    return jsonResponse({ sent: 0, failed: 0 })
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  })

  let sent = 0
  let failed = 0
  const expiredIds: string[] = []

  for (const sub of subs as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message,
        { TTL: 60 * 60 * 24 },
      )
      sent += 1
    } catch (e) {
      failed += 1
      const status = (e as { statusCode?: number }).statusCode
      // 404 / 410 = endpoint expirado o cancelado por el browser
      if (status === 404 || status === 410) expiredIds.push(sub.id)
    }
  }

  // Limpieza de suscripciones expiradas.
  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }

  return jsonResponse({ sent, failed, expired_removed: expiredIds.length })
})
