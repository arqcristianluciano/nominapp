import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, ShieldCheck } from 'lucide-react'
import { pushSubscriptionService } from '@/services/pushSubscriptionService'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/Toast'

// Fallback: el mismo VAPID public que tiene embebido la Edge Function send-push.
// Para rotar: cambiar aquí y en los defaults / secrets de la Edge Function.
const DEFAULT_VAPID_PUBLIC =
  'BI1Ml-CtYJEDRgkA7MI2BGZoae6cHiWAd9Z3PFswqvebYWQAVeEOkU8tJgO73O9q7cy5Nk7QwI48sf7olZn5zHk'
const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY as string | undefined) || DEFAULT_VAPID_PUBLIC

export function PushNotificationsSection() {
  const user = useAuthStore((s) => s.user)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const { success, error } = useToast()

  const refresh = useCallback(async () => {
    setSupported(pushSubscriptionService.isSupported())
    setPermission(await pushSubscriptionService.getPermission())
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      setSubscribed(!!sub)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const canEnable = supported && !!user && !!VAPID_PUBLIC_KEY

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

  return (
    <section className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-blue-600" />
        <h2 className="text-base font-semibold text-app-text">Notificaciones push</h2>
      </div>

      {!supported && (
        <p className="text-sm text-app-muted">
          Este navegador no soporta notificaciones push. Prueba en Chrome, Edge o Firefox en
          escritorio, o instala la PWA en tu celular.
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
          Permiso bloqueado por el navegador. Cambia el ajuste de notificaciones del sitio en la
          configuración del browser y recarga.
        </p>
      )}

      {supported && VAPID_PUBLIC_KEY && permission !== 'denied' && (
        <div className="space-y-3">
          <p className="text-sm text-app-muted">
            Recibirás alertas en este dispositivo cuando ocurran eventos críticos: solicitudes que
            exceden plan, nóminas pendientes de aprobar, stock bajo, etc.
          </p>
          <div className="flex flex-wrap gap-2">
            {!subscribed ? (
              <button
                onClick={handleEnable}
                disabled={busy || !canEnable}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Bell className="w-4 h-4" /> {busy ? 'Activando…' : 'Activar notificaciones'}
              </button>
            ) : (
              <button
                onClick={handleDisable}
                disabled={busy}
                className="flex items-center gap-2 border border-app-border text-app-muted hover:bg-app-hover px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                <BellOff className="w-4 h-4" /> {busy ? 'Desactivando…' : 'Desactivar en este dispositivo'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-app-subtle flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            La suscripción se guarda en tu cuenta y se asocia a este navegador específicamente.
          </p>
        </div>
      )}
    </section>
  )
}
