import type { Content } from 'pdfmake/interfaces'

/**
 * Data required to render the cover page of a monthly project report.
 *
 * All fields map to a subset of {@link MonthlyReportInput} so the cover can be
 * built independently from the rest of the document.
 */
export interface CoverInput {
  /** Human readable project name displayed prominently on the cover. */
  projectName: string
  /** Optional client / mandante name shown below the project name. */
  client?: string
  /** Optional company name used to brand the cover page. */
  companyName?: string
  /**
   * Month covered by the report.
   *
   * `year` and `month` follow the ISO convention (`month` is 1-indexed).
   */
  month: {
    year: number
    /** 1 (January) through 12 (December). */
    month: number
  }
  /**
   * Date the report was generated. Defaults to the current date when omitted.
   */
  generatedAt?: Date
  /**
   * Optional locale used to format month and date labels.
   *
   * Defaults to `es-CL`.
   */
  locale?: string
}

interface FormatOptions {
  locale: string
}

function formatMonthLabel(year: number, month: number, opts: FormatOptions): string {
  // pdfmake/pdf rendering: build a label like "Mayo 2026" using Intl.
  const date = new Date(Date.UTC(year, month - 1, 1))
  const formatter = new Intl.DateTimeFormat(opts.locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const label = formatter.format(date)
  // Capitalise the first letter so months render as "Mayo 2026" rather than
  // "mayo 2026" in locales where Intl returns lowercase month names.
  return label.charAt(0).toLocaleUpperCase(opts.locale) + label.slice(1)
}

function formatGenerationDate(date: Date, opts: FormatOptions): string {
  return new Intl.DateTimeFormat(opts.locale, {
    dateStyle: 'long',
  }).format(date)
}

/**
 * Builds the cover page of a monthly project PDF report.
 *
 * Returns a `pdfmake` content array. The cover ends with a page break so the
 * next section starts on a fresh page when spread into the parent content
 * array, e.g.:
 *
 * ```ts
 * const docDefinition: TDocumentDefinitions = {
 *   content: [...buildCoverPage(input), ...otherSections],
 * }
 * ```
 */
export function buildCoverPage(input: CoverInput): Content[] {
  const opts: FormatOptions = {
    locale: input.locale ?? 'es-CL',
  }
  const monthLabel = formatMonthLabel(input.month.year, input.month.month, opts)
  const dateLabel = formatGenerationDate(input.generatedAt ?? new Date(), opts)

  const content: Content[] = [
    {
      text: 'Reporte Mensual',
      alignment: 'center',
      fontSize: 14,
      color: '#5f6368',
      margin: [0, 180, 0, 24],
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

  if (input.client) {
    content.push({
      text: input.client,
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
