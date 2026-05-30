import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, CheckCircle2, Send, ShieldCheck, XCircle } from 'lucide-react'
import { pushSubscriptionService } from '@/services/pushSubscriptionService'
import { pushNotificationService } from '@/services/pushNotificationService'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/Toast'
import { notificationsInbox, type InboxEntry } from '@/utils/notificationsInbox'

// Fallback: el mismo VAPID public que tiene embebido la Edge Function send-push.
// Para rotar: cambiar aquí y en los defaults / secrets de la Edge Function.
const DEFAULT_VAPID_PUBLIC = 'BI1Ml-CtYJEDRgkA7MI2BGZoae6cHiWAd9Z3PFswqvebYWQAVeEOkU8tJgO73O9q7cy5Nk7QwI48sf7olZn5zHk'
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY as string | undefined) || DEFAULT_VAPID_PUBLIC

const MAX_INBOX_PREVIEW = 8

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'hace instantes'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `hace ${diffD} d`
  return new Date(iso).toLocaleDateString()
}

function levelDotClass(level: InboxEntry['level']): string {
  if (level === 'danger') return 'bg-red-500'
  if (level === 'warning') return 'bg-amber-500'
  return 'bg-blue-500'
}

export function PushNotificationsSection() {
  const user = useAuthStore((s) => s.user)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [testBusy, setTestBusy] = useState(false)
  const [inbox, setInbox] = useState<InboxEntry[]>([])
  const { success, error, info } = useToast()

  const refresh = useCallback(async () => {
    setSupported(pushSubscriptionService.isSupported())
    setPermission(await pushSubscriptionService.getPermission())
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      setSubscribed(!!sub)
    }
    setInbox(notificationsInbox.list())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Mantener el inbox en sync si cambia en otra pestaña o por el SW.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'nominapp.notifications.inbox') {
        setInbox(notificationsInbox.list())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const canEnable = supported && !!user && !!VAPID_PUBLIC_KEY
  const isDirector = !!user?.isDirector

  const statusLabel = useMemo(() => {
    if (!supported) return 'No soportado en este navegador'
    if (permission === 'denied') return 'Bloqueado por el navegador'
    return subscribed ? 'Activado en este dispositivo' : 'No activado'
  }, [supported, permission, subscribed])

  const statusIcon = subscribed ? (
    <CheckCircle2 className="w-4 h-4 text-green-600" />
  ) : (
    <XCircle className="w-4 h-4 text-app-muted" />
  )

  async function handleEnable() {
    if (!user || !VAPID_PUBLIC_KEY) return
    setBusy(true)
    try {
      const sub = await pushSubscriptionService.subscribe({
        user_id: user.id,
        display_name: user.displayName,
        vapid_public_key: VAPID_PUBLIC_KEY,
      })
      if (!sub) {
        error('Permiso denegado o navegador no soportado')
      } else {
        success('Notificaciones activadas en este dispositivo')
      }
      await refresh()
    } catch (e) {
      error((e as Error).message ?? 'No se pudo activar')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      await pushSubscriptionService.unsubscribe()
      success('Notificaciones desactivadas en este dispositivo')
      await refresh()
    } catch (e) {
      error((e as Error).message ?? 'No se pudo desactivar')
    } finally {
      setBusy(false)
    }
  }

  async function handleSendTest() {
    if (!user || !isDirector) return
    setTestBusy(true)
    try {
      const result = await pushNotificationService.send({
        user_ids: [user.id],
        title: 'NominApp · Notificación de prueba',
        body: `Hola ${user.displayName ?? ''}, esta es una notificación push de prueba.`,
        url: '/settings',
      })
      if (result.sent > 0) {
        success(`Push de prueba enviado (${result.sent} dispositivo${result.sent === 1 ? '' : 's'})`)
      } else if (result.failed > 0) {
        error(`No se pudo entregar la prueba (${result.failed} fallos)`)
      } else {
        info('No tienes suscripciones activas para recibir la prueba')
      }
    } catch (e) {
      error((e as Error).message ?? 'No se pudo enviar la prueba')
    } finally {
      setTestBusy(false)
    }
  }

  return (
    <section className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-blue-600" />
        <h2 className="text-base font-semibold text-app-text">Notificaciones push</h2>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {statusIcon}
        <span className={subscribed ? 'text-green-700 dark:text-green-400 font-medium' : 'text-app-muted'}>
          {statusLabel}
        </span>
      </div>

      {!supported && (
        <p className="text-sm text-app-muted">
          Este navegador no soporta notificaciones push. Prueba en Chrome, Edge o Firefox en escritorio, o instala la
          PWA en tu celular.
        </p>
      )}

      {supported && !VAPID_PUBLIC_KEY && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Falta configurar <code className="font-mono">VITE_PUSH_VAPID_PUBLIC_KEY</code> en el{' '}
          <code className="font-mono">.env</code>. Pídele al admin la clave pública VAPID.
        </p>
      )}

      {supported && VAPID_PUBLIC_KEY && permission === 'denied' && (
        <p className="text-sm text-red-700 dark:text-red-400">
          Permiso bloqueado por el navegador. Cambia el ajuste de notificaciones del sitio en la configuración del
          browser y recarga.
        </p>
      )}

      {supported && VAPID_PUBLIC_KEY && permission !== 'denied' && (
        <div className="space-y-3">
          <p className="text-sm text-app-muted">
            Recibirás alertas en este dispositivo cuando ocurran eventos críticos: solicitudes que exceden plan, nóminas
            pendientes de aprobar, stock bajo, etc.
          </p>
          <div className="flex flex-wrap gap-2">
            {!subscribed ? (
              <button
                onClick={handleEnable}
                disabled={busy || !canEnable}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Bell className="w-4 h-4" /> {busy ? 'Activando…' : 'Activar push'}
              </button>
            ) : (
              <button
                onClick={handleDisable}
                disabled={busy}
                className="flex items-center gap-2 border border-app-border text-app-muted hover:bg-app-hover px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                <BellOff className="w-4 h-4" /> {busy ? 'Desactivando…' : 'Desactivar'}
              </button>
            )}
            {isDirector && subscribed && (
              <button
                onClick={handleSendTest}
                disabled={testBusy}
                className="flex items-center gap-2 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                title="Solo visible para Director General"
              >
                <Send className="w-4 h-4" />
                {testBusy ? 'Enviando…' : 'Enviar push de prueba'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-app-subtle flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            La suscripción se guarda en tu cuenta y se asocia a este navegador específicamente.
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-app-border space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-app-text">Notificaciones recientes</h3>
          {inbox.length > 0 && (
            <span className="text-[11px] text-app-subtle">
              {inbox.length} {inbox.length === 1 ? 'notificación' : 'notificaciones'}
            </span>
          )}
        </div>
        {inbox.length === 0 ? (
          <p className="text-sm text-app-muted">Aún no has recibido notificaciones.</p>
        ) : (
          <ul className="space-y-1.5 max-h-72 overflow-y-auto">
            {inbox.slice(0, MAX_INBOX_PREVIEW).map((entry) => (
              <li
                key={`${entry.id}-${entry.received_at}`}
                className="flex items-start gap-2 p-2 rounded-lg border border-app-border bg-app-bg"
              >
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${levelDotClass(entry.level)}`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${entry.read ? 'text-app-muted' : 'text-app-text font-medium'}`}>
                      {entry.title}
                    </p>
                    <span className="text-[11px] text-app-subtle flex-shrink-0">
                      {formatRelative(entry.received_at)}
                    </span>
                  </div>
                  <p className="text-xs text-app-muted truncate">{entry.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {inbox.length > MAX_INBOX_PREVIEW && (
          <p className="text-[11px] text-app-subtle">
            Mostrando {MAX_INBOX_PREVIEW} de {inbox.length}. Las demás siguen disponibles en la bandeja de
            notificaciones.
          </p>
        )}
      </div>
    </section>
  )
}
