import { supabase } from '@/lib/supabase'

export const dashboardService = {
  async getKPIs() {
    const [payrollRes, transactionsRes] = await Promise.all([
      supabase
        .from('payroll_periods')
        .select('id, grand_total, created_at, project_id'),
      supabase
        .from('transactions')
        .select('id, total, payment_condition, date, description, project_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const payrolls = payrollRes.data || []
    const transactions = transactionsRes.data || []

    const totalInvested = payrolls.reduce((sum: number, p: any) => sum + (p.grand_total || 0), 0)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const payrollsThisMonth = payrolls.filter(
      (p: any) => p.created_at && p.created_at >= monthStart
    ).length

    const cxpTotal = transactions
      .filter((t: any) => t.payment_condition?.includes('Credito'))
      .reduce((sum: number, t: any) => sum + (t.total || 0), 0)

    return {
      totalInvested,
      payrollsThisMonth,
      cxpTotal,
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

    const activities: { id: string; type: string; description: string; amount: number; date: string; projectId: string }[] = []

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

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8)
  },
}
