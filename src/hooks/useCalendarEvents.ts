import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface CalendarEvent {
  id: string
  date: string
  title: string
  amount: number
  type: 'cxp' | 'loan' | 'corte'
  projectName: string
  link: string
  overdue: boolean
}

interface ProjectLite {
  id: string
  name: string
}

interface CalendarTransaction {
  id: string
  description: string
  total: number
  date: string
  project_id: string
  payment_condition: string | null
  supplier?: { name?: string | null } | null
}

interface CalendarLoan {
  id: string
  disbursed_date: string
  installments: number
  installment_amount: number
  contractor?: { name?: string | null } | null
}

interface CalendarCorte {
  id: string
  cut_date: string
  amount: number
  retention_amount: number
  contract?: { project_id?: string; specialty?: string | null } | null
}

interface LoanDeductionAggregate {
  loan_id: string
  amount: number | null
}

function isCreditCondition(value: string | null | undefined): boolean {
  if (!value) return false
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return normalized.includes('credito') || normalized.includes('credit')
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date()
      const [txnRes, loanRes, loanDeductionRes, corteRes, projectRes] = await Promise.all([
        supabase.from('transactions').select('id, description, total, date, project_id, payment_condition, supplier:suppliers(name)').limit(300),
        supabase.from('contractor_loans').select('*, contractor:contractors(name)').eq('status', 'active'),
        supabase.from('loan_deductions').select('loan_id, amount'),
        supabase.from('contract_cortes').select('id, cut_date, amount, retention_amount, contract:adjustment_contracts(project_id, specialty)').eq('status', 'approved').limit(50),
        supabase.from('projects').select('id, name, code'),
      ])

      const projectMap: Record<string, ProjectLite> = Object.fromEntries(((projectRes.data ?? []) as ProjectLite[]).map((project) => [project.id, project]))
      const paidByLoan = new Map<string, number>()
      for (const deduction of (loanDeductionRes.data ?? []) as LoanDeductionAggregate[]) {
        const paid = paidByLoan.get(deduction.loan_id) ?? 0
        paidByLoan.set(deduction.loan_id, paid + (deduction.amount ?? 0))
      }

      const allEvents: CalendarEvent[] = []
      for (const txn of (txnRes.data ?? []) as CalendarTransaction[]) {
        if (!isCreditCondition(txn.payment_condition)) continue
        const project = projectMap[txn.project_id]
        allEvents.push({
          id: `cxp-${txn.id}`,
          date: txn.date,
          title: txn.supplier?.name ?? txn.description,
          amount: txn.total,
          type: 'cxp',
          projectName: project?.name ?? 'Proyecto',
          link: `/proyectos/${txn.project_id}/control`,
          overdue: txn.date < today.toISOString().split('T')[0],
        })
      }

      for (const loan of (loanRes.data ?? []) as CalendarLoan[]) {
        if (loan.installment_amount <= 0) continue
        const totalPaid = paidByLoan.get(loan.id) ?? 0
        const paidInstallments = Math.floor(totalPaid / loan.installment_amount)
        const disbursed = new Date(loan.disbursed_date)
        for (let installment = paidInstallments + 1; installment <= loan.installments; installment += 1) {
          const dueDate = new Date(disbursed)
          dueDate.setMonth(dueDate.getMonth() + installment)
          const date = dueDate.toISOString().split('T')[0]
          allEvents.push({
            id: `loan-${loan.id}-${installment}`,
            date,
            title: `Cuota ${installment}/${loan.installments} — ${loan.contractor?.name ?? 'Contratista'}`,
            amount: loan.installment_amount,
            type: 'loan',
            projectName: 'Préstamos',
            link: '/prestamos',
            overdue: date < today.toISOString().split('T')[0],
          })
        }
      }

      for (const corte of (corteRes.data ?? []) as CalendarCorte[]) {
        const project = corte.contract?.project_id ? projectMap[corte.contract.project_id] : undefined
        allEvents.push({
          id: `corte-${corte.id}`,
          date: corte.cut_date,
          title: `Corte — ${corte.contract?.specialty ?? 'Contrato'}`,
          amount: corte.amount - corte.retention_amount,
          type: 'corte',
          projectName: project?.name ?? 'Proyecto',
          link: `/proyectos/${corte.contract?.project_id}/cubicaciones`,
          overdue: false,
        })
      }

      setEvents(allEvents)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const totals = useMemo(() => {
    return {
      totalCxP: events.filter((item) => item.type === 'cxp').reduce((sum, item) => sum + item.amount, 0),
      totalLoans: events.filter((item) => item.type === 'loan').reduce((sum, item) => sum + item.amount, 0),
      totalCortes: events.filter((item) => item.type === 'corte').reduce((sum, item) => sum + item.amount, 0),
      overdue: events.filter((item) => item.overdue).length,
    }
  }, [events])

  return { events, loading, totals, reload: load }
}
