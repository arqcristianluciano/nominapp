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
import type { Content, TCreatedPdf, TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces'

import { buildAppendixSection } from './sections/appendix'
import type { AppendixInput, AppendixTransaction } from './sections/appendix'
import { buildBudgetBreakdownSection } from './sections/budgetBreakdown'
import type { BudgetBreakdownInput } from './sections/budgetBreakdown'
import { buildCashflowSection } from './sections/cashflow'
import type { CashflowInput } from './sections/cashflow'
import { buildClientReportContent } from './sections/clientReport'
import type { ClientReportInput } from './sections/clientReport'
import { buildCoverPage } from './sections/cover'
import type { CoverInput } from './sections/cover'
import { buildExecutiveSummarySection } from './sections/executiveSummary'
import type { ExecutiveSummaryInput } from './sections/executiveSummary'
import { buildPayrollSection } from './sections/payroll'
import type { PayrollSectionInput, PayrollSectionRow } from './sections/payroll'
import { buildPageFooter } from './sections/footer'

/* -------------------------------------------------------------------------- */
/* Dynamic pdfmake loader                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Shape of the dynamically imported `pdfmake` module surface we rely on.
 *
 * Keeping it minimal avoids re-stating the full upstream types while still
 * giving consumers type-safety for the calls we make below.
 */
type PdfMakeModule = {
  createPdf: (doc: TDocumentDefinitions) => TCreatedPdf
  addVirtualFileSystem: (vfs: Record<string, string>) => void
  setFonts: (fonts: TFontDictionary) => void
}

let pdfMakePromise: Promise<PdfMakeModule> | null = null

/**
 * Lazily loads `pdfmake` (and its VFS fonts bundle) on first use, then caches
 * the resolved module so subsequent calls reuse the same instance.
 *
 * This keeps the (~1.5MB) `pdfmake` payload out of the Reportes route chunk
 * and only fetches it when the user actually generates a PDF.
 */
async function loadPdfMake(): Promise<PdfMakeModule> {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      const [pdfMakeModule, pdfFontsModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
      ])

      const pdfMake =
        (pdfMakeModule as unknown as { default?: PdfMakeModule } & PdfMakeModule).default ??
        (pdfMakeModule as unknown as PdfMakeModule)

      ensureFontsRegistered(pdfMake, pdfFontsModule)
      return pdfMake
    })()
  }
  return pdfMakePromise
}

/**
 * Wraps the eventually-resolved `TCreatedPdf` returned by `pdfMake.createPdf`
 * so that the public API of {@link generateMonthlyReport} / {@link buildDocument}
 * can stay synchronous while the underlying `pdfmake` module loads on demand.
 *
 * Every method on `TCreatedPdf` already returns a `Promise`, so the proxy just
 * defers each call until the real document is available.
 */
