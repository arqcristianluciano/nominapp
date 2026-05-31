import type { PaymentDistribution } from '@/types/database'

const METHOD_LABELS: Record<PaymentDistribution['payment_method'], string> = {
  transfer: 'Transferencia',
  check: 'Cheque',
  deposit: 'Depósito',
  cash: 'Efectivo',
}

const STATUS_LABELS: Record<PaymentDistribution['status'], string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export const BANK_PAYMENT_HEADERS = [
  'Beneficiario',
  'Cédula/RNC',
  'Banco',
  'Cuenta',
  'Monto',
  'Método',
  'No. Cheque',
  'Cuenta origen',
  'Estado',
] as const

/** Resuelve el nombre legible de una cuenta de origen a partir de su id. */
export type SourceAccountResolver = (bankAccountId: string) => string | undefined

/**
 * Construye las filas (encabezado + datos) para exportar la distribución de
 * pagos de un período a CSV, con etiquetas en español y montos sin formato de
 * moneda (aptos para importar en banca electrónica u hojas de cálculo).
 */
export function buildBankPaymentRows(
  distributions: PaymentDistribution[],
  resolveSourceAccount?: SourceAccountResolver,
): string[][] {
  const header = [...BANK_PAYMENT_HEADERS]
  const dataRows = distributions.map((d) => [
    d.beneficiary ?? '',
    d.beneficiary_doc ?? '',
    d.bank_name ?? '',
    d.bank_account ?? '',
    d.amount.toFixed(2),
    METHOD_LABELS[d.payment_method] ?? d.payment_method,
    d.check_number ?? '',
    (d.bank_account_id && resolveSourceAccount?.(d.bank_account_id)) || '',
    STATUS_LABELS[d.status] ?? d.status,
  ])
  return [header, ...dataRows]
}
