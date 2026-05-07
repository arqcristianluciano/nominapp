import type { PayrollPeriod, LaborLineItem, MaterialInvoice, IndirectCost, LoanDeduction } from '@/types/database'

export interface PayrollPrintDetail {
  period: PayrollPeriod
  laborItems: LaborLineItem[]
  materialInvoices: MaterialInvoice[]
  indirectCosts: IndirectCost[]
  loanDeductions: LoanDeduction[]
}
