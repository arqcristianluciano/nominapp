import type { Content, TableCell } from 'pdfmake/interfaces'

/**
 * Per-contractor row for the monthly payroll section.
 *
 * Monetary values are expressed in the same currency (typically CLP) and must
 * already be net of any conversions/rounding the caller wishes to apply.
 */
export interface PayrollSectionRow {
  /** Contractor display name. */
  contractorName: string
  /** Number of partidas (work items) settled in the period. */
  partidasCount: number
  /** Sub-total of direct labor before indirects/deductions. */
  laborSubtotal: number
  /** Materials assigned/charged to this contractor in the period. */
  materials: number
  /** Indirect costs allocated to this contractor. */
  indirects: number
  /** Deductions applied to the contractor (e.g. anticipos, retenciones). */
  deductions: number
  /**
   * Net amount payable to the contractor. The caller is expected to compute
   * this value; the section will not derive it from the other fields so that
   * any custom adjustments made upstream are preserved exactly as supplied.
   */
  net: number
}

/**
 * Input payload for {@link buildPayrollSection}.
 */
export interface PayrollSectionInput {
  /** One row per contractor included in the monthly payroll. */
  rows: PayrollSectionRow[]
  /**
   * Optional currency code used to format monetary values.
   *
   * Defaults to `CLP`.
   */
  currency?: string
  /**
   * Optional locale used to format numbers and currencies.
   *
   * Defaults to `es-CL`.
   */
  locale?: string
}

interface FormatOptions {
  locale: string
  currency: string
}

function formatCurrency(value: number, opts: FormatOptions): string {
  return new Intl.NumberFormat(opts.locale, {
    style: 'currency',
    currency: opts.currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number, opts: FormatOptions): string {
  return new Intl.NumberFormat(opts.locale, {
    maximumFractionDigits: 0,
  }).format(value)
}

interface PayrollTotals {
  partidasCount: number
  laborSubtotal: number
  materials: number
  indirects: number
  deductions: number
  net: number
}

function computeTotals(rows: PayrollSectionRow[]): PayrollTotals {
  return rows.reduce<PayrollTotals>(
    (acc, row) => {
      acc.partidasCount += row.partidasCount
      acc.laborSubtotal += row.laborSubtotal
      acc.materials += row.materials
      acc.indirects += row.indirects
      acc.deductions += row.deductions
      acc.net += row.net
      return acc
    },
    {
      partidasCount: 0,
      laborSubtotal: 0,
      materials: 0,
      indirects: 0,
      deductions: 0,
      net: 0,
    },
  )
}

function headerCell(text: string, alignment: 'left' | 'right' = 'left'): TableCell {
  return {
    text,
    bold: true,
    alignment,
    fillColor: '#34495e',
    color: '#ffffff',
  }
}

function buildHeaderRow(): TableCell[] {
  return [
    headerCell('Contratista'),
    headerCell('Partidas', 'right'),
    headerCell('Subtotal labor', 'right'),
    headerCell('Materiales', 'right'),
    headerCell('Indirectos', 'right'),
    headerCell('Deducciones', 'right'),
    headerCell('Neto', 'right'),
  ]
}

function buildDataRow(row: PayrollSectionRow, opts: FormatOptions): TableCell[] {
  return [
    { text: row.contractorName },
    { text: formatNumber(row.partidasCount, opts), alignment: 'right' },
    { text: formatCurrency(row.laborSubtotal, opts), alignment: 'right' },
    { text: formatCurrency(row.materials, opts), alignment: 'right' },
    { text: formatCurrency(row.indirects, opts), alignment: 'right' },
    { text: formatCurrency(row.deductions, opts), alignment: 'right' },
    { text: formatCurrency(row.net, opts), alignment: 'right', bold: true },
  ]
}

function buildTotalsRow(totals: PayrollTotals, opts: FormatOptions): TableCell[] {
  const fillColor = '#ecf0f1'
  return [
    { text: 'TOTAL', bold: true, fillColor },
    {
      text: formatNumber(totals.partidasCount, opts),
      bold: true,
      alignment: 'right',
      fillColor,
    },
    {
      text: formatCurrency(totals.laborSubtotal, opts),
      bold: true,
      alignment: 'right',
      fillColor,
    },
    {
      text: formatCurrency(totals.materials, opts),
      bold: true,
      alignment: 'right',
      fillColor,
    },
    {
      text: formatCurrency(totals.indirects, opts),
      bold: true,
      alignment: 'right',
      fillColor,
    },
    {
      text: formatCurrency(totals.deductions, opts),
      bold: true,
      alignment: 'right',
      fillColor,
    },
    {
      text: formatCurrency(totals.net, opts),
      bold: true,
      alignment: 'right',
      fillColor,
      color: '#1a73e8',
    },
  ]
}

/**
 * Builds the monthly payroll section of a project PDF report.
 *
 * Returns a `pdfmake` content node ready to be embedded in the final document
 * definition. The section contains:
 *  - A section title ("Resumen de nomina del mes").
 *  - A table with one row per contractor and a totals row at the bottom.
 *
 * Empty input (no rows) still renders the title and an empty table with the
 * totals row showing zeroes, so the section is safe to embed unconditionally.
 */
export function buildPayrollSection(input: PayrollSectionInput): Content {
  const opts: FormatOptions = {
    locale: input.locale ?? 'es-CL',
    currency: input.currency ?? 'CLP',
  }

  const body: TableCell[][] = [buildHeaderRow()]
  for (const row of input.rows) {
    body.push(buildDataRow(row, opts))
  }
  body.push(buildTotalsRow(computeTotals(input.rows), opts))

  return {
    stack: [
      {
        text: 'Resumen de nomina del mes',
        style: 'sectionTitle',
        bold: true,
        fontSize: 14,
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body,
        },
        layout: 'lightHorizontalLines',
      },
    ],
    margin: [0, 0, 0, 12],
  }
}
