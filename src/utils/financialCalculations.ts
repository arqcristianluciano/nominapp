import { round2, sumBy, sub, add } from './money'

const DEPOSIT_CODE = '19 - DEPOSITOS'

/**
 * Returns true when a payment_condition string indicates a credit purchase
 * (e.g. "Crédito", "Credito", "CREDITO"). Accent-insensitive, lowercase.
 */
export function isCreditCondition(value: string | null | undefined): boolean {
  if (!value) return false
  const normalized = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return normalized.includes('credito')
}

export interface FinancialTransaction {
  total: number
  payment_condition?: string | null
  budget_category?: { code?: string | null } | null
  budget_category_id?: string | null
  cashed_date?: string | null
  invoice_number?: string | null
  supplier_id?: string | null
  date: string
  supplier?: { name?: string | null } | null
}

export function calcTransitos(transactions: FinancialTransaction[]): number {
  const transitos = transactions.filter((t) => t.payment_condition?.includes('Cheque') && !t.cashed_date)
  return round2(sumBy(transitos, (t) => t.total))
}

export function calcCashDisponible(transactions: FinancialTransaction[]): number {
  const deposits = transactions.filter((t) => t.budget_category?.code === DEPOSIT_CODE)
  const egresses = transactions.filter((t) => t.budget_category?.code !== DEPOSIT_CODE)
  return round2(
    sub(
      sumBy(deposits, (t) => t.total),
      sumBy(egresses, (t) => t.total),
    ),
  )
}

export function calcTotalCxP(transactions: FinancialTransaction[]): number {
  const creditTransactions = transactions.filter((t) => isCreditCondition(t.payment_condition))

  let totalPending = 0
  for (const credit of creditTransactions) {
    const invoiceNo = credit.invoice_number
    if (!invoiceNo) {
      totalPending = round2(add(totalPending, credit.total))
      continue
    }

    const payments = transactions.filter(
      (t) =>
        !isCreditCondition(t.payment_condition) &&
        t.invoice_number === invoiceNo &&
        t.supplier_id === credit.supplier_id,
    )
    const paid = round2(sumBy(payments, (p) => Math.abs(p.total)))
    const pending = round2(sub(credit.total, paid))
    if (pending > 0) totalPending = round2(add(totalPending, pending))
  }

  return totalPending
}

export function calcDisponibleNeto(cash: number, cxp: number, transitos: number): number {
  return round2(sub(sub(cash, cxp), transitos))
}

export function calcTotalIncurrido(transactions: FinancialTransaction[]): number {
  const egresses = transactions.filter((t) => t.budget_category?.code !== DEPOSIT_CODE)
  return round2(sumBy(egresses, (t) => t.total))
}

export function calcBudgetSpent(transactions: FinancialTransaction[], categoryId: string): number {
  const subset = transactions.filter((t) => t.budget_category_id === categoryId)
  return round2(sumBy(subset, (t) => t.total))
}

export interface CxPItem {
  date: string
  invoiceNumber: string | null
  supplierName: string
  supplierId: string | null
  pending: number
  paymentCondition: string
}

export function calcCxPDetails(transactions: FinancialTransaction[]): CxPItem[] {
  const creditTransactions = transactions.filter((t) => isCreditCondition(t.payment_condition))

  return creditTransactions
    .map((credit) => {
      const invoiceNo = credit.invoice_number
      let paid = 0

      if (invoiceNo) {
        const payments = transactions.filter(
          (t) =>
            !isCreditCondition(t.payment_condition) &&
            t.invoice_number === invoiceNo &&
            t.supplier_id === credit.supplier_id,
        )
        paid = round2(sumBy(payments, (p) => Math.abs(p.total)))
      }

      return {
        date: credit.date,
        invoiceNumber: credit.invoice_number ?? null,
        supplierName: credit.supplier?.name || 'Sin proveedor',
        supplierId: credit.supplier_id ?? null,
        pending: Math.max(0, round2(credit.total - paid)),
        paymentCondition: credit.payment_condition || '',
      }
    })
    .filter((item) => item.pending > 0)
}
