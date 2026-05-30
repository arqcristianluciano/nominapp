import { supabase } from '@/lib/supabase'

/**
 * Input para enviar una notificacion push via la Edge Function `send-push`.
 * Se debe proveer `user_ids` o `subscription_ids` (al menos uno).
 */
export interface SendPushInput {
  user_ids?: string[]
  subscription_ids?: string[]
  title: string
  body: string
  url?: string
}

/**
 * Resultado del envio de notificaciones push.
 * - `sent`: cantidad de notificaciones entregadas con exito.
 * - `failed`: cantidad de notificaciones que fallaron.
 * - `expired_removed`: cantidad de suscripciones expiradas eliminadas (opcional).
 */
export interface SendPushResult {
  sent: number
  failed: number
  expired_removed?: number
}

// Wrapper sobre la Edge Function send-push.
// Requiere que en Supabase Dashboard → Edge Functions → Secrets estén:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
/**
 * Servicio para enviar notificaciones push web mediante la Edge Function `send-push`.
 * Provee helpers para enviar a usuarios especificos, directores o miembros de proyecto.
 */
export const pushNotificationService = {
  /**
   * Invoca la Edge Function `send-push` con el input dado.
   * @param input Destinatarios y contenido de la notificacion.
   * @returns Conteo de notificaciones enviadas/fallidas.
   * @throws Error si la Edge Function devuelve un error.
   */
  async send(input: SendPushInput): Promise<SendPushResult> {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: input,
    })
    if (error) throw error
    return (data ?? { sent: 0, failed: 0 }) as SendPushResult
  },

  /**
   * Notifica a todos los `user_profiles` con `is_director = true`.
   * @param title Titulo de la notificacion.
   * @param body Cuerpo de la notificacion.
   * @param url URL opcional para abrir al hacer click.
   * @returns Conteo de notificaciones enviadas/fallidas.
   * @throws Error si la consulta a Supabase o el envio falla.
   */
  async notifyDirectors(title: string, body: string, url?: string): Promise<SendPushResult> {
    const { data, error } = await supabase.from('user_profiles').select('id').eq('is_director', true)
    if (error) throw error
    const userIds = (data ?? []).map((r: { id: string }) => r.id)
    if (userIds.length === 0) return { sent: 0, failed: 0 }
    return this.send({ user_ids: userIds, title, body, url })
  },

  /**
   * Notifica a miembros de un proyecto que tengan alguno de los roles dados.
   * @param projectId ID del proyecto en `project_members`.
   * @param roles Lista de roles a incluir.
   * @param title Titulo de la notificacion.
   * @param body Cuerpo de la notificacion.
   * @param url URL opcional para abrir al hacer click.
   * @returns Conteo de notificaciones enviadas/fallidas.
   * @throws Error si la consulta a Supabase o el envio falla.
   */
  async notifyProjectRole(
    projectId: string,
    roles: string[],
    title: string,
    body: string,
    url?: string,
  ): Promise<SendPushResult> {
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .in('role', roles)
    if (error) throw error
    const userIds = Array.from(new Set((data ?? []).map((r: { user_id: string }) => r.user_id)))
    if (userIds.length === 0) return { sent: 0, failed: 0 }
    return this.send({ user_ids: userIds, title, body, url })
  },
}
