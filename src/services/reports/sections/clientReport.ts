/**
 * Client-facing report section builders.
 *
 * This module assembles the content blocks for a "Reporte para Cliente":
 * a polished, high-level PDF suitable for sharing with clients or investors.
 *
 * WHAT IS INCLUDED:
 *  - Cover page with project name, client name and generation date.
 *  - Financial summary: total budget vs executed, % spent — no unit costs.
 *  - Construction progress: overall % from the schedule.
 *  - Schedule milestones (is_milestone === true tasks only).
 *  - Optional recent site photos (up to MAX_CLIENT_PHOTOS).
 *
 * WHAT IS DELIBERATELY EXCLUDED (sensitive / internal data):
 *  - Unit costs, prices per item, supplier rates.
 *  - Contractor names and individual payroll amounts.
 *  - Bank account details of any party.
 *  - Deposit category breakdown.
 *  - Internal variance analysis at item/partida level.
 *  - Indirect cost percentages (DT, admin, transport).
 */

import type { Content, TableCell } from 'pdfmake/interfaces'

/* -------------------------------------------------------------------------- */
/* Public input types                                                         */
/* -------------------------------------------------------------------------- */

export interface ClientReportMilestone {
  /** Task / milestone name as stored in schedule_tasks. */
  name: string
  /** Planned end date (ISO string YYYY-MM-DD). */
  endDate: string
  /** Progress 0-100. */
  progress: number
  /** Whether the milestone is already completed. */
  completed: boolean
  /** Whether the milestone is overdue (past its planned date but not finished). */
  overdue?: boolean
}

export interface ClientReportFinancialSummary {
  /** Total budgeted amount (sum of all budget categories). */
  totalBudget: number
  /** Total amount invested / executed to date. */
  totalInvested: number
  /** Percentage of budget consumed (0-100). */
  percentSpent: number
}

