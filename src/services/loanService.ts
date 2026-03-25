import { supabase } from '@/lib/supabase'
import type { ContractorLoan, LoanDeduction, LoanStatus } from '@/types/database'

/** Cuota fija: capital + interés simple distribuido en N cuotas */
export function calcInstallmentAmount(principal: number, interestRate: number, installments: number): number {
  const totalInterest = principal * (interestRate / 100)
  return (principal + totalInterest) / installments
}

export const loanService = {
  async getAll(): Promise<ContractorLoan[]> {
    const { data, error } = await supabase
      .from('contractor_loans')
      .select('*, contractor:contractors(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as ContractorLoan[]
  },

  async getByContractor(contractorId: string): Promise<ContractorLoan[]> {
    const { data, error } = await supabase
      .from('contractor_loans')
      .select('*, contractor:contractors(*)')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as ContractorLoan[]
  },

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

  async updateStatus(id: string, status: LoanStatus): Promise<void> {
    const { error } = await supabase
      .from('contractor_loans')
      .update({ status })
      .eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contractor_loans')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // === DEDUCCIONES ===

  async getDeductionsByPeriod(periodId: string): Promise<LoanDeduction[]> {
    const { data, error } = await supabase
      .from('loan_deductions')
      .select('*, loan:contractor_loans(*, contractor:contractors(*))')
      .eq('payroll_period_id', periodId)
    if (error) throw error
    return data as LoanDeduction[]
  },

  async getDeductionsByLoan(loanId: string): Promise<LoanDeduction[]> {
    const { data, error } = await supabase
      .from('loan_deductions')
      .select('*')
      .eq('loan_id', loanId)
    if (error) throw error
    return data as LoanDeduction[]
  },

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

  async deleteDeduction(id: string): Promise<void> {
    const { error } = await supabase
      .from('loan_deductions')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  /** Total pagado de un préstamo a partir de sus deducciones */
  async getTotalPaid(loanId: string): Promise<number> {
    const deductions = await this.getDeductionsByLoan(loanId)
    return deductions.reduce((sum, d) => sum + d.amount, 0)
  },
}
