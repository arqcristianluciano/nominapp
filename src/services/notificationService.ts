import { supabase } from '@/lib/supabase'

export type NotifLevel = 'danger' | 'warning' | 'info'

export interface AppNotification {
  id: string
  level: NotifLevel
  title: string
  description: string
  link: string
}

const DAYS_APPROACHING = 15
const DAYS_OVERDUE = 28

export const notificationService = {
  async getAll(): Promise<AppNotification[]> {
    const today = new Date()
    const approachingCutoff = new Date(today)
    approachingCutoff.setDate(approachingCutoff.getDate() - DAYS_APPROACHING)
    const cutoffStr = approachingCutoff.toISOString().split('T')[0]

    const [poRes, qcOverdueRes, qcFailedRes] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('id, order_number, project:projects(name)')
        .eq('status', 'pending_approval'),
      supabase
        .from('quality_control')
        .select('id, element, pour_date, project_id')
        .is('test_date', null)
        .lte('pour_date', cutoffStr),
      supabase
        .from('quality_control')
        .select('id, element, project_id')
        .eq('status', 'failed')
        .order('pour_date', { ascending: false })
        .limit(10),
    ])

    const notifications: AppNotification[] = []

    for (const po of (poRes.data || []) as any[]) {
      notifications.push({
        id: `po-${po.id}`,
        level: 'warning',
        title: 'OC pendiente de aprobación',
        description: `${po.order_number}${po.project ? ` — ${po.project.name}` : ''}`,
        link: `/ordenes-compra/${po.id}`,
      })
    }

    for (const qc of (qcOverdueRes.data || []) as any[]) {
      const daysSince = Math.floor(
        (today.getTime() - new Date(qc.pour_date).getTime()) / 86_400_000
      )
      const isOverdue = daysSince >= DAYS_OVERDUE
      notifications.push({
        id: `qc-overdue-${qc.id}`,
        level: isOverdue ? 'danger' : 'warning',
        title: isOverdue ? 'Ensayo vencido sin resultado' : 'Ensayo próximo a vencer',
        description: `${qc.element} — ${daysSince} días desde el vaciado`,
        link: `/proyectos/${qc.project_id}/calidad`,
      })
    }

    const overduIds = new Set((qcOverdueRes.data || []).map((q: any) => q.id))
    for (const qc of (qcFailedRes.data || []) as any[]) {
      if (overduIds.has(qc.id)) continue
      notifications.push({
        id: `qc-failed-${qc.id}`,
        level: 'danger',
        title: 'Ensayo de hormigón fallido',
        description: qc.element,
        link: `/proyectos/${qc.project_id}/calidad`,
      })
    }

    return notifications
  },
}
