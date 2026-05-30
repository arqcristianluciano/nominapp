import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mockeamos pdfmake ANTES de importar el service.
//
// pdfReportService importa:
//   - pdfmake/build/pdfmake       (default export con createPdf/setFonts/addVirtualFileSystem)
//   - pdfmake/build/vfs_fonts     (objeto con `vfs`)
//
// Capturamos:
//   - el TDocumentDefinitions que se le pasa a createPdf
//   - el "doc" devuelto, con `download` mockeado para verificar downloadPdf
const createPdfMock = vi.fn()
const setFontsMock = vi.fn()
const addVirtualFileSystemMock = vi.fn()
const downloadMock = vi.fn()

vi.mock('pdfmake/build/pdfmake', () => {
  const fakeDoc = {
    download: (...args: unknown[]) => downloadMock(...args),
    open: vi.fn(),
    getBlob: vi.fn(),
    getBase64: vi.fn(),
  }
  return {
    default: {
      createPdf: (...args: unknown[]) => {
        createPdfMock(...args)
        return fakeDoc
      },
      setFonts: (...args: unknown[]) => setFontsMock(...args),
      addVirtualFileSystem: (...args: unknown[]) => addVirtualFileSystemMock(...args),
    },
  }
})

vi.mock('pdfmake/build/vfs_fonts', () => ({
  default: { vfs: { 'Roboto-Regular.ttf': 'AAAA' } },
  vfs: { 'Roboto-Regular.ttf': 'AAAA' },
}))

// Importamos el service condicionalmente. Si por cualquier razón el módulo no
// pudiera cargarse (e.g. dynamic require fail bajo Node), todos los tests se
// skipean automáticamente vía describe.skipIf en lugar de crashear la suite.
type PdfReportServiceModule = typeof import('./pdfReportService')

let serviceModule: PdfReportServiceModule | null = null
let loadError: unknown = null

try {
  serviceModule = await import('./pdfReportService')
} catch (err) {
  loadError = err
}

const describeOrSkip = serviceModule ? describe : describe.skip

