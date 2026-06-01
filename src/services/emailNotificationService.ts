import { supabase } from '@/lib/supabase'

/**
 * Input para la Edge Function `send-email`. Se provee `user_ids` (se resuelven
 * los correos desde user_profiles) o `to` (correos directos).
 */
export interface SendEmailInput {
  user_ids?: string[]
  to?: string[]
  subject: string
  text?: string
  html?: string
}

export interface SendEmailResult {
  sent: number
  failed: number
  skipped?: boolean
}

/**
 * Avisos por correo (canal complementario a las notificaciones push), vía la
 * Edge Function `send-email` (proveedor Resend). Si el proveedor no está
 * configurado en Supabase, la función responde { skipped: true } y no falla.
 */
export const emailNotificationService = {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const { data, error } = await supabase.functions.invoke('send-email', { body: input })
    if (error) throw error
    return (data ?? { sent: 0, failed: 0 }) as SendEmailResult
  },

  /**
   * Envía un correo a los miembros de un proyecto que tengan alguno de los roles
   * dados. Resuelve los usuarios desde project_members y delega el envío (y la
   * resolución de correos) a la Edge Function.
   */
  async notifyProjectRole(
    projectId: string,
    roles: string[],
    subject: string,
    text: string,
    html?: string,
  ): Promise<SendEmailResult> {
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .in('role', roles)
    if (error) throw error
    const userIds = Array.from(new Set((data ?? []).map((r: { user_id: string }) => r.user_id)))
    if (userIds.length === 0) return { sent: 0, failed: 0 }
    return this.send({ user_ids: userIds, subject, text, html })
  },
}
