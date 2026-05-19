import { supabase } from '@/lib/supabase'
import type { PaymentDistribution } from '@/types/database'

export type SupportedBank = 'BHD' | 'POPULAR' | 'BANRESERVAS' | 'SANTA_CRUZ' | 'GENERIC'

export interface BankExportInput {
  bank: SupportedBank
  payrollPeriodId: string
}

export interface BankExportResult {
  filename: string
  mime: string
  content: string // CSV o texto plano
  rowCount: number
  totalAmount: number
}

// Plantillas básicas por banco. Los formatos reales de cada banco
// difieren (campos fijos, separadores, codificación). Esta función
// produce CSV con las columnas estándar; ajustar columnas/orden por
// banco cuando se tengan las plantillas oficiales de RD.
const BANK_HEADERS: Record<SupportedBank, string[]> = {
  GENERIC: ['cuenta', 'beneficiario', 'monto', 'concepto', 'cedula_rnc', 'tipo_pago'],
  BHD: ['No.Cuenta', 'Beneficiario', 'Monto', 'Concepto', 'Identificacion'],
  POPULAR: ['CuentaDestino', 'NombreBeneficiario', 'Monto', 'Descripcion', 'Cedula'],
  BANRESERVAS: ['Cuenta', 'Nombre', 'Monto', 'Detalle', 'Documento'],
  SANTA_CRUZ: ['CuentaBancaria', 'Beneficiario', 'Monto', 'Concepto', 'RNC'],
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function rowToCsv(values: (string | number)[]): string {
  return values.map((v) => escapeCsvField(String(v))).join(',')
}

export const bankExportService = {
  async generate(input: BankExportInput): Promise<BankExportResult> {
    const { data: distributions, error } = await supabase
      .from('payment_distributions')
      .select(
        '*, bank_account:bank_accounts(id, owner_name, bank_name, account_number, cedula_rnc)',
      )
      .eq('payroll_period_id', input.payrollPeriodId)
      .eq('status', 'pending')
    if (error) throw error

    type Row = PaymentDistribution & {
      bank_account?: {
        owner_name: string
        bank_name: string
        account_number: string
        cedula_rnc: string | null
      }
    }
    const rows = (distributions ?? []) as Row[]

    const headers = BANK_HEADERS[input.bank]
    const lines = [rowToCsv(headers)]
    let total = 0

    for (const d of rows) {
      const beneficiary = d.beneficiary ?? d.bank_account?.owner_name ?? ''
      const account = d.bank_account?.account_number ?? ''
      const ced = d.bank_account?.cedula_rnc ?? ''
      const concept = d.instructions ?? 'Pago nómina'
      const amount = Number(d.amount ?? 0)
      total += amount

      const values: (string | number)[] = []
      switch (input.bank) {
        case 'GENERIC':
          values.push(account, beneficiary, amount.toFixed(2), concept, ced, d.payment_method)
          break
        case 'BHD':
        case 'POPULAR':
        case 'BANRESERVAS':
        case 'SANTA_CRUZ':
          values.push(account, beneficiary, amount.toFixed(2), concept, ced)
          break
      }
      lines.push(rowToCsv(values))
    }

    return {
      filename: `pagos_${input.bank.toLowerCase()}_${input.payrollPeriodId.slice(0, 8)}.csv`,
      mime: 'text/csv;charset=utf-8',
      content: lines.join('\n'),
      rowCount: rows.length,
      totalAmount: total,
    }
  },

  // Helper para descargar en el browser.
  download(result: BankExportResult): void {
    const blob = new Blob([result.content], { type: result.mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}
