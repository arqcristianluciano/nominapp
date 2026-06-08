import { supabase } from '@/lib/supabase'
import { isCreditCondition } from '@/utils/financialCalculations'
import { formatRD } from '@/utils/currency'

export type NotifLevel = 'danger' | 'warning' | 'info'

export interface AppNotification {
  id: string
  level: NotifLevel
  title: string
  description: string
  link: string
}

interface ProjectLite {
  id: string
  name: string
  code: string
}

interface BudgetCategoryLite {
  id: string
  project_id: string
  name: string
  budgeted_amount: number | null
}

interface TransactionLite {
  id: string
  description: string
  total: number | null
  date: string
  project_id: string
  payment_condition?: string | null
  supplier?: { name?: string | null } | null
  budget_category?: { code?: string | null } | null
}

interface ContractorDocumentLite {
  id: string
  name: string
  contractor_id: string
  expiry_date: string | null
  contractor?: { name?: string | null } | null
}

interface BudgetExecutionTransactionLite {
  project_id: string
  total: number | null
  budget_category_id?: string | null
  budget_category?: { code?: string | null } | null
}

interface OverdueQualityControlLite {
  id: string
  element: string
  pour_date: string
  project_id: string
}

/** Cuota de préstamo pendiente con nombre del contratista. */
interface LoanInstallmentLite {
  id: string
  loan_id: string
  numero_cuota: number
  fecha_pago_programada: string
  monto: number
  loan: {
    contractor_id: string
    contractor: { name?: string | null } | null
  } | null
}

/** Registro de calidad pendiente de ensayo, para calcular cuándo se debe ensayar. */
interface QCUpcomingTestLite {
  id: string
  element: string
  pour_date: string
  test_age: string | null
  project_id: string
}

const DAYS_APPROACHING = 15
const DAYS_OVERDUE = 28
const CXP_WARNING_DAYS = 30
const CXP_DANGER_DAYS = 60
const BUDGET_WARNING_THRESHOLD = 0.8
const BUDGET_DANGER_THRESHOLD = 1.0
/** Umbral de advertencia por capítulo: ≥90% gastado del presupuesto asignado. */
const CATEGORY_OVERRUN_WARNING_THRESHOLD = 0.9
/** Umbral de peligro por capítulo: ≥100% gastado (excedido). */
const CATEGORY_OVERRUN_DANGER_THRESHOLD = 1.0
const DOC_EXPIRY_WARNING_DAYS = 30
/** Días de anticipación para avisar de cuotas de préstamo próximas a vencer. */
const LOAN_INSTALLMENT_WARNING_DAYS = 7
/** Días de anticipación para avisar de ensayos de hormigón próximos (fecha_vaciado + edad). */
const QC_TEST_WARNING_DAYS = 7

