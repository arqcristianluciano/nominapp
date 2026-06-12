// PDFs del módulo de préstamos: recibo de pago de cuota y estado de cuenta.
// Reusa el cargador perezoso de pdfmake del servicio de reportes para no
// inflar el bundle inicial.

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { buildDocument, downloadPdf } from '@/services/reports/pdfReportService'
import { calcInterestEarned, calcLoanProgress, isInstallmentOverdue } from '@/services/loanService'
import { formatRD } from '@/utils/currency'
import { round2 } from '@/utils/money'
import type { BankAccount, ContractorLoan, LoanInstallment } from '@/types/database'

const FRECUENCIA_LABEL: Record<string, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Tabla simple de dos columnas etiqueta/valor. */
function detailTable(rows: Array<[string, string]>): Content {
  return {
    table: {
      widths: ['auto', '*'],
      body: rows.map(([label, value]) => [
        {
          text: label,
          bold: true,
          fontSize: 9,
          color: '#555555',
          margin: [0, 2, 12, 2] as [number, number, number, number],
        },
        { text: value, fontSize: 9, margin: [0, 2, 0, 2] as [number, number, number, number] },
      ]),
    },
    layout: 'noBorders',
    margin: [0, 4, 0, 12] as [number, number, number, number],
  }
}

function title(text: string): Content {
  return { text, fontSize: 15, bold: true, margin: [0, 0, 0, 2] as [number, number, number, number] }
}

function subtitle(text: string): Content {
  return { text, fontSize: 9, color: '#777777', margin: [0, 0, 0, 14] as [number, number, number, number] }
}

export interface InstallmentReceiptInput {
  loan: ContractorLoan
  installment: LoanInstallment
  /** Todas las cuotas del préstamo (para calcular pagado/saldo tras esta cuota). */
  installments: LoanInstallment[]
  /** Total pagado vía deducciones de nómina. */
  paidFromDeductions: number
  /** Cuentas para resolver el nombre de la cuenta de cobro. */
  bankAccounts?: BankAccount[]
}

/** Genera y descarga el recibo en PDF de una cuota pagada. */
export function downloadInstallmentReceipt(input: InstallmentReceiptInput): void {
  const { loan, installment, installments, paidFromDeductions, bankAccounts = [] } = input
  const contractorName = loan.contractor?.name ?? 'Contratista'
  const { totalOwed, effectivePaid, balance } = calcLoanProgress(loan, paidFromDeductions, installments)
  const cuenta = installment.cuenta_cobro_id
    ? bankAccounts.find((a) => a.id === installment.cuenta_cobro_id)
    : undefined

  const rows: Array<[string, string]> = [
    ['Contratista', contractorName],
    ['Cuota', `#${installment.numero_cuota} de ${loan.installments}`],
    ['Monto pagado', formatRD(installment.monto)],
    ['Fecha programada', formatDate(installment.fecha_pago_programada)],
    ['Fecha de pago', installment.fecha_pago_real ? formatDate(installment.fecha_pago_real) : '—'],
  ]
  if (cuenta) rows.push(['Cobrado en cuenta', `${cuenta.owner_name} — ${cuenta.bank_name}`])
  rows.push(
    [
      'Préstamo',
      `${formatRD(loan.principal)} al ${loan.interest_rate}% (${FRECUENCIA_LABEL[loan.frecuencia ?? ''] ?? loan.frecuencia ?? '—'})`,
    ],
    ['Total a pagar', formatRD(totalOwed)],
    ['Pagado a la fecha', formatRD(effectivePaid)],
    ['Saldo restante', formatRD(balance)],
  )

  const doc: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: [48, 48, 48, 56],
    content: [
      title('Recibo de pago de cuota'),
      subtitle(`Emitido el ${formatDate(todayStr())}`),
      detailTable(rows),
      {
        text: 'Este recibo deja constancia del pago de la cuota indicada. Conserve este documento.',
        fontSize: 8,
        color: '#999999',
        margin: [0, 16, 0, 0],
      },
    ],
    footer: { text: 'Generado por NominApp', alignment: 'center', fontSize: 8, color: '#aaaaaa' },
  }

  downloadPdf(buildDocument(doc), `recibo-cuota-${installment.numero_cuota}-${contractorName.replace(/\s+/g, '-')}`)
}

