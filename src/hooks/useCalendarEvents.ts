import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { parseDateLocal, todayISO } from '@/utils/dateLocal'
import { round2 } from '@/utils/money'

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
  invoice_number: string | null
  supplier_id: string | null
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

interface UseCalendarEventsOptions {
  startDate?: string
  endDate?: string
}

function isCreditCondition(value: string | null | undefined): boolean {
  if (!value) return false
  const normalized = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return normalized.includes('credito') || normalized.includes('credit')
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = (error as { name?: unknown }).name
  const code = (error as { code?: unknown }).code
  return name === 'AbortError' || code === '20' || code === 20
}

export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const { startDate, endDate } = options
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      try {
        const todayStr = todayISO()

        // No se filtra por fecha en la consulta: para saber si una factura a
        // crédito ya se pagó hay que ver también su pago (que puede tener otra
        // fecha). El filtro por rango se aplica después, al armar los eventos.
        const txnQuery = supabase
          .from('transactions')
          .select(
            'id, description, total, date, project_id, payment_condition, invoice_number, supplier_id, supplier:suppliers(name)',
          )
          .order('date', { ascending: false })
          .limit(5000)

        let corteQuery = supabase
          .from('contract_cortes')
          .select('id, cut_date, amount, retention_amount, contract:adjustment_contracts(project_id, specialty)')
          .eq('status', 'approved')
        if (startDate) corteQuery = corteQuery.gte('cut_date', startDate)
        if (endDate) corteQuery = corteQuery.lte('cut_date', endDate)
        corteQuery = corteQuery.limit(50)

        const loanQuery = supabase
          .from('contractor_loans')
          .select('*, contractor:contractors(name)')
          .eq('status', 'active')
        const loanDeductionQuery = supabase.from('loan_deductions').select('loan_id, amount')
        const projectQuery = supabase.from('projects').select('id, name, code')

        const requests = signal
          ? [
              txnQuery.abortSignal(signal),
              loanQuery.abortSignal(signal),
              loanDeductionQuery.abortSignal(signal),
              corteQuery.abortSignal(signal),
              projectQuery.abortSignal(signal),
            ]
          : [txnQuery, loanQuery, loanDeductionQuery, corteQuery, projectQuery]

        const [txnRes, loanRes, loanDeductionRes, corteRes, projectRes] = await Promise.all(requests)

        if (signal?.aborted) return

        const projectMap: Record<string, ProjectLite> = Object.fromEntries(
          ((projectRes.data ?? []) as ProjectLite[]).map((project) => [project.id, project]),
        )
        const paidByLoan = new Map<string, number>()
        for (const deduction of (loanDeductionRes.data ?? []) as LoanDeductionAggregate[]) {
          const paid = paidByLoan.get(deduction.loan_id) ?? 0
          paidByLoan.set(deduction.loan_id, paid + (deduction.amount ?? 0))
        }

        const txns = (txnRes.data ?? []) as CalendarTransaction[]

        // Suma de pagos por factura (transacciones NO a crédito con el mismo
        // número de factura + proveedor): sirve para descontar de la deuda y no
        // mostrar en el calendario facturas a crédito que ya se pagaron.
        const paidByInvoice = new Map<string, number>()
        for (const t of txns) {
          if (isCreditCondition(t.payment_condition)) continue
          if (!t.invoice_number) continue
          const key = `${t.invoice_number}|${t.supplier_id ?? ''}`
          paidByInvoice.set(key, (paidByInvoice.get(key) ?? 0) + Math.abs(t.total))
        }

        const allEvents: CalendarEvent[] = []
        for (const txn of txns) {
          if (!isCreditCondition(txn.payment_condition)) continue
          // Descontar lo ya pagado; si la factura está saldada, no es deuda.
          const key = `${txn.invoice_number ?? ''}|${txn.supplier_id ?? ''}`
          const paid = txn.invoice_number ? (paidByInvoice.get(key) ?? 0) : 0
          const pending = round2(txn.total - paid)
          if (pending <= 0) continue
          // Filtro por rango del calendario (antes se hacía en la consulta).
          if (startDate && txn.date < startDate) continue
          if (endDate && txn.date > endDate) continue
          const project = projectMap[txn.project_id]
          allEvents.push({
            id: `cxp-${txn.id}`,
            date: txn.date,
            title: txn.supplier?.name ?? txn.description,
            amount: pending,
            type: 'cxp',
            projectName: project?.name ?? 'Proyecto',
            link: `/proyectos/${txn.project_id}/control`,
            overdue: txn.date < todayStr,
          })
        }

        for (const loan of (loanRes.data ?? []) as CalendarLoan[]) {
          if (loan.installment_amount <= 0) continue
          const totalPaid = paidByLoan.get(loan.id) ?? 0
          const paidInstallments = Math.floor(totalPaid / loan.installment_amount)
          const disbursed = parseDateLocal(loan.disbursed_date)
          for (let installment = paidInstallments + 1; installment <= loan.installments; installment += 1) {
            const dueDate = new Date(disbursed)
            dueDate.setMonth(dueDate.getMonth() + installment)
            const date = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
            if (startDate && date < startDate) continue
            if (endDate && date > endDate) continue
            allEvents.push({
              id: `loan-${loan.id}-${installment}`,
              date,
              title: `Cuota ${installment}/${loan.installments} — ${loan.contractor?.name ?? 'Contratista'}`,
              amount: loan.installment_amount,
              type: 'loan',
              projectName: 'Préstamos',
              link: '/prestamos',
              overdue: date < todayStr,
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

        if (signal?.aborted) return
        setEvents(allEvents)
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) return
        throw error
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [startDate, endDate],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => {
      controller.abort()
    }
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
