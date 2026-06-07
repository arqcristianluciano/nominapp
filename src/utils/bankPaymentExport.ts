import type { PaymentDistribution } from '@/types/database'
import type { ExcelRow } from '@/utils/excelExport'

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
 * Construye las filas (una por pago) para exportar la distribución de pagos de un
 * período a Excel (.xlsx), con etiquetas en español y el monto como número real
 * (no texto) para que el banco u hoja de cálculo lo trate como importe y permita
 * sumarlo. Las claves coinciden con `BANK_PAYMENT_HEADERS` para fijar el orden.
 */
export function buildBankPaymentSheet(
  distributions: PaymentDistribution[],
  resolveSourceAccount?: SourceAccountResolver,
): ExcelRow[] {
  return distributions.map((d) => ({
    Beneficiario: d.beneficiary ?? '',
    'Cédula/RNC': d.beneficiary_doc ?? '',
    Banco: d.bank_name ?? '',
    Cuenta: d.bank_account ?? '',
    Monto: d.amount,
    Método: METHOD_LABELS[d.payment_method] ?? d.payment_method,
    'No. Cheque': d.check_number ?? '',
    'Cuenta origen': (d.bank_account_id && resolveSourceAccount?.(d.bank_account_id)) || '',
    Estado: STATUS_LABELS[d.status] ?? d.status,
  }))
}