export interface LoanStatementInput {
  loan: ContractorLoan
  installments: LoanInstallment[]
  paidFromDeductions: number
}

/** Genera y descarga el estado de cuenta en PDF de un préstamo. */
export function downloadLoanStatement(input: LoanStatementInput): void {
  const { loan, installments, paidFromDeductions } = input
  const contractorName = loan.contractor?.name ?? 'Contratista'
  const { totalOwed, effectivePaid, balance } = calcLoanProgress(loan, paidFromDeductions, installments)
  const totalInterest = Math.max(0, round2(totalOwed - loan.principal))
  const interesGanado = calcInterestEarned(loan, effectivePaid)
  const statusLabel: Record<string, string> = { active: 'Activo', paid: 'Pagado', cancelled: 'Cancelado' }

  const scheduleBody: Content[][] = [
    ['Cuota', 'Fecha programada', 'Fecha de pago', 'Monto', 'Estado'].map((h) => ({
      text: h,
      bold: true,
      fontSize: 8,
      fillColor: '#f0f0f0',
    })),
    ...installments.map((inst) => {
      const overdue = loan.status === 'active' && isInstallmentOverdue(inst)
      const estado = inst.estado === 'pagada' ? 'Pagada' : overdue ? 'Vencida' : 'Pendiente'
      const color = inst.estado === 'pagada' ? '#059669' : overdue ? '#dc2626' : '#555555'
      return [
        { text: `#${inst.numero_cuota}`, fontSize: 8 },
        { text: formatDate(inst.fecha_pago_programada), fontSize: 8 },
        { text: inst.fecha_pago_real ? formatDate(inst.fecha_pago_real) : '—', fontSize: 8 },
        { text: formatRD(inst.monto), fontSize: 8, alignment: 'right' as const },
        { text: estado, fontSize: 8, color, bold: estado !== 'Pendiente' },
      ]
    }),
  ]

  const content: Content[] = [
    title('Estado de cuenta — Préstamo'),
    subtitle(`${contractorName} · Emitido el ${formatDate(todayStr())}`),
    detailTable([
      ['Contratista', contractorName],
      ['Estado', statusLabel[loan.status] ?? loan.status],
      ['Capital prestado', formatRD(loan.principal)],
      ['Tasa de interés', `${loan.interest_rate}%`],
      ['Interés total', formatRD(totalInterest)],
      [
        'Total a pagar',
        `${formatRD(totalOwed)} en ${loan.installments} cuotas de ${formatRD(loan.installment_amount)}`,
      ],
      ['Frecuencia', FRECUENCIA_LABEL[loan.frecuencia ?? ''] ?? loan.frecuencia ?? '—'],
      ['Desembolsado', formatDate(loan.disbursed_date)],
      ['Pagado a la fecha', formatRD(effectivePaid)],
      ['Saldo pendiente', formatRD(balance)],
      ['Intereses ganados a la fecha', formatRD(interesGanado)],
    ]),
  ]

  if (installments.length > 0) {
    content.push(
      { text: 'Cronograma de cuotas', fontSize: 11, bold: true, margin: [0, 4, 0, 6] },
      {
        table: { widths: ['auto', '*', '*', 'auto', 'auto'], body: scheduleBody },
        layout: 'lightHorizontalLines',
      },
    )
  }

  const doc: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: [48, 48, 48, 56],
    content,
    footer: { text: 'Generado por NominApp', alignment: 'center', fontSize: 8, color: '#aaaaaa' },
  }

  downloadPdf(buildDocument(doc), `estado-de-cuenta-${contractorName.replace(/\s+/g, '-')}`)
}