function createLazyPdfDoc(docPromise: Promise<TCreatedPdf>): TCreatedPdf {
  return {
    getStream: () => docPromise.then((doc) => doc.getStream()),
    getBuffer: () => docPromise.then((doc) => doc.getBuffer()),
    getBase64: () => docPromise.then((doc) => doc.getBase64()),
    getDataUrl: () => docPromise.then((doc) => doc.getDataUrl()),
    write: (fileName: string) => docPromise.then((doc) => doc.write(fileName)),
    getBlob: () => docPromise.then((doc) => doc.getBlob()),
    download: (fileName?: string) => docPromise.then((doc) => doc.download(fileName)),
    open: (win?: Window | null) => docPromise.then((doc) => doc.open(win)),
    print: (win?: Window | null) => docPromise.then((doc) => doc.print(win)),
  }
}

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
function ensureFontsRegistered(pdfMake: PdfMakeModule, pdfFonts: unknown): void {
  if (fontsInitialised) return

  const vfsModule = pdfFonts as {
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
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)
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
 * Returns a synchronous `TCreatedPdf` whose async methods (download, getBlob,
 * etc.) transparently await the dynamically-loaded `pdfmake` module on first
 * invocation. Subsequent calls reuse the cached module, so they incur no extra
 * download cost.
 */
export function buildDocument(content: TDocumentDefinitions): TCreatedPdf {
  const docPromise = loadPdfMake().then((pdfMake) => pdfMake.createPdf(content))
  return createLazyPdfDoc(docPromise)
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
  /**
   * Optional raw transactions for the month, rendered in the appendix section.
   *
   * Each entry only needs a date, description and signed amount; the appendix
   * builder formats and truncates the list as needed. When omitted, the
   * appendix degrades gracefully to an empty table.
   */
  transactions?: AppendixTransaction[]
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
  const generatedAt = new Date()

  const chrome: ReportChromeOptions = {
    companyName: input.project.companyName ?? 'NominApp',
    logo: input.project.logo,
    generatedAt,
  }

  const coverInput: CoverInput = {
    projectName: input.project.name,
    client: input.project.client,
    companyName: input.project.companyName,
    month: { year: input.month.year, month: input.month.month },
    generatedAt,
  }

  const appendixInput: AppendixInput = {
    transactions: (input.transactions ?? []).map((tx) => ({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
    })),
  }

  // Moneda dominicana para todo el reporte.
  const CURRENCY = 'DOP'
  const LOCALE = 'es-DO'

  const executiveSummaryInput: ExecutiveSummaryInput = {
    ...input.executiveSummary,
    currency: CURRENCY,
    locale: LOCALE,
  }

  // Nomina: mapear las entradas agregadas a las filas que espera la seccion.
  const payrollRows: PayrollSectionRow[] = (input.payroll.entries ?? []).map((e) => ({
    contractorName: String((e as Record<string, unknown>).contractorName ?? 'Contratista sin nombre'),
    partidasCount: Number((e as Record<string, unknown>).partidasCount ?? 0),
    laborSubtotal: Number((e as Record<string, unknown>).laborSubtotal ?? 0),
    materials: Number((e as Record<string, unknown>).materials ?? 0),
    indirects: Number((e as Record<string, unknown>).indirects ?? 0),
    deductions: Number((e as Record<string, unknown>).deductions ?? 0),
    net: Number((e as Record<string, unknown>).net ?? 0),
  }))
  const payrollInput: PayrollSectionInput = {
    rows: payrollRows,
    currency: CURRENCY,
    locale: LOCALE,
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
    footer: (currentPage, pageCount) => buildPageFooter(currentPage, pageCount, input.project?.name ?? ''),
    content: [
      // Cover page first (ends with pageBreak:'after').
      ...buildCoverPage(coverInput),
      // Resumen ejecutivo, desglose presupuestario, flujo de caja y nomina.
      ...buildExecutiveSummarySection(executiveSummaryInput),
      buildBudgetBreakdownSection(input.budgetBreakdown),
      buildCashflowSection(input.cashflow),
      buildPayrollSection(payrollInput),
      // Appendix last (starts with pageBreak:'before').
      ...buildAppendixSection(appendixInput),
    ],
  }

  return buildDocument(docDefinition)
}

/* -------------------------------------------------------------------------- */
/* Client report                                                              */
/* -------------------------------------------------------------------------- */

export type { ClientReportInput }

/**
 * Generates a client-facing "Reporte para Cliente" PDF.
 *
 * This report is designed for external stakeholders (clients, investors).
 * It intentionally omits internal cost details:
 *  - No unit prices or supplier rates.
 *  - No contractor-level payroll breakdown.
 *  - No internal variance analysis at partida/item level.
 *  - No bank account information.
 *  - No deposit category amounts.
 *
 * What it does include:
 *  - Project name, client name and generation date (cover page).
 *  - Overall construction progress percentage.
 *  - High-level financial summary (budget vs. executed, % spent).
 *  - Schedule milestones with status (completed / in-progress / pending).
 *  - Optional site photos (up to 6).
 *
 * @param input Data assembled by {@link loadClientReportData}.
 * @returns A `TCreatedPdf` ready to be downloaded or further processed.
 */
export function generateClientReport(input: ClientReportInput): TCreatedPdf {
  const generatedAt = input.generatedAt ?? new Date()

  const chrome: ReportChromeOptions = {
    companyName: input.companyName ?? 'NominApp',
    generatedAt,
  }

  const docDefinition: TDocumentDefinitions = {
    info: {
      title: `Reporte para Cliente - ${input.projectName}`,
      author: chrome.companyName,
      subject: 'Reporte de avance para cliente',
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
      h2: { fontSize: 16, bold: true, margin: [0, 12, 0, 8] },
      sectionTitle: { fontSize: 14, bold: true, margin: [0, 0, 0, 8] },
    },
    header: buildHeader(chrome),
    footer: (currentPage, pageCount) => buildPageFooter(currentPage, pageCount, input.projectName),
    content: buildClientReportContent(input),
  }

  return buildDocument(docDefinition)
}