export interface ClientReportInput {
  /** Human readable project name. */
  projectName: string
  /** Client / mandante name (optional). */
  clientName?: string
  /** Reporting company name (optional). */
  companyName?: string
  /** Report generation date. */
  generatedAt: Date
  /** Construction progress percentage (0-100), derived from the schedule. */
  overallProgress: number
  /** High-level financial summary. */
  financial: ClientReportFinancialSummary
  /** Milestones to show in the schedule summary (only is_milestone tasks). */
  milestones: ClientReportMilestone[]
  /**
   * Optional photos to include (base64 data URLs or pdfmake VFS paths).
   * Only the first MAX_CLIENT_PHOTOS are rendered.
   */
  photos?: string[]
  /** Optional locale (defaults to es-CL). */
  locale?: string
  /** Optional currency (defaults to CLP). */
  currency?: string
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/** Maximum number of site photos included in the client report. */
export const MAX_CLIENT_PHOTOS = 6

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                         */
/* -------------------------------------------------------------------------- */

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

function formatPercent(value: number, opts: FormatOptions): string {
  return `${new Intl.NumberFormat(opts.locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

function formatDate(isoDate: string, opts: FormatOptions): string {
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return new Intl.DateTimeFormat(opts.locale, { dateStyle: 'medium' }).format(d)
}

function formatGenerationDate(date: Date, opts: FormatOptions): string {
  return new Intl.DateTimeFormat(opts.locale, { dateStyle: 'long' }).format(date)
}

function formatMonthLabel(date: Date, opts: FormatOptions): string {
  const label = new Intl.DateTimeFormat(opts.locale, { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toLocaleUpperCase(opts.locale) + label.slice(1)
}

/* -------------------------------------------------------------------------- */
/* Section: Cover page                                                        */
/* -------------------------------------------------------------------------- */

function buildClientCoverPage(input: ClientReportInput, opts: FormatOptions): Content[] {
  const monthLabel = formatMonthLabel(input.generatedAt, opts)
  const dateLabel = formatGenerationDate(input.generatedAt, opts)

  const content: Content[] = [
    {
      text: 'Reporte de Avance',
      alignment: 'center',
      fontSize: 13,
      color: '#5f6368',
      margin: [0, 160, 0, 24],
    },
    {
      text: input.projectName,
      alignment: 'center',
      fontSize: 28,
      bold: true,
      color: '#1a73e8',
      margin: [0, 0, 0, 16],
    },
  ]

  if (input.clientName) {
    content.push({
      text: input.clientName,
      alignment: 'center',
      fontSize: 14,
      color: '#202124',
      margin: [0, 0, 0, 8],
    })
  }

  if (input.companyName) {
    content.push({
      text: input.companyName,
      alignment: 'center',
      fontSize: 12,
      color: '#5f6368',
      margin: [0, 0, 0, 36],
    })
  }

  content.push({
    text: monthLabel,
    alignment: 'center',
    fontSize: 22,
    bold: true,
    color: '#202124',
    margin: [0, 0, 0, 16],
  })

  content.push({
    text: `Generado: ${dateLabel}`,
    alignment: 'center',
    fontSize: 10,
    color: '#5f6368',
    margin: [0, 0, 0, 0],
    pageBreak: 'after',
  })

  return content
}

/* -------------------------------------------------------------------------- */
/* Section: Progress overview                                                 */
/* -------------------------------------------------------------------------- */

function buildProgressBar(percent: number): Content {
  // Simulated progress bar using two side-by-side cells.
  const pct = Math.min(100, Math.max(0, percent))
  const filled = Math.round(pct) // text-based bar
  const barFilled = '█'.repeat(Math.round((pct / 100) * 40))
  const barEmpty = '░'.repeat(40 - Math.round((pct / 100) * 40))

  return {
    stack: [
      {
        columns: [
          {
            text: `${barFilled}${barEmpty}`,
            fontSize: 8,
            color: '#1a73e8',
            width: '*',
          },
          {
            text: `${filled}%`,
            fontSize: 14,
            bold: true,
            color: '#1a73e8',
            alignment: 'right',
            width: 'auto',
          },
        ],
      },
    ],
    margin: [0, 4, 0, 4],
  }
}

function buildProgressSection(input: ClientReportInput, opts: FormatOptions): Content[] {
  const pct = Math.min(100, Math.max(0, input.overallProgress))
  const statusLabel = pct >= 100 ? 'Completado' : pct >= 50 ? 'En avance' : 'En inicio'
  const statusColor = pct >= 100 ? '#0f9d58' : pct >= 50 ? '#1a73e8' : '#f9ab00'

  return [
    {
      text: 'Avance de Obra',
      style: 'h2',
      fontSize: 16,
      bold: true,
      color: '#202124',
      margin: [0, 0, 0, 10],
    },
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            {
              stack: [
                {
                  text: 'Progreso general del proyecto',
                  fontSize: 10,
                  color: '#5f6368',
                  margin: [0, 0, 0, 4],
                },
                buildProgressBar(pct),
              ],
              fillColor: '#f8f9fa',
              margin: [8, 8, 8, 8],
            },
            {
              stack: [
                { text: 'Estado', fontSize: 10, color: '#5f6368' },
                {
                  text: statusLabel,
                  fontSize: 14,
                  bold: true,
                  color: statusColor,
                  margin: [0, 4, 0, 0],
                },
              ],
              fillColor: '#f8f9fa',
              margin: [8, 8, 8, 8],
              alignment: 'center',
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#dadce0',
        vLineColor: () => '#dadce0',
      },
      margin: [0, 0, 0, 14],
    },
    ...(formatPercent(pct, opts) ? [] : []),
  ]
}

/* -------------------------------------------------------------------------- */
/* Section: Financial summary (high-level, no unit costs)                    */
/* -------------------------------------------------------------------------- */

function buildFinancialSection(input: ClientReportInput, opts: FormatOptions): Content[] {
  const { totalBudget, totalInvested, percentSpent } = input.financial
  const remaining = totalBudget - totalInvested
  const remainingPct = 100 - percentSpent

  const labelStyle = { bold: true, fillColor: '#f1f3f4', color: '#202124' }

  type RowCell = TableCell
  const row = (label: string, value: string, valueColor?: string): RowCell[] => [
    { text: label, ...labelStyle },
    {
      text: value,
      alignment: 'right' as const,
      color: valueColor ?? '#202124',
      bold: Boolean(valueColor),
    },
  ]

  return [
    {
      text: 'Resumen Financiero',
      style: 'h2',
      fontSize: 16,
      bold: true,
      color: '#202124',
      margin: [0, 0, 0, 10],
    },
    {
      text: 'Los montos reflejan el avance financiero consolidado del proyecto.',
      fontSize: 9,
      color: '#5f6368',
      italics: true,
      margin: [0, 0, 0, 8],
    },
    {
      table: {
        widths: ['*', '*'],
        body: [
          row('Presupuesto total', formatCurrency(totalBudget, opts)),
          row('Ejecutado a la fecha', formatCurrency(totalInvested, opts), '#1a73e8'),
          row('Saldo disponible', formatCurrency(remaining, opts), remaining >= 0 ? '#0f9d58' : '#d93025'),
          row('% Ejecutado', formatPercent(percentSpent, opts), '#1a73e8'),
          row('% Disponible', formatPercent(Math.max(0, remainingPct), opts)),
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
      margin: [0, 0, 0, 14],
    },
  ]
}

/* -------------------------------------------------------------------------- */
/* Section: Schedule milestones                                               */
/* -------------------------------------------------------------------------- */

function milestoneBadge(completed: boolean, progress: number, overdue = false): string {
  if (completed || progress >= 100) return '✓ Completado'
  if (overdue) return `Atrasado (${Math.round(progress)}%)`
  if (progress > 0) return `En curso (${Math.round(progress)}%)`
  return 'Pendiente'
}

function milestoneBadgeColor(completed: boolean, progress: number, overdue = false): string {
  if (completed || progress >= 100) return '#0f9d58'
  if (overdue) return '#d93025'
  if (progress > 0) return '#1a73e8'
  return '#9aa0a6'
}

function buildMilestonesSection(input: ClientReportInput, opts: FormatOptions): Content[] {
  if (input.milestones.length === 0) {
    return []
  }

  const headerRow: TableCell[] = [
    { text: 'Hito', bold: true, fillColor: '#34495e', color: '#ffffff' },
    { text: 'Fecha planificada', bold: true, fillColor: '#34495e', color: '#ffffff', alignment: 'center' },
    { text: 'Estado', bold: true, fillColor: '#34495e', color: '#ffffff', alignment: 'center' },
  ]

  const body: TableCell[][] = [headerRow]

  for (const m of input.milestones) {
    const badge = milestoneBadge(m.completed, m.progress, m.overdue)
    const color = milestoneBadgeColor(m.completed, m.progress, m.overdue)
    body.push([
      { text: m.name },
      { text: formatDate(m.endDate, opts), alignment: 'center' },
      { text: badge, alignment: 'center', color, bold: m.completed || m.progress >= 100 },
    ])
  }

  return [
    {
      text: 'Hitos del Cronograma',
      style: 'h2',
      fontSize: 16,
      bold: true,
      color: '#202124',
      margin: [0, 0, 0, 10],
    },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto'],
        body,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 14],
    },
  ]
}

/* -------------------------------------------------------------------------- */
/* Section: Site photos                                                       */
/* -------------------------------------------------------------------------- */

function buildPhotosSection(photos: string[]): Content[] {
  const limited = photos.slice(0, MAX_CLIENT_PHOTOS)
  if (limited.length === 0) return []

  // Lay out photos two per row.
  const rows: Content[] = []
  for (let i = 0; i < limited.length; i += 2) {
    const left = limited[i]
    const right = limited[i + 1]
    const cols: Content[] = [
      {
        image: left,
        width: 220,
        margin: [0, 0, 8, 8],
      },
    ]
    if (right) {
      cols.push({
        image: right,
        width: 220,
        margin: [0, 0, 0, 8],
      })
    }
    rows.push({
      columns: cols,
      columnGap: 10,
    })
  }

  return [
    {
      text: 'Fotografías del Sitio',
      style: 'h2',
      fontSize: 16,
      bold: true,
      color: '#202124',
      margin: [0, 0, 0, 10],
      pageBreak: 'before',
    },
    {
      text: 'Imágenes recientes de la bitácora de obra.',
      fontSize: 9,
      color: '#5f6368',
      italics: true,
      margin: [0, 0, 0, 10],
    },
    ...rows,
  ]
}

/* -------------------------------------------------------------------------- */
/* Public builder                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Builds the full content array for a client-facing project report.
 *
 * Returns a flat `pdfmake` content array ready to be spread into a
 * `TDocumentDefinitions.content` array, e.g.:
 *
 * ```ts
 * const docDefinition: TDocumentDefinitions = {
 *   content: [...buildClientReportContent(input)],
 * }
 * ```
 */
export function buildClientReportContent(input: ClientReportInput): Content[] {
  const opts: FormatOptions = {
    locale: input.locale ?? 'es-CL',
    currency: input.currency ?? 'CLP',
  }

  const photos = input.photos ?? []

  return [
    ...buildClientCoverPage(input, opts),
    ...buildProgressSection(input, opts),
    ...buildFinancialSection(input, opts),
    ...buildMilestonesSection(input, opts),
    ...buildPhotosSection(photos),
  ]
}
