// supabase/functions/loan-reminders/index.ts
// Revisa las cuotas de préstamo pendientes (vencidas o que vencen en los
// próximos 2 días) y envía una notificación push a los directores.
//
// Pensada para ejecutarse a diario vía pg_cron + pg_net (migración 092).
// Autenticación: header x-internal-secret comparado contra el valor
// 'internal_push_secret' de public.internal_config (tabla solo accesible
// con service role; el secreto lo genera la migración).
//
// Secrets requeridos (los mismos que send-push):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@nominapp.local'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

/** Días de anticipación: avisa de cuotas que vencen hoy, mañana o pasado. */
const DAYS_AHEAD = 2

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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

/** Fecha AAAA-MM-DD en la zona horaria de República Dominicana. */
function todayInSantoDomingo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo' }).format(new Date())
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

interface InstallmentRow {
  id: string
  numero_cuota: number
  monto: number
  fecha_pago_programada: string
  loan: { status: string; contractor: { name: string | null } | null } | null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  // --- Autenticación por secreto interno guardado en la base ---
  const provided = req.headers.get('x-internal-secret') ?? ''
  const { data: cfg, error: cfgError } = await supabase
    .from('internal_config')
    .select('value')
    .eq('key', 'internal_push_secret')
    .maybeSingle()
  if (cfgError) return jsonResponse({ error: cfgError.message }, 500)
  if (!cfg?.value || !provided || !safeEqual(provided, cfg.value)) {
    return jsonResponse({ error: 'unauthorized' }, 401)
  }

  // --- Cuotas pendientes de préstamos activos: vencidas o por vencer ---
  const today = todayInSantoDomingo()
  const windowEnd = addDays(today, DAYS_AHEAD)

  const { data: instData, error: instError } = await supabase
    .from('loan_installments')
    .select(
      'id, numero_cuota, monto, fecha_pago_programada, loan:contractor_loans!inner(status, contractor:contractors(name))',
    )
    .eq('estado', 'pendiente')
    .eq('loan.status', 'active')
    .lte('fecha_pago_programada', windowEnd)
    .order('fecha_pago_programada', { ascending: true })
    .limit(100)
  if (instError) return jsonResponse({ error: instError.message }, 500)

  const installments = (instData ?? []) as unknown as InstallmentRow[]
  const vencidas = installments.filter((i) => i.fecha_pago_programada < today)
  const porVencer = installments.filter((i) => i.fecha_pago_programada >= today)

  if (installments.length === 0) {
    return jsonResponse({ sent: 0, failed: 0, vencidas: 0, por_vencer: 0, detail: 'sin cuotas por cobrar' })
  }

  // --- Mensaje ---
  const fmtRD = (n: number) =>
    new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n)
  const nombres = [...new Set(installments.map((i) => i.loan?.contractor?.name).filter(Boolean))].slice(0, 3)
  const totalMonto = installments.reduce((sum, i) => sum + (i.monto ?? 0), 0)

  const parts: string[] = []
  if (vencidas.length > 0) parts.push(`${vencidas.length} vencida${vencidas.length === 1 ? '' : 's'}`)
  if (porVencer.length > 0)
    parts.push(`${porVencer.length} vence${porVencer.length === 1 ? '' : 'n'} en los próximos ${DAYS_AHEAD} días`)
  const body = `${parts.join(' y ')} — ${fmtRD(totalMonto)} por cobrar${
    nombres.length > 0 ? ` (${nombres.join(', ')}${installments.length > nombres.length ? '…' : ''})` : ''
  }`

  // --- Destinatarios: directores con celular registrado ---
  const { data: dirs, error: dirsError } = await supabase.from('user_profiles').select('id').eq('is_director', true)
  if (dirsError) return jsonResponse({ error: dirsError.message }, 500)
  const userIds = (dirs ?? []).map((d: { id: string }) => d.id)
  if (userIds.length === 0) {
    return jsonResponse({ sent: 0, failed: 0, vencidas: vencidas.length, por_vencer: porVencer.length })
  }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  if (subsError) return jsonResponse({ error: subsError.message }, 500)
  if (!subs || subs.length === 0) {
    return jsonResponse({
      sent: 0,
      failed: 0,
      vencidas: vencidas.length,
      por_vencer: porVencer.length,
      detail: 'sin celulares registrados',
    })
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return jsonResponse({ error: 'vapid_not_configured', vencidas: vencidas.length, por_vencer: porVencer.length }, 500)
  }

  // Import perezoso: si el módulo no carga, devolvemos error legible en vez
  // de tumbar el worker al arranque.
  let webpush: typeof import('npm:web-push@3.6.7').default
  try {
    webpush = (await import('npm:web-push@3.6.7')).default
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  } catch (e) {
    return jsonResponse({ error: `webpush_load_failed: ${String(e)}` }, 500)
  }

  const message = JSON.stringify({ title: 'Cobros de préstamos pendientes', body, url: '/prestamos' })

  let sent = 0
  let failed = 0
  const expiredIds: string[] = []
  for (const sub of subs as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message,
        { TTL: 60 * 60 * 24 },
      )
      sent += 1
    } catch (e) {
      failed += 1
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) expiredIds.push(sub.id)
    }
  }

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }

  return jsonResponse({
    sent,
    failed,
    expired_removed: expiredIds.length,
    vencidas: vencidas.length,
    por_vencer: porVencer.length,
  })
})
