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
        .limit(200),
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
