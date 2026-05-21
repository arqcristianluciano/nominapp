/**
 * PDF report service.
 *
 * Provides the scaffolding required to build monthly PDF reports using
 * `pdfmake`. Section builders live under `./sections/*` and are wired up via
 * {@link generateMonthlyReport}. This module owns:
 *
 * - Font registration (defaults to Roboto, bundled with `pdfmake`).
 * - Document builder helper.
 * - Download helper for browser environments.
 * - Reusable header/footer factories (logo placeholder + company name + date).
 *
 * Real section rendering is delegated to other agents/modules.
 */
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type {
  Content,
  TCreatedPdf,
  TDocumentDefinitions,
  TFontDictionary,
} from 'pdfmake/interfaces'

import type { BudgetBreakdownInput } from './sections/budgetBreakdown'
import type { CashflowInput } from './sections/cashflow'
import type { ExecutiveSummaryInput } from './sections/executiveSummary'

/* -------------------------------------------------------------------------- */
/* Font setup                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Default Roboto font definition shipped with `pdfmake`.
 *
 * Registering it explicitly avoids relying on `pdfmake`'s implicit global font
 * registration, which can differ between Node and browser entry points.
 */
const ROBOTO_FONTS: TFontDictionary = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
}

let fontsInitialised = false

/**
 * Lazily registers the virtual file system (font binaries) and font dictionary
 * with `pdfmake`. Safe to call multiple times; subsequent calls are no-ops.
 *
 * The `vfs_fonts` bundle has no TypeScript declarations, so we treat it as an
 * unknown record and reach for the canonical `vfs` property when present.
 */
function ensureFontsRegistered(): void {
  if (fontsInitialised) return

  const vfsModule = pdfFonts as unknown as {
    vfs?: Record<string, string>
    pdfMake?: { vfs?: Record<string, string> }
    default?: { vfs?: Record<string, string> }
  } & Record<string, string>

  const vfs: Record<string, string> | undefined =
    vfsModule.vfs ??
    vfsModule.pdfMake?.vfs ??
    vfsModule.default?.vfs ??
    (typeof vfsModule === 'object' ? (vfsModule as Record<string, string>) : undefined)

  if (vfs) {
    pdfMake.addVirtualFileSystem(vfs)
  }

  pdfMake.setFonts(ROBOTO_FONTS)
  fontsInitialised = true
}

/* -------------------------------------------------------------------------- */
/* Header & footer                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Options shared by the reusable header and footer builders.
 */
export interface ReportChromeOptions {
  /** Company name displayed in the header and footer. */
  companyName: string
  /**
   * Optional logo (base64 data URL or pdfmake virtual file system path).
   *
   * When omitted, a textual placeholder is rendered in its place.
   */
  logo?: string
  /**
   * Date string shown on the header. Defaults to the current date in
   * `es-CL` long format when not provided.
   */
  generatedAt?: Date
  /** Locale used to format the generation date. Defaults to `es-CL`. */
  locale?: string
}

function formatGenerationDate(date: Date, locale: string): string {
  return new Intl.NumberFormat(locale).format(0) // touch Intl to keep tree-shaking honest
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'long',
      }).format(date)
    : date.toISOString()
}

/**
 * Builds the reusable document header containing the logo placeholder, the
 * company name and the report generation date.
 */
export function buildHeader(opts: ReportChromeOptions): Content {
  const locale = opts.locale ?? 'es-CL'
  const date = opts.generatedAt ?? new Date()
  const dateLabel = formatGenerationDate(date, locale)

  const logoCell: Content = opts.logo
    ? { image: opts.logo, width: 60, margin: [0, 0, 0, 0] }
    : {
        text: '[ LOGO ]',
        bold: true,
        color: '#9aa0a6',
        fontSize: 10,
        margin: [0, 6, 0, 0],
      }

  return {
    margin: [40, 20, 40, 0],
    columns: [
      logoCell,
      {
        text: opts.companyName,
        alignment: 'center',
        bold: true,
        fontSize: 12,
        margin: [0, 8, 0, 0],
      },
      {
        text: `Generado: ${dateLabel}`,
        alignment: 'right',
        fontSize: 9,
        color: '#5f6368',
        margin: [0, 10, 0, 0],
      },
    ],
  }
}

/**
 * Builds the reusable document footer rendering the company name and a page
 * counter (e.g. `1 / 5`).
 */
