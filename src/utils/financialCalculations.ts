import type { TransactionWithRelations } from '@/services/transactionService'

const DEPOSIT_CODE = '19 - DEPOSITOS'

export function calcTransitos(transactions: TransactionWithRelations[]): number {
  return transactions
    .filter((t) => t.payment_condition?.includes('Cheque') && !t.cashed_date)
    .reduce((sum, t) => sum + t.total, 0)
}

export function calcCashDisponible(transactions: TransactionWithRelations[]): number {
  const deposits = transactions
    .filter((t) => t.budget_category?.code === DEPOSIT_CODE)
    .reduce((sum, t) => sum + t.total, 0)

  const egresses = transactions
    .filter((t) => t.budget_category?.code !== DEPOSIT_CODE)
    .reduce((sum, t) => sum + t.total, 0)

  return deposits - egresses
}

export function calcTotalCxP(transactions: TransactionWithRelations[]): number {
  const creditTransactions = transactions.filter((t) =>
    t.payment_condition?.includes('Credito')
  )

  let totalPending = 0
  for (const credit of creditTransactions) {
    const invoiceNo = credit.invoice_number
    if (!invoiceNo) {
      totalPending += credit.total
      continue
    }

    const payments = transactions.filter(
      (t) =>
        !t.payment_condition?.includes('Credito') &&
        t.invoice_number === invoiceNo &&
        t.supplier_id === credit.supplier_id
    )
    const paid = payments.reduce((sum, p) => sum + Math.abs(p.total), 0)
    const pending = credit.total - paid
    if (pending > 0) totalPending += pending
  }

  return totalPending
}

export function calcDisponibleNeto(
  cash: number,
  cxp: number,
  transitos: number
): number {
  return cash - cxp - transitos
}

export function calcTotalIncurrido(transactions: TransactionWithRelations[]): number {
  return transactions
    .filter((t) => t.budget_category?.code !== DEPOSIT_CODE)
    .reduce((sum, t) => sum + t.total, 0)
}

export function calcBudgetSpent(
  transactions: TransactionWithRelations[],
  categoryId: string
): number {
  return transactions
    .filter((t) => t.budget_category_id === categoryId)
    .reduce((sum, t) => sum + t.total, 0)
}

export interface CxPItem {
  date: string
  invoiceNumber: string | null
  supplierName: string
  supplierId: string | null
  pending: number
  paymentCondition: string
}

export function calcCxPDetails(transactions: TransactionWithRelations[]): CxPItem[] {
  const creditTransactions = transactions.filter((t) =>
    t.payment_condition?.includes('Credito')
  )

  return creditTransactions.map((credit) => {
    const invoiceNo = credit.invoice_number
    let paid = 0

    if (invoiceNo) {
      const payments = transactions.filter(
        (t) =>
          !t.payment_condition?.includes('Credito') &&
          t.invoice_number === invoiceNo &&
          t.supplier_id === credit.supplier_id
      )
      paid = payments.reduce((sum, p) => sum + Math.abs(p.total), 0)
    }

    return {
      date: credit.date,
      invoiceNumber: credit.invoice_number,
      supplierName: credit.supplier?.name || 'Sin proveedor',
      supplierId: credit.supplier_id,
      pending: Math.max(0, credit.total - paid),
      paymentCondition: credit.payment_condition || '',
    }
  }).filter((item) => item.pending > 0)
}
