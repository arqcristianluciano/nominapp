import { supabase } from '@/lib/supabase'
import { calcTotalCxP, type FinancialTransaction } from '@/utils/financialCalculations'
import { COMMITTED_PAYROLL_STATUSES } from '@/services/payrollService'

function localISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

interface PayrollKpiRow {
  grand_total: number | null
  created_at: string
  status: string | null
}

interface TransactionKpiRow {
  total: number | null
  payment_condition: string | null
  date: string
}

function isBetween(dateValue: string | null | undefined, from: string, to: string) {
  if (!dateValue) return false
  const dateOnly = dateValue.slice(0, 10)
  return dateOnly >= from && dateOnly <= to
}

export const dashboardService = {
  async getKPIs() {
    const [payrollRes, transactionsRes] = await Promise.all([
      supabase
        .from('payroll_periods')
        .select('id, grand_total, created_at, project_id, status')
        .in('status', COMMITTED_PAYROLL_STATUSES),
      supabase
        .from('transactions')
        .select('id, total, payment_condition, date, description, project_id, created_at')
        .order('created_at', { ascending: false })
        // Antes 200: truncaba los totales (CxP) en proyectos con muchas transacciones.
        // 5000 cubre con holgura la escala actual sin afectar el rendimiento.
        .limit(5000),
    ])

    const payrolls = (payrollRes.data || []) as PayrollKpiRow[]
    const transactions = (transactionsRes.data || []) as TransactionKpiRow[]

    const now = new Date()
    const monthStart = localISO(new Date(now.getFullYear(), now.getMonth(), 1))
    const prevMonthStart = localISO(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const prevMonthEnd = localISO(new Date(now.getFullYear(), now.getMonth(), 0))

    const totalInvested = payrolls.reduce((sum, p) => sum + (p.grand_total || 0), 0)
    const prevInvested = payrolls
      .filter((p) => isBetween(p.created_at, prevMonthStart, prevMonthEnd))
      .reduce((sum, p) => sum + (p.grand_total || 0), 0)

    const payrollsThisMonth = payrolls.filter((p) => p.created_at && p.created_at.slice(0, 10) >= monthStart).length
    const prevPayrolls = payrolls.filter((p) => isBetween(p.created_at, prevMonthStart, prevMonthEnd)).length

    const cxpTotal = calcTotalCxP(transactions as FinancialTransaction[])
    const prevCxp = calcTotalCxP(
      transactions.filter((t) => isBetween(t.date, prevMonthStart, prevMonthEnd)) as FinancialTransaction[],
    )

    return {
      totalInvested,
      payrollsThisMonth,
      cxpTotal,
      prevInvested,
      prevPayrolls,
      prevCxp,
    }
  },

  /**
   * Gasto mensual consolidado (todos los proyectos) para los últimos `months` meses.
   * Suma nóminas aprobadas (por report_date) + transacciones (por date).
   * Devuelve un array de { month: 'YYYY-MM', spend: number } ordenado ascendente.
   */
  async getMonthlySpend(months = 12): Promise<Array<{ month: string; spend: number }>> {
    const now = new Date()
    // Primer día del mes que empieza el rango (hace `months - 1` meses atrás)
    const fromDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
    const fromISO = localISO(fromDate)

    const [payrollRes, txnRes] = await Promise.all([
      supabase
        .from('payroll_periods')
        .select('grand_total, report_date')
        .in('status', COMMITTED_PAYROLL_STATUSES)
        .gte('report_date', fromISO),
      supabase.from('transactions').select('total, date').gte('date', fromISO),
    ])

    const spendMap = new Map<string, number>()
    const ensureMonth = (ym: string) => {
      if (!spendMap.has(ym)) spendMap.set(ym, 0)
    }

    for (const p of (payrollRes.data ?? []) as Array<{ grand_total: number | null; report_date: string | null }>) {
      const ym = p.report_date ? p.report_date.slice(0, 7) : null
      if (!ym) continue
      ensureMonth(ym)
      spendMap.set(ym, (spendMap.get(ym) ?? 0) + (p.grand_total ?? 0))
    }

    for (const t of (txnRes.data ?? []) as Array<{ total: number | null; date: string | null }>) {
      const ym = t.date ? t.date.slice(0, 7) : null
      if (!ym) continue
      ensureMonth(ym)
      spendMap.set(ym, (spendMap.get(ym) ?? 0) + (t.total ?? 0))
    }

    return Array.from(spendMap.entries())
      .map(([month, spend]) => ({ month, spend }))
      .sort((a, b) => a.month.localeCompare(b.month))
  },

  async getRecentActivity() {
    const [txnRes, payrollRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, description, total, date, created_at, project_id')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('payroll_periods')
        .select('id, period_number, grand_total, report_date, created_at, project_id')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const activities: {
      id: string
      type: string
      description: string
      amount: number
      date: string
      projectId: string
    }[] = []

    for (const t of txnRes.data || []) {
      activities.push({
        id: t.id,
        type: 'transaction',
        description: t.description,
        amount: t.total,
        date: t.created_at,
        projectId: t.project_id,
      })
    }

    for (const p of payrollRes.data || []) {
      activities.push({
        id: p.id,
        type: 'payroll',
        description: `Reporte No. ${p.period_number}`,
        amount: p.grand_total || 0,
        date: p.created_at,
        projectId: p.project_id,
      })
    }

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
  },
}
