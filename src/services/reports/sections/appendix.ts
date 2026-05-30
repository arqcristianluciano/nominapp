import type { Content, TableCell } from 'pdfmake/interfaces'

/**
 * Maximum number of transactions rendered in the appendix table.
 *
 * Anything beyond this cap is summarised in a trailing note to keep PDF
 * generation responsive and the resulting file size reasonable.
 */
export const APPENDIX_MAX_ROWS = 200

/**
 * Single transaction line rendered in the appendix table.
 */
export interface AppendixTransaction {
  /** Transaction date. Accepts both `Date` instances and ISO strings. */
  date: Date | string
  /** Human readable description of the transaction. */
  description: string
  /**
   * Signed monetary amount of the transaction in the report currency.
   *
   * Negative values represent outflows.
   */
  amount: number
}

/**
 * Data required to render the appendix section of a monthly project report.
 */
export interface AppendixInput {
  /** Transactions to list. Order is preserved as supplied by the caller. */
  transactions: AppendixTransaction[]
  /**
   * Optional currency code used to format monetary values.
   *
   * Defaults to `CLP`.
   */
  currency?: string
  /**
   * Optional locale used to format dates and currencies.
   *
   * Defaults to `es-CL`.
   */
  locale?: string
}

interface FormatOptions {
  locale: string
  currency: string
}

function formatDate(value: Date | string, opts: FormatOptions): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : ''
  }
  return new Intl.DateTimeFormat(opts.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatCurrency(value: number, opts: FormatOptions): string {
  return new Intl.NumberFormat(opts.locale, {
    style: 'currency',
    currency: opts.currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function buildHeaderRow(): TableCell[] {
  const headerStyle = {
    bold: true,
    fillColor: '#34495e',
    color: '#ffffff',
  }
  return [
    { text: 'Fecha', ...headerStyle },
    { text: 'Descripción', ...headerStyle },
    { text: 'Monto', alignment: 'right', ...headerStyle },
  ]
}

function buildTransactionRow(tx: AppendixTransaction, opts: FormatOptions): TableCell[] {
  const amountColor = tx.amount < 0 ? '#c0392b' : '#202124'
  return [
    { text: formatDate(tx.date, opts) },
    { text: tx.description },
    {
      text: formatCurrency(tx.amount, opts),
      alignment: 'right',
      color: amountColor,
    },
  ]
}

/**
 * Builds the appendix section of a monthly project PDF report.
 *
 * Returns a `pdfmake` content array containing the section title, a table
 * with up to {@link APPENDIX_MAX_ROWS} transactions, and a trailing note when
 * the list was truncated. Consumers can spread the result into the parent
 * content array, e.g.:
 *
 * ```ts
 * const docDefinition: TDocumentDefinitions = {
 *   content: [...otherSections, ...buildAppendixSection(input)],
 * }
 * ```
 */
export function buildAppendixSection(input: AppendixInput): Content[] {
  const opts: FormatOptions = {
    locale: input.locale ?? 'es-CL',
    currency: input.currency ?? 'CLP',
  }

  const total = input.transactions.length
  const shown = input.transactions.slice(0, APPENDIX_MAX_ROWS)
  const hidden = Math.max(0, total - shown.length)

  const body: TableCell[][] = [buildHeaderRow()]
  for (const tx of shown) {
    body.push(buildTransactionRow(tx, opts))
  }

  const content: Content[] = [
    {
      text: 'Anexo: detalle de transacciones',
      style: 'sectionTitle',
      bold: true,
      fontSize: 14,
      margin: [0, 0, 0, 8],
      pageBreak: 'before',
    },
    {
      text: `Transacciones del mes (${total})`,
      fontSize: 10,
      color: '#5f6368',
      margin: [0, 0, 0, 8],
    },
  ]

  if (shown.length === 0) {
    content.push({
      text: 'No hay transacciones registradas para el mes.',
      italics: true,
      color: '#5f6368',
      margin: [0, 0, 0, 12],
    })
    return content
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['auto', '*', 'auto'],
      body,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 8],
  })

  if (hidden > 0) {
    content.push({
      text: `+${hidden} transactions not shown`,
      italics: true,
      color: '#5f6368',
      fontSize: 9,
      margin: [0, 0, 0, 12],
    })
  }

  return content
}
