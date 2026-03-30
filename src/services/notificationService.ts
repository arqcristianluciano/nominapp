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
const CXP_WARNING_DAYS = 30
const CXP_DANGER_DAYS = 60
const BUDGET_WARNING_THRESHOLD = 0.80
const BUDGET_DANGER_THRESHOLD = 1.00
const DOC_EXPIRY_WARNING_DAYS = 30

export const notificationService = {
  async getAll(): Promise<AppNotification[]> {
    const today = new Date()
    const approachingCutoff = new Date(today)
    approachingCutoff.setDate(approachingCutoff.getDate() - DAYS_APPROACHING)
    const cutoffStr = approachingCutoff.toISOString().split('T')[0]

    const warningDateStr = new Date(today.getTime() - CXP_WARNING_DAYS * 86400000).toISOString().split('T')[0]
    const dangerDateStr = new Date(today.getTime() - CXP_DANGER_DAYS * 86400000).toISOString().split('T')[0]
    const docExpiryWarning = new Date(today.getTime() + DOC_EXPIRY_WARNING_DAYS * 86400000).toISOString().split('T')[0]

    const [poRes, qcOverdueRes, qcFailedRes, txnDangerRes, txnWarningRes,
           budgetCatRes, transactionsRes, projectsRes, docsRes] = await Promise.all([
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
      supabase
        .from('transactions')
        .select('id, description, total, date, project_id, supplier:suppliers(name)')
        .ilike('payment_condition', '%Credito%')
        .lte('date', dangerDateStr)
        .limit(10),
      supabase
        .from('transactions')
        .select('id, description, total, date, project_id, supplier:suppliers(name)')
        .ilike('payment_condition', '%Credito%')
        .lte('date', warningDateStr)
        .gt('date', dangerDateStr)
        .limit(10),
      supabase.from('budget_categories').select('id, project_id, name, budgeted_amount'),
      supabase.from('transactions').select('project_id, total').limit(500),
      supabase.from('projects').select('id, name, code'),
      supabase.from('contractor_documents').select('*, contractor:contractors(name)'),
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

    for (const txn of (txnDangerRes.data || []) as any[]) {
      const days = Math.floor((today.getTime() - new Date(txn.date).getTime()) / 86400000)
      notifications.push({
        id: `cxp-danger-${txn.id}`,
        level: 'danger',
        title: 'CxP vencida (+60 días)',
        description: `${(txn.supplier as any)?.name ?? txn.description} — ${days}d sin pagar`,
        link: `/proyectos/${txn.project_id}/control`,
      })
    }

    for (const txn of (txnWarningRes.data || []) as any[]) {
      const days = Math.floor((today.getTime() - new Date(txn.date).getTime()) / 86400000)
      notifications.push({
        id: `cxp-warning-${txn.id}`,
        level: 'warning',
        title: 'CxP por vencer (31-60 días)',
        description: `${(txn.supplier as any)?.name ?? txn.description} — ${days}d sin pagar`,
        link: `/proyectos/${txn.project_id}/control`,
      })
    }

    // --- Desviación presupuestaria ---
    const allProjects: any[] = projectsRes.data ?? []
    const allTransactions: any[] = transactionsRes.data ?? []
    const allCategories: any[] = budgetCatRes.data ?? []

    const projectMap = Object.fromEntries(allProjects.map((p) => [p.id, p]))
    const totalBudgetByProject: Record<string, number> = {}
    for (const cat of allCategories) {
      totalBudgetByProject[cat.project_id] = (totalBudgetByProject[cat.project_id] ?? 0) + (cat.budgeted_amount ?? 0)
    }
    const totalActualByProject: Record<string, number> = {}
    for (const txn of allTransactions) {
      totalActualByProject[txn.project_id] = (totalActualByProject[txn.project_id] ?? 0) + (txn.total ?? 0)
    }

    for (const [projectId, actual] of Object.entries(totalActualByProject)) {
      const budget = totalBudgetByProject[projectId] ?? 0
      if (!budget) continue
      const ratio = actual / budget
      const project = projectMap[projectId]
      if (!project) continue
      if (ratio >= BUDGET_DANGER_THRESHOLD) {
        notifications.push({
          id: `budget-danger-${projectId}`,
          level: 'danger',
          title: 'Presupuesto excedido',
          description: `${project.name} — ${Math.round(ratio * 100)}% ejecutado`,
          link: `/proyectos/${projectId}/presupuesto`,
        })
      } else if (ratio >= BUDGET_WARNING_THRESHOLD) {
        notifications.push({
          id: `budget-warning-${projectId}`,
          level: 'warning',
          title: 'Presupuesto al límite (≥80%)',
          description: `${project.name} — ${Math.round(ratio * 100)}% ejecutado`,
          link: `/proyectos/${projectId}/presupuesto`,
        })
      }
    }

    // --- Documentos de contratistas vencidos o por vencer ---
    const todayStr = today.toISOString().split('T')[0]
    for (const doc of (docsRes.data ?? []) as any[]) {
      if (!doc.expiry_date) continue
      const contractorName = doc.contractor?.name ?? 'Contratista'
      if (doc.expiry_date < todayStr) {
        notifications.push({
          id: `doc-expired-${doc.id}`,
          level: 'danger',
          title: 'Documento vencido',
          description: `${contractorName} — ${doc.name}`,
          link: `/contratistas/${doc.contractor_id}`,
        })
      } else if (doc.expiry_date <= docExpiryWarning) {
        notifications.push({
          id: `doc-expiring-${doc.id}`,
          level: 'warning',
          title: 'Documento por vencer (≤30 días)',
          description: `${contractorName} — ${doc.name}`,
          link: `/contratistas/${doc.contractor_id}`,
        })
      }
    }

    return notifications
  },
}