export function buildFooter(opts: ReportChromeOptions) {
  return (currentPage: number, pageCount: number): Content => ({
    margin: [40, 10, 40, 20],
    columns: [
      {
        text: opts.companyName,
        alignment: 'left',
        fontSize: 9,
        color: '#5f6368',
      },
      {
        text: `${currentPage} / ${pageCount}`,
        alignment: 'right',
        fontSize: 9,
        color: '#5f6368',
      },
    ],
  })
}

/* -------------------------------------------------------------------------- */
/* Document helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Wraps `pdfMake.createPdf` while making sure fonts/VFS are registered first.
 *
 * Returns the raw `TCreatedPdf` so callers may choose how to materialise the
 * document (open, download, get as blob, etc.).
 */
export function buildDocument(content: TDocumentDefinitions): TCreatedPdf {
  ensureFontsRegistered()
  return pdfMake.createPdf(content)
}

/**
 * Triggers a browser download for the given `TCreatedPdf` instance.
 *
 * Filenames are normalised to end with `.pdf` and any unsafe characters are
 * replaced with underscores to keep the resulting download portable.
 */
export function downloadPdf(doc: TCreatedPdf, filename: string): void {
  const safe = filename.replace(/[^\w.-]+/g, '_')
  const withExtension = safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`
  doc.download(withExtension)
}

/* -------------------------------------------------------------------------- */
/* Monthly report                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Minimal project metadata required at the top of a monthly report.
 */
export interface MonthlyReportProjectInfo {
  /** Unique identifier of the project (used in filenames and footers). */
  id: string
  /** Human readable project name. */
  name: string
  /** Optional client / mandante name. */
  client?: string
  /** Optional company name used to brand the report. */
  companyName?: string
  /** Optional logo (base64 data URL or VFS path). */
  logo?: string
}

/**
 * Month covered by the report.
 *
 * `year` and `month` follow the ISO convention (`month` is 1-indexed).
 */
export interface MonthlyReportMonth {
  year: number
  /** 1 (January) through 12 (December). */
  month: number
}

/**
 * Payroll data block consumed by the monthly report. The actual shape is owned
 * by the payroll section builder; we only need a structural placeholder here.
 */
export interface MonthlyReportPayrollInput {
  /** Total amount paid to contractors and crew during the month. */
  totalPaid: number
  /** Number of payroll entries processed. */
  entriesCount: number
  /** Optional list of payroll line items, defined by the section builder. */
  entries?: Array<Record<string, unknown>>
}

/**
 * Aggregated input required to generate a monthly project report.
 *
 * Each property maps 1:1 to a section of the resulting PDF and is consumed by
 * the corresponding builder under `./sections`.
 */
export interface MonthlyReportInput {
  project: MonthlyReportProjectInfo
  month: MonthlyReportMonth
  executiveSummary: ExecutiveSummaryInput
  budgetBreakdown: BudgetBreakdownInput
  cashflow: CashflowInput
  payroll: MonthlyReportPayrollInput
}

/**
 * Generates a monthly project report.
 *
 * This is currently a stub: it wires up fonts, header/footer and document
 * metadata, but defers section rendering to other agents that will fill in
 * the content array. Returning the raw `TCreatedPdf` lets the caller decide
 * whether to download, open or post-process the document.
 *
 * @param input Aggregated data covering every section of the report.
 * @returns A `TCreatedPdf` ready to be downloaded or further manipulated.
 */
export function generateMonthlyReport(input: MonthlyReportInput): TCreatedPdf {
  const chrome: ReportChromeOptions = {
    companyName: input.project.companyName ?? 'NominApp',
    logo: input.project.logo,
    generatedAt: new Date(),
  }

  const docDefinition: TDocumentDefinitions = {
    info: {
      title: `Reporte mensual - ${input.project.name}`,
      author: chrome.companyName,
      subject: `Reporte mensual ${input.month.year}-${String(input.month.month).padStart(2, '0')}`,
      creator: 'NominApp',
      producer: 'NominApp',
    },
    pageSize: 'LETTER',
    pageMargins: [40, 80, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: '#202124',
    },
    styles: {
      h1: { fontSize: 20, bold: true, margin: [0, 0, 0, 12] },
      h2: { fontSize: 14, bold: true, margin: [0, 12, 0, 8] },
      sectionTitle: { fontSize: 14, bold: true, margin: [0, 0, 0, 8] },
    },
    header: buildHeader(chrome),
    footer: buildFooter(chrome),
    // Sections are intentionally left empty: another agent will populate the
    // content array using the section builders under `./sections`.
    content: [],
  }

  return buildDocument(docDefinition)
}