export const notificationService = {
  /** Calcula y retorna todas las notificaciones del sistema (OCs, calidad, CxP, presupuesto, documentos, préstamos). */
  async getAll(): Promise<AppNotification[]> {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const approachingCutoff = new Date(today)
    approachingCutoff.setDate(approachingCutoff.getDate() - DAYS_APPROACHING)
    const cutoffStr = approachingCutoff.toISOString().split('T')[0]

    const warningDateStr = new Date(today.getTime() - CXP_WARNING_DAYS * 86400000).toISOString().split('T')[0]
    const dangerDateStr = new Date(today.getTime() - CXP_DANGER_DAYS * 86400000).toISOString().split('T')[0]
    const docExpiryWarning = new Date(today.getTime() + DOC_EXPIRY_WARNING_DAYS * 86400000).toISOString().split('T')[0]
    // Cuotas: traer las que vencen dentro de LOAN_INSTALLMENT_WARNING_DAYS días, incluyendo ya vencidas (lte = ≤)
    const loanInstallmentWindowStr = new Date(today.getTime() + LOAN_INSTALLMENT_WARNING_DAYS * 86400000)
      .toISOString()
      .split('T')[0]

    const [
      poRes,
      qcOverdueRes,
      qcFailedRes,
      txnDangerRes,
      txnWarningRes,
      budgetCatRes,
      transactionsRes,
      projectsRes,
      docsRes,
      loanInstallmentsRes,
      qcUpcomingTestRes,
    ] = await Promise.all([
      // 0 — OCs pendientes de aprobación / liberación
      supabase
        .from('purchase_requisitions')
        .select('id, req_number, status, project:projects(name)')
        .in('status', ['pending_approval', 'pendiente_liberacion']),
      // 1 — Ensayos sin resultado y vaciado ya pasado (alerta QC existente por días desde vaciado)
      supabase
        .from('quality_control')
        .select('id, element, pour_date, project_id')
        .is('test_date', null)
        .lte('pour_date', cutoffStr),
      // 2 — Ensayos fallidos
      supabase
        .from('quality_control')
        .select('id, element, project_id')
        .eq('status', 'failed')
        .order('pour_date', { ascending: false })
        .limit(10),
      // 3 — CxP vencidas > 60 días sin pagar
      supabase
        .from('transactions')
        .select('id, description, total, date, project_id, payment_condition, supplier:suppliers(name)')
        .lte('date', dangerDateStr)
        .limit(100),
      // 4 — CxP por vencer (31-60 días sin pagar)
      supabase
        .from('transactions')
        .select('id, description, total, date, project_id, payment_condition, supplier:suppliers(name)')
        .lte('date', warningDateStr)
        .gt('date', dangerDateStr)
        .limit(100),
      // 5 — Categorías presupuestales
      supabase.from('budget_categories').select('id, project_id, name, budgeted_amount'),
      // 6 — Transacciones (ejecución presupuestal), con category_id para agrupar por capítulo
      supabase
        .from('transactions')
        .select('project_id, total, budget_category_id, budget_category:budget_categories(code)'),
      // 7 — Proyectos
      supabase.from('projects').select('id, name, code'),
      // 8 — Documentos de contratistas
      supabase.from('contractor_documents').select('*, contractor:contractors(name)'),
      // 9 — Cuotas de préstamo pendientes que vencen pronto o ya vencieron
      supabase
        .from('loan_installments')
        .select(
          'id, loan_id, numero_cuota, fecha_pago_programada, monto, loan:contractor_loans(contractor_id, contractor:contractors(name))',
        )
        .eq('estado', 'pendiente')
        .lte('fecha_pago_programada', loanInstallmentWindowStr)
        .order('fecha_pago_programada', { ascending: true })
        .limit(50),
      // 10 — Registros de calidad sin resultado ni fecha de ensayo (para calcular fecha esperada)
      supabase
        .from('quality_control')
        .select('id, element, pour_date, test_age, project_id')
        .is('test_date', null)
        .is('status', null),
    ])

    if (poRes.error) throw poRes.error
    if (qcOverdueRes.error) throw qcOverdueRes.error
    if (qcFailedRes.error) throw qcFailedRes.error
    if (txnDangerRes.error) throw txnDangerRes.error
    if (txnWarningRes.error) throw txnWarningRes.error
    if (budgetCatRes.error) throw budgetCatRes.error
    if (transactionsRes.error) throw transactionsRes.error
    if (projectsRes.error) throw projectsRes.error
    if (docsRes.error) throw docsRes.error
    if (loanInstallmentsRes.error) throw loanInstallmentsRes.error
    if (qcUpcomingTestRes.error) throw qcUpcomingTestRes.error

    const notifications: AppNotification[] = []

    // --- Órdenes de compra pendientes ---
    for (const po of (poRes.data || []) as {
      id: string
      req_number: string
      status: string
      project?: { name?: string } | null
    }[]) {
      const awaitingRelease = po.status === 'pendiente_liberacion'
      notifications.push({
        id: `po-${po.id}`,
        level: 'warning',
        title: awaitingRelease ? 'OC pendiente de liberación' : 'OC pendiente de aprobación',
        description: `${po.req_number}${po.project ? ` — ${po.project.name}` : ''}`,
        link: `/ordenes-compra/${po.id}`,
      })
    }

    // --- Ensayos de hormigón sin resultado (por días desde vaciado) ---
    for (const qc of (qcOverdueRes.data || []) as OverdueQualityControlLite[]) {
      const daysSince = Math.floor((today.getTime() - new Date(qc.pour_date).getTime()) / 86_400_000)
      const isOverdue = daysSince >= DAYS_OVERDUE
      notifications.push({
        id: `qc-overdue-${qc.id}`,
        level: isOverdue ? 'danger' : 'warning',
        title: isOverdue ? 'Ensayo vencido sin resultado' : 'Ensayo próximo a vencer',
        description: `${qc.element} — ${daysSince} días desde el vaciado`,
        link: `/proyectos/${qc.project_id}/calidad`,
      })
    }

    const overduIds = new Set((qcOverdueRes.data || []).map((q: { id: string }) => q.id))
    for (const qc of (qcFailedRes.data || []) as { id: string; element: string; project_id: string }[]) {
      if (overduIds.has(qc.id)) continue
      notifications.push({
        id: `qc-failed-${qc.id}`,
        level: 'danger',
        title: 'Ensayo de hormigón fallido',
        description: qc.element,
        link: `/proyectos/${qc.project_id}/calidad`,
      })
    }

    // --- CxP (Cuentas por Pagar) vencidas y por vencer ---
    const dangerCreditTxns = (
      (txnDangerRes.data || []) as Array<TransactionLite & { payment_condition?: string | null }>
    )
      .filter((txn) => isCreditCondition(txn.payment_condition))
      .slice(0, 10)
    for (const txn of dangerCreditTxns) {
      const days = Math.floor((today.getTime() - new Date(txn.date).getTime()) / 86400000)
      notifications.push({
        id: `cxp-danger-${txn.id}`,
        level: 'danger',
        title: 'CxP vencida (+60 días)',
        description: `${txn.supplier?.name ?? txn.description} — ${days}d sin pagar`,
        link: `/proyectos/${txn.project_id}/control`,
      })
    }

    const warningCreditTxns = (
      (txnWarningRes.data || []) as Array<TransactionLite & { payment_condition?: string | null }>
    )
      .filter((txn) => isCreditCondition(txn.payment_condition))
      .slice(0, 10)
    for (const txn of warningCreditTxns) {
      const days = Math.floor((today.getTime() - new Date(txn.date).getTime()) / 86400000)
      notifications.push({
        id: `cxp-warning-${txn.id}`,
        level: 'warning',
        title: 'CxP por vencer (31-60 días)',
        description: `${txn.supplier?.name ?? txn.description} — ${days}d sin pagar`,
        link: `/proyectos/${txn.project_id}/control`,
      })
    }

    // --- Desviación presupuestaria ---
    const allProjects = (projectsRes.data ?? []) as ProjectLite[]
    const allTransactions = (transactionsRes.data ?? []) as unknown as BudgetExecutionTransactionLite[]
    const allCategories = (budgetCatRes.data ?? []) as BudgetCategoryLite[]

    const projectMap = Object.fromEntries(allProjects.map((p) => [p.id, p]))
    const totalBudgetByProject: Record<string, number> = {}
    for (const cat of allCategories) {
      totalBudgetByProject[cat.project_id] = (totalBudgetByProject[cat.project_id] ?? 0) + (cat.budgeted_amount ?? 0)
    }
    const totalActualByProject: Record<string, number> = {}
    for (const txn of allTransactions) {
      const isDeposit = txn.budget_category?.code === '19 - DEPOSITOS'
      if (isDeposit) continue
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

    // --- Sobrecosto por capítulo (≥90% warning, ≥100% danger) ---
    // Gasto real por capítulo = suma de transactions con ese budget_category_id,
    // excluyendo depósitos (igual que la lógica de proyecto de arriba).
    const spentByCategory: Record<string, number> = {}
    for (const txn of allTransactions) {
      const isDeposit = txn.budget_category?.code === '19 - DEPOSITOS'
      if (isDeposit) continue
      if (!txn.budget_category_id) continue
      spentByCategory[txn.budget_category_id] = (spentByCategory[txn.budget_category_id] ?? 0) + (txn.total ?? 0)
    }

    for (const cat of allCategories as BudgetCategoryLite[]) {
      const budgeted = cat.budgeted_amount ?? 0
      if (!budgeted) continue // omite capítulos sin presupuesto asignado
      const spent = spentByCategory[cat.id] ?? 0
      if (!spent) continue // omite capítulos sin ningún gasto registrado
      const ratio = spent / budgeted
      const pct = Math.round(ratio * 100)
      const project = projectMap[cat.project_id]
      if (!project) continue

      const spentFmt = formatRD(spent)
      if (ratio >= CATEGORY_OVERRUN_DANGER_THRESHOLD) {
        notifications.push({
          id: `cat-overrun-danger-${cat.id}`,
          level: 'danger',
          title: 'Capítulo excedido',
          description: `${project.name} › ${cat.name} — ${pct}% gastado (${spentFmt} excedido)`,
          link: `/proyectos/${cat.project_id}/presupuesto`,
        })
      } else if (ratio >= CATEGORY_OVERRUN_WARNING_THRESHOLD) {
        notifications.push({
          id: `cat-overrun-warning-${cat.id}`,
          level: 'warning',
          title: 'Capítulo al límite (≥90%)',
          description: `${project.name} › ${cat.name} — ${pct}% gastado (${spentFmt})`,
          link: `/proyectos/${cat.project_id}/presupuesto`,
        })
      }
    }

    // --- Documentos de contratistas vencidos o por vencer ---
    for (const doc of (docsRes.data ?? []) as ContractorDocumentLite[]) {
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

    // --- Cuotas de préstamo vencidas o próximas a vencer (≤7 días) ---
    // Supabase infiere los joins como arrays; casteamos a unknown primero para evitar el error TS.
    for (const inst of (loanInstallmentsRes.data ?? []) as unknown as LoanInstallmentLite[]) {
      const contractorName = inst.loan?.contractor?.name ?? 'Contratista'
      const dueDateMs = new Date(inst.fecha_pago_programada + 'T00:00:00').getTime()
      const diffDays = Math.ceil((dueDateMs - today.getTime()) / 86400000)
      const montoFmt = formatRD(inst.monto)

      if (diffDays < 0) {
        // Ya vencida
        const overduedays = Math.abs(diffDays)
        notifications.push({
          id: `loan-inst-overdue-${inst.id}`,
          level: 'danger',
          title: 'Cuota de préstamo vencida',
          description: `${contractorName} — cuota ${inst.numero_cuota} (${montoFmt}) vencida hace ${overduedays}d`,
          link: `/prestamos`,
        })
      } else {
        // Por vencer en los próximos días
        const label = diffDays === 0 ? 'hoy' : `en ${diffDays}d`
        notifications.push({
          id: `loan-inst-due-${inst.id}`,
          level: diffDays <= 2 ? 'danger' : 'warning',
          title: 'Cuota de préstamo próxima a vencer',
          description: `${contractorName} — cuota ${inst.numero_cuota} (${montoFmt}) vence ${label}`,
          link: `/prestamos`,
        })
      }
    }

    // --- Ensayos de hormigón con fecha esperada próxima o vencida (calculado en cliente) ---
    // Filtra solo los que tienen test_age definida y calcula la fecha esperada del ensayo
    const qcUpcomingTestIdsAlreadyAlerted = new Set([
      ...overduIds,
      ...(qcFailedRes.data ?? []).map((q: { id: string }) => q.id),
    ])
    for (const qc of (qcUpcomingTestRes.data ?? []) as QCUpcomingTestLite[]) {
      // Si ya fue alertado por la lógica existente de "días desde vaciado", no duplicar
      if (qcUpcomingTestIdsAlreadyAlerted.has(qc.id)) continue
      if (!qc.test_age) continue

      const ageDays = parseInt(qc.test_age)
      if (isNaN(ageDays) || ageDays <= 0) continue

      // Fecha esperada de ensayo = fecha de vaciado + edad en días
      const pourMs = new Date(qc.pour_date + 'T00:00:00').getTime()
      const expectedTestMs = pourMs + ageDays * 86400000
      const diffDays = Math.ceil((expectedTestMs - today.getTime()) / 86400000)

      if (diffDays > QC_TEST_WARNING_DAYS) continue // Todavía falta más de 7 días, no alertar

      if (diffDays < 0) {
        const overduedays = Math.abs(diffDays)
        notifications.push({
          id: `qc-test-overdue-${qc.id}`,
          level: 'danger',
          title: 'Ensayo de hormigón vencido',
          description: `${qc.element} — ensayo de ${qc.test_age} días vencido hace ${overduedays}d`,
          link: `/proyectos/${qc.project_id}/calidad`,
        })
      } else {
        const label = diffDays === 0 ? 'hoy' : `en ${diffDays}d`
        notifications.push({
          id: `qc-test-due-${qc.id}`,
          level: diffDays <= 1 ? 'danger' : 'warning',
          title: 'Ensayo de hormigón próximo',
          description: `${qc.element} — ensayo de ${qc.test_age} días se realiza ${label}`,
          link: `/proyectos/${qc.project_id}/calidad`,
        })
      }
    }

    return notifications
  },
}
