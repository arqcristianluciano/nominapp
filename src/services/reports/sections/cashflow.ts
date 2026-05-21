import type { Content, TableCell } from 'pdfmake/interfaces'

export interface CashflowInput {
  collections: { expected: number; actual: number }
  contractorPayments: { expected: number; actual: number }
  supplierPayments: { expected: number; actual: number }
  releasedPurchaseOrders: { expected: number; actual: number }
  indirects: { expected: number; actual: number }
}

interface CashflowRow {
  concept: string
  expected: number
  actual: number
  isTotal?: boolean
}

function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function diffColor(diff: number): string | undefined {
  if (diff > 0) return '#27ae60'
  if (diff < 0) return '#c0392b'
  return undefined
}

function buildBodyRow(row: CashflowRow): TableCell[] {
  const diff = row.actual - row.expected
  const color = row.isTotal ? diffColor(diff) : undefined
  const fillColor = row.isTotal ? '#ecf0f1' : undefined
  const bold = row.isTotal
  return [
    { text: row.concept, bold, fillColor, color },
    {
      text: formatCurrency(row.expected),
      alignment: 'right',
      bold,
      fillColor,
      color,
    },
    {
      text: formatCurrency(row.actual),
      alignment: 'right',
      bold,
      fillColor,
      color,
    },
    {
      text: formatCurrency(diff),
      alignment: 'right',
      bold,
      fillColor,
      color,
    },
  ]
}

const BAR_WIDTH = 24

function buildBar(value: number, maxAbs: number): string {
  if (maxAbs <= 0) return ''
  const ratio = Math.min(1, Math.abs(value) / maxAbs)
  const blocks = Math.round(ratio * BAR_WIDTH)
  return '█'.repeat(blocks)
}

function buildChartRow(
  concept: string,
  expected: number,
  actual: number,
  maxAbs: number,
): TableCell[] {
  return [
    { text: concept },
    {
      text: buildBar(expected, maxAbs),
      color: '#3498db',
      noWrap: true,
    },
    { text: formatCurrency(expected), alignment: 'right' },
    {
      text: buildBar(actual, maxAbs),
      color: '#2ecc71',
      noWrap: true,
    },
    { text: formatCurrency(actual), alignment: 'right' },
  ]
}

export function buildCashflowSection(input: CashflowInput): Content {
  const collectionsRow: CashflowRow = {
    concept: 'Cobranzas',
    expected: input.collections.expected,
    actual: input.collections.actual,
  }
  const contractorRow: CashflowRow = {
    concept: 'Pagos a contratistas',
    expected: input.contractorPayments.expected,
    actual: input.contractorPayments.actual,
  }
  const supplierRow: CashflowRow = {
    concept: 'Pagos a suplidores',
    expected: input.supplierPayments.expected,
    actual: input.supplierPayments.actual,
  }
  const purchaseOrderRow: CashflowRow = {
    concept: 'OC liberadas',
    expected: input.releasedPurchaseOrders.expected,
    actual: input.releasedPurchaseOrders.actual,
  }
  const indirectsRow: CashflowRow = {
    concept: 'Indirectos',
    expected: input.indirects.expected,
    actual: input.indirects.actual,
  }

  const outflows = [contractorRow, supplierRow, purchaseOrderRow, indirectsRow]
  const totalOutflowExpected = outflows.reduce((acc, r) => acc + r.expected, 0)
  const totalOutflowActual = outflows.reduce((acc, r) => acc + r.actual, 0)

  const netRow: CashflowRow = {
    concept: 'NETO',
    expected: collectionsRow.expected - totalOutflowExpected,
    actual: collectionsRow.actual - totalOutflowActual,
    isTotal: true,
  }

  const dataRows: CashflowRow[] = [
    collectionsRow,
    contractorRow,
    supplierRow,
    purchaseOrderRow,
    indirectsRow,
    netRow,
  ]

  const headerRow: TableCell[] = [
    { text: 'Concepto', bold: true, fillColor: '#34495e', color: '#ffffff' },
    {
      text: 'Esperado',
      bold: true,
      alignment: 'right',
      fillColor: '#34495e',
      color: '#ffffff',
    },
    {
      text: 'Real',
      bold: true,
      alignment: 'right',
      fillColor: '#34495e',
      color: '#ffffff',
    },
    {
      text: 'Diferencia',
      bold: true,
      alignment: 'right',
      fillColor: '#34495e',
      color: '#ffffff',
    },
  ]

  const body: TableCell[][] = [headerRow, ...dataRows.map(buildBodyRow)]

  const chartRows: CashflowRow[] = [
    collectionsRow,
    contractorRow,
    supplierRow,
    purchaseOrderRow,
    indirectsRow,
  ]
  const maxAbs = chartRows.reduce(
    (acc, r) => Math.max(acc, Math.abs(r.expected), Math.abs(r.actual)),
    0,
  )

  const chartHeader: TableCell[] = [
    { text: 'Concepto', bold: true, fillColor: '#ecf0f1' },
    { text: 'Esperado', bold: true, fillColor: '#ecf0f1' },
    {
      text: 'Monto',
      bold: true,
      alignment: 'right',
      fillColor: '#ecf0f1',
    },
    { text: 'Real', bold: true, fillColor: '#ecf0f1' },
    {
      text: 'Monto',
      bold: true,
      alignment: 'right',
      fillColor: '#ecf0f1',
    },
  ]

  const chartBody: TableCell[][] = [
    chartHeader,
    ...chartRows.map((r) => buildChartRow(r.concept, r.expected, r.actual, maxAbs)),
  ]

  return {
    stack: [
      {
        text: 'Flujo de caja mensual',
        style: 'sectionTitle',
        bold: true,
        fontSize: 14,
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body,
        },
        layout: 'lightHorizontalLines',
      },
      {
        text: 'Comparativo grafico (esperado vs real)',
        bold: true,
        fontSize: 11,
        margin: [0, 12, 0, 6],
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', '*', 'auto'],
          body: chartBody,
        },
        layout: 'noBorders',
      },
    ],
    margin: [0, 0, 0, 12],
  }
}
