import { supabase } from '@/lib/supabase'

export interface SendPushInput {
  user_ids?: string[]
  subscription_ids?: string[]
  title: string
  body: string
  url?: string
}

export interface SendPushResult {
  sent: number
  failed: number
  expired_removed?: number
}

// Wrapper sobre la Edge Function send-push.
// Requiere que en Supabase Dashboard → Edge Functions → Secrets estén:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
export const pushNotificationService = {
  async send(input: SendPushInput): Promise<SendPushResult> {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: input,
    })
    if (error) throw error
    return (data ?? { sent: 0, failed: 0 }) as SendPushResult
  },

  // Notifica a todos los user_profiles con is_director=true.
  async notifyDirectors(title: string, body: string, url?: string): Promise<SendPushResult> {
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('is_director', true)
    const userIds = (data ?? []).map((r: { id: string }) => r.id)
    if (userIds.length === 0) return { sent: 0, failed: 0 }
    return this.send({ user_ids: userIds, title, body, url })
  },

  // Notifica a miembros de un proyecto con los roles dados.
  async notifyProjectRole(
    projectId: string,
    roles: string[],
    title: string,
    body: string,
    url?: string,
  ): Promise<SendPushResult> {
    const { data } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .in('role', roles)
    const userIds = Array.from(new Set((data ?? []).map((r: { user_id: string }) => r.user_id)))
    if (userIds.length === 0) return { sent: 0, failed: 0 }
    return this.send({ user_ids: userIds, title, body, url })
  },
}
