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
// Requiere los siguientes secrets en el proyecto Supabase:
//   VAPID_PUBLIC_KEY   (base64url)
//   VAPID_PRIVATE_KEY  (base64url)
//   VAPID_SUBJECT      (mailto: o https URL — default: mailto:admin@nominapp.local)
//   SUPABASE_URL       (auto)
//   SUPABASE_SERVICE_ROLE_KEY (auto)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@nominapp.local'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  let payload: SendPushPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (!payload.title || !payload.body) {
    return new Response(JSON.stringify({ error: 'title and body required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  // Resolver suscripciones a notificar.
  let query = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth')
  if (payload.subscription_ids && payload.subscription_ids.length > 0) {
    query = query.in('id', payload.subscription_ids)
  } else if (payload.user_ids && payload.user_ids.length > 0) {
    query = query.in('user_id', payload.user_ids)
  } else {
    return new Response(JSON.stringify({ error: 'user_ids or subscription_ids required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const { data: subs, error } = await query
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, failed: 0 }), {
      headers: { 'content-type': 'application/json' },
    })
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

  return new Response(
    JSON.stringify({ sent, failed, expired_removed: expiredIds.length }),
    { headers: { 'content-type': 'application/json' } },
  )
})