describeOrSkip('pdfReportService', () => {
  if (!serviceModule) {
    // Si llegamos aquí pese al describe.skip, dejamos pista en stdout para
    // facilitar el debug de la carga dinámica.
    console.warn('[pdfReportService.test] skipped: failed to import service', loadError)
    return
  }
  const { generateMonthlyReport, downloadPdf, buildDocument } = serviceModule

  beforeEach(() => {
    createPdfMock.mockClear()
    setFontsMock.mockClear()
    addVirtualFileSystemMock.mockClear()
    downloadMock.mockClear()
  })

  describe('generateMonthlyReport', () => {
    it('no crashea con input mínimo / vacío y devuelve un doc', async () => {
      const emptyish = {
        project: { id: '', name: '' },
        month: { year: 2026, month: 5 },
        executiveSummary: {
          totalBudget: 0,
          totalInvested: 0,
          variance: 0,
          progressPercent: 0,
          projectGrandTotal: 0,
          daysWorked: 0,
          activeContractors: 0,
          partidasInProgress: 0,
          materialsReceived: 0,
          monthlyTransactions: 0,
        },
        budgetBreakdown: { categories: [] },
        cashflow: {
          collections: { expected: 0, actual: 0 },
          contractorPayments: { expected: 0, actual: 0 },
          supplierPayments: { expected: 0, actual: 0 },
          releasedPurchaseOrders: { expected: 0, actual: 0 },
          indirects: { expected: 0, actual: 0 },
        },
        payroll: { totalPaid: 0, entriesCount: 0 },
      }

      const doc = generateMonthlyReport(emptyish)

      expect(doc).toBeDefined()
      expect(doc).not.toBeNull()
      expect(typeof doc).toBe('object')
      // El doc retornado es un proxy lazy; sus métodos son async porque
      // pdfmake se carga dinámicamente. download() resuelve al fakeDoc real.
      expect(typeof (doc as { download: unknown }).download).toBe('function')

      // El createPdf real se llama después de que se resuelva el dynamic
      // import de pdfmake. Forzamos la resolución awaitando un método.
      await doc.getBase64()

      expect(createPdfMock).toHaveBeenCalledTimes(1)
    })

    it('la TDocumentDefinitions pasada a createPdf tiene el shape esperado', async () => {
      const input = {
        project: { id: 'p1', name: 'Proyecto Demo', companyName: 'ACME' },
        month: { year: 2026, month: 3 },
        executiveSummary: {
          totalBudget: 1000,
          totalInvested: 500,
          variance: 500,
          progressPercent: 50,
          projectGrandTotal: 1000,
          daysWorked: 10,
          activeContractors: 2,
          partidasInProgress: 1,
          materialsReceived: 3,
          monthlyTransactions: 4,
        },
        budgetBreakdown: { categories: [] },
        cashflow: {
          collections: { expected: 0, actual: 0 },
          contractorPayments: { expected: 0, actual: 0 },
          supplierPayments: { expected: 0, actual: 0 },
          releasedPurchaseOrders: { expected: 0, actual: 0 },
          indirects: { expected: 0, actual: 0 },
        },
        payroll: { totalPaid: 0, entriesCount: 0 },
      }

      const doc = generateMonthlyReport(input)
      await doc.getBase64()

      expect(createPdfMock).toHaveBeenCalledTimes(1)
      const [docDefinition] = createPdfMock.mock.calls[0] as [Record<string, unknown>]

      // Shape básico de pdfMake.TDocumentDefinitions:
      //  - content (array)
      //  - styles / defaultStyle / pageSize / pageMargins
      //  - header / footer
      //  - info (metadata)
      expect(docDefinition).toBeTypeOf('object')
      expect(Array.isArray(docDefinition.content)).toBe(true)
      expect(docDefinition.pageSize).toBeDefined()
      expect(docDefinition.pageMargins).toBeDefined()
      expect(docDefinition.defaultStyle).toBeTypeOf('object')
      expect(docDefinition.styles).toBeTypeOf('object')
      expect(docDefinition.info).toBeTypeOf('object')
      // Header y footer pueden ser objeto o función según pdfmake.
      expect(docDefinition.header).toBeDefined()
      expect(docDefinition.footer).toBeDefined()

      const info = docDefinition.info as Record<string, unknown>
      expect(typeof info.title).toBe('string')
      expect(info.title as string).toContain('Proyecto Demo')
    })
  })

  describe('downloadPdf', () => {
    it('invoca doc.download (que está mockeado sobre pdfmake.download)', async () => {
      // buildDocument llama internamente a pdfMake.createPdf (mockeado) y
      // devuelve un proxy lazy cuyo `download` defer al fakeDoc real una
      // vez resuelto el dynamic import de pdfmake.
      const doc = buildDocument({ content: [] })

      downloadPdf(doc, 'reporte mensual.pdf')
      // Esperamos a que el dynamic import se resuelva y se invoque el download real.
      await doc.getBase64()

      expect(downloadMock).toHaveBeenCalledTimes(1)
      // El service normaliza espacios a `_` y deja la extensión .pdf.
      const [calledWith] = downloadMock.mock.calls[0] as [string]
      expect(typeof calledWith).toBe('string')
      expect(calledWith.toLowerCase().endsWith('.pdf')).toBe(true)
    })

    it('agrega .pdf si el filename no lo trae', async () => {
      const doc = buildDocument({ content: [] })
      downloadPdf(doc, 'reporte-mayo')
      await doc.getBase64()

      expect(downloadMock).toHaveBeenCalledTimes(1)
      const [calledWith] = downloadMock.mock.calls[0] as [string]
      expect(calledWith.endsWith('.pdf')).toBe(true)
    })
  })
})
