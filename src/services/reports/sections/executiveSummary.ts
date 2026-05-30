import type { Alignment, Content, TableCell } from 'pdfmake/interfaces'

/**
 * Data required to render the executive summary section of a project report.
 *
 * All monetary values are expressed in the same currency (typically CLP) and
 * percentages are expressed as plain numbers (e.g. `42.5` for 42.5%).
 */
export interface ExecutiveSummaryInput {
  /** Total budgeted amount for the project. */
  totalBudget: number
  /** Total amount already invested / executed. */
  totalInvested: number
  /**
   * Variance between budget and invested amount.
   *
   * Convention: `totalBudget - totalInvested`. Positive values mean the
   * project is under budget, negative values mean it is over budget.
   */
  variance: number
  /** Project completion percentage (0-100). */
  progressPercent: number
  /** Grand total figure highlighted in the big number block. */
  projectGrandTotal: number
  /** Days worked on the project so far. */
  daysWorked: number
  /** Number of contractors currently active. */
  activeContractors: number
  /** Number of partidas (work items) currently in progress. */
  partidasInProgress: number
  /** Number of materials received during the reporting window. */
  materialsReceived: number
  /** Number of transactions registered during the current month. */
  monthlyTransactions: number
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

function formatPercent(value: number, opts: FormatOptions): string {
  return `${new Intl.NumberFormat(opts.locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

function varianceColor(variance: number): string {
  if (variance > 0) return '#0f9d58'
  if (variance < 0) return '#d93025'
  return '#202124'
}

function buildSummaryTable(input: ExecutiveSummaryInput, opts: FormatOptions): Content {
  const labelStyle = { bold: true, fillColor: '#f1f3f4', color: '#202124' }

  type CellStyle = { color?: string; bold?: boolean; alignment?: Alignment }
  const row = (label: string, value: string, valueStyle: CellStyle = {}): TableCell[] => [
    { text: label, ...labelStyle },
    { text: value, alignment: 'right', ...valueStyle },
  ]

  return {
    table: {
      widths: ['*', '*'],
      body: [
        row('Presupuesto total', formatCurrency(input.totalBudget, opts)),
        row('Invertido total', formatCurrency(input.totalInvested, opts)),
        row('Variance', formatCurrency(input.variance, opts), {
          color: varianceColor(input.variance),
          bold: true,
        }),
        row('% Avance', formatPercent(input.progressPercent, opts), {
          bold: true,
        }),
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#dadce0',
      vLineColor: () => '#dadce0',
      paddingTop: () => 6,
      paddingBottom: () => 6,
      paddingLeft: () => 8,
      paddingRight: () => 8,
    },
    margin: [0, 0, 0, 12],
  }
}

function buildBigNumberBlock(input: ExecutiveSummaryInput, opts: FormatOptions): Content {
  return {
    table: {
      widths: ['*', '*'],
      body: [
        [
          {
            stack: [
              { text: 'Total del proyecto', fontSize: 10, color: '#5f6368' },
              {
                text: formatCurrency(input.projectGrandTotal, opts),
                fontSize: 22,
                bold: true,
                color: '#1a73e8',
                margin: [0, 4, 0, 0],
              },
            ],
            fillColor: '#e8f0fe',
            margin: [4, 4, 4, 4],
          },
          {
            stack: [
              { text: 'Dias trabajados', fontSize: 10, color: '#5f6368' },
              {
                text: formatNumber(input.daysWorked, opts),
                fontSize: 22,
                bold: true,
                color: '#202124',
                margin: [0, 4, 0, 0],
              },
            ],
            fillColor: '#f1f3f4',
            margin: [4, 4, 4, 4],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 12],
  }
}

interface KpiCard {
  label: string
  value: string
  accent: string
}

function buildKpiCards(input: ExecutiveSummaryInput, opts: FormatOptions): Content {
  const cards: KpiCard[] = [
    {
      label: 'Contratistas activos',
      value: formatNumber(input.activeContractors, opts),
      accent: '#1a73e8',
    },
    {
      label: 'Partidas en marcha',
      value: formatNumber(input.partidasInProgress, opts),
      accent: '#0f9d58',
    },
    {
      label: 'Materiales recibidos',
      value: formatNumber(input.materialsReceived, opts),
      accent: '#f9ab00',
    },
    {
      label: 'Transacciones del mes',
      value: formatNumber(input.monthlyTransactions, opts),
      accent: '#a142f4',
    },
  ]

  const cells: TableCell[] = cards.map((card) => ({
    stack: [
      { text: card.label, fontSize: 9, color: '#5f6368' },
      {
        text: card.value,
        fontSize: 16,
        bold: true,
        color: card.accent,
        margin: [0, 4, 0, 0],
      },
    ],
    fillColor: '#ffffff',
    margin: [4, 6, 4, 6],
  }))

  return {
    table: {
      widths: Array<string>(cards.length).fill('*'),
      body: [cells],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#dadce0',
      vLineColor: () => '#dadce0',
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 4,
      paddingRight: () => 4,
    },
    margin: [0, 0, 0, 12],
  }
}

/**
 * Builds the executive summary section of a project PDF report.
 *
 * Returns a `pdfmake` content array ready to be embedded in the final
 * document definition. Consumers can spread the result into the parent
 * content array, e.g.:
 *
 * ```ts
 * const docDefinition: TDocumentDefinitions = {
 *   content: [...buildExecutiveSummarySection(input), ...otherSections],
 * }
 * ```
 */
export function buildExecutiveSummarySection(input: ExecutiveSummaryInput): Content[] {
  const opts: FormatOptions = {
    locale: input.locale ?? 'es-CL',
    currency: input.currency ?? 'CLP',
  }

  return [
    {
      text: 'Resumen ejecutivo',
      style: 'h1',
      fontSize: 20,
      bold: true,
      color: '#202124',
      margin: [0, 0, 0, 12],
    },
    buildSummaryTable(input, opts),
    buildBigNumberBlock(input, opts),
    buildKpiCards(input, opts),
  ]
}
