import { supabase } from '@/lib/supabase'
import type { ContractorLoan, LoanDeduction, LoanStatus } from '@/types/database'
import { add, div, money, pct, round2 } from '@/utils/money'

/** Cuota fija: capital + interés simple distribuido en N cuotas */
export function calcInstallmentAmount(principal: number, interestRate: number, installments: number): number {
  if (installments <= 0) return 0
  const base = money(principal)
  const totalInterest = pct(base, interestRate)
  return round2(div(add(base, totalInterest), installments))
}

export const loanService = {
  /** Lista todos los préstamos a contratistas con su contratista relacionado. */
  async getAll(): Promise<ContractorLoan[]> {
    const { data, error } = await supabase
      .from('contractor_loans')
      .select('*, contractor:contractors(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as ContractorLoan[]
  },

  /** Lista los préstamos de un contratista específico. */
  async getByContractor(contractorId: string): Promise<ContractorLoan[]> {
    const { data, error } = await supabase
      .from('contractor_loans')
      .select('*, contractor:contractors(*)')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as ContractorLoan[]
  },

  /** Crea un préstamo nuevo calculando la cuota e iniciándolo en estado activo. */
  async create(loan: {
    contractor_id: string
    principal: number
    interest_rate: number
    installments: number
    disbursed_date: string
    notes?: string
  }): Promise<ContractorLoan> {
    const installment_amount = calcInstallmentAmount(loan.principal, loan.interest_rate, loan.installments)
    const { data, error } = await supabase
      .from('contractor_loans')
      .insert({ ...loan, installment_amount, status: 'active' })
      .select('*, contractor:contractors(*)')
      .single()
    if (error) throw error
    return data as ContractorLoan
  },

  /** Actualiza el estado de un préstamo. */
  async updateStatus(id: string, status: LoanStatus): Promise<void> {
    const { error } = await supabase.from('contractor_loans').update({ status }).eq('id', id)
    if (error) throw error
  },

  /** Elimina un préstamo por id. */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('contractor_loans').delete().eq('id', id)
    if (error) throw error
  },

  // === DEDUCCIONES ===

  /** Lista las deducciones de préstamo aplicadas en un período de nómina. */
  async getDeductionsByPeriod(periodId: string): Promise<LoanDeduction[]> {
    const { data, error } = await supabase
      .from('loan_deductions')
      .select('*, loan:contractor_loans(*, contractor:contractors(*))')
      .eq('payroll_period_id', periodId)
    if (error) throw error
    return data as LoanDeduction[]
  },

  /** Lista las deducciones asociadas a un préstamo. */
  async getDeductionsByLoan(loanId: string): Promise<LoanDeduction[]> {
    const { data, error } = await supabase.from('loan_deductions').select('*').eq('loan_id', loanId)
    if (error) throw error
    return data as LoanDeduction[]
  },

  /** Crea una deducción de préstamo en un período de nómina. */
  async addDeduction(deduction: {
    loan_id: string
    payroll_period_id: string
    contractor_id: string
    amount: number
  }): Promise<LoanDeduction> {
    const { data, error } = await supabase
      .from('loan_deductions')
      .insert(deduction)
      .select('*, loan:contractor_loans(*, contractor:contractors(*))')
      .single()
    if (error) throw error
    return data as LoanDeduction
  },

  /** Elimina una deducción de préstamo por id. */
  async deleteDeduction(id: string): Promise<void> {
    const { error } = await supabase.from('loan_deductions').delete().eq('id', id)
    if (error) throw error
  },

  /** Total pagado de un préstamo a partir de sus deducciones */
  async getTotalPaid(loanId: string): Promise<number> {
    const deductions = await this.getDeductionsByLoan(loanId)
    return deductions.reduce((sum, d) => sum + d.amount, 0)
  },

  /** Total pagado para múltiples préstamos en UNA sola query.
   *  Devuelve `{ [loanId]: totalPaid }`. IDs sin deducciones no aparecen en el map. */
  async getTotalPaidByLoans(loanIds: string[]): Promise<Record<string, number>> {
    if (loanIds.length === 0) return {}
    const { data, error } = await supabase.from('loan_deductions').select('loan_id, amount').in('loan_id', loanIds)
    if (error) throw error
    const totals: Record<string, number> = {}
    for (const row of (data ?? []) as Array<{ loan_id: string; amount: number }>) {
      totals[row.loan_id] = (totals[row.loan_id] ?? 0) + row.amount
    }
    return totals
  },
}
