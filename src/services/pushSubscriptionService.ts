import { supabase } from '@/lib/supabase'

export interface StoredPushSubscription {
  id: string
  user_id: string
  display_name: string | null
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
  last_seen_at: string
}

export interface SubscribeInput {
  user_id: string
  display_name?: string
  vapid_public_key: string
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
  return output
}

function bufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export const pushSubscriptionService = {
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    )
  },

  async getPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') return 'denied'
    return Notification.permission
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') return 'denied'
    return Notification.requestPermission()
  },

  async subscribe(input: SubscribeInput): Promise<StoredPushSubscription | null> {
    if (!this.isSupported()) return null
    const permission = await this.requestPermission()
    if (permission !== 'granted') return null

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast por interop con tipos ArrayBuffer estrictos en TS 5.x.
      applicationServerKey: urlBase64ToUint8Array(
        input.vapid_public_key,
      ) as unknown as BufferSource,
    })

    const p256dh = bufferToBase64(sub.getKey('p256dh'))
    const auth = bufferToBase64(sub.getKey('auth'))

    // Upsert por endpoint único.
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', sub.endpoint)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .update({
          user_id: input.user_id,
          display_name: input.display_name ?? null,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', (existing as { id: string }).id)
        .select()
        .single()
      if (error) throw error
      return data as StoredPushSubscription
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: input.user_id,
        display_name: input.display_name ?? null,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      })
      .select()
      .single()
    if (error) throw error
    return data as StoredPushSubscription
  },

  async unsubscribe(): Promise<void> {
    if (!this.isSupported()) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  },
}
