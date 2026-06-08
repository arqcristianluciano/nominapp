import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, Printer, Users } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { useProjectReports } from '@/hooks/useProjectReports'
import { ReportsSummaryCards } from '@/components/features/reports/ReportsSummaryCards'
import { CubicationsTable, FinancialSummaryTable } from '@/components/features/reports/ReportsTables'
import { ReporteMensualModal } from '@/components/features/reports/ReporteMensualModal'
import { Modal } from '@/components/ui/Modal'
import { downloadPdf, generateMonthlyReport, generateClientReport } from '@/services/reports/pdfReportService'
import { loadMonthlyReportData } from '@/services/reports/monthlyReportData'
import { loadClientReportData } from '@/services/reports/clientReportData'
import { getErrorMessage } from '@/utils/errors'

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function defaultMonthValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function parseMonthValue(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  if (month < 1 || month > 12) return null
  return { year, month }
}

export default function Reportes() {
  const { projects, fetchProjects } = useProjectStore()
  const [exporting, setExporting] = useState(false)
  const { reports, totals, loading, exportToExcel } = useProjectReports(projects)

  const [monthlyDialogOpen, setMonthlyDialogOpen] = useState(false)
  const [reporteMensualOpen, setReporteMensualOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthValue())
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Client report state
  const [clientReportDialogOpen, setClientReportDialogOpen] = useState(false)
  const [clientReportProjectId, setClientReportProjectId] = useState('')
  const [clientReportIncludePhotos, setClientReportIncludePhotos] = useState(false)
  const [generatingClientPdf, setGeneratingClientPdf] = useState(false)
  const [clientPdfError, setClientPdfError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  async function handleExport() {
    setExporting(true)
    try {
      await exportToExcel()
    } finally {
      setExporting(false)
    }
  }

  function openMonthlyDialog() {
    setPdfError(null)
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
    setMonthlyDialogOpen(true)
  }

  function closeMonthlyDialog() {
    if (generatingPdf) return
    setMonthlyDialogOpen(false)
  }

  async function handleGenerateMonthlyPdf() {
    setPdfError(null)
    const parsed = parseMonthValue(selectedMonth)
    if (!selectedProject || !parsed) {
      setPdfError('Selecciona un proyecto y un mes válido.')
      return
    }
    setGeneratingPdf(true)
    try {
      const yearMonth = `${parsed.year}-${String(parsed.month).padStart(2, '0')}`
      const input = await loadMonthlyReportData(selectedProject.id, yearMonth)
      const doc = generateMonthlyReport(input)
      const filename = `reporte-mensual-${selectedProject.code || selectedProject.id}-${yearMonth}.pdf`
      downloadPdf(doc, filename)
      setMonthlyDialogOpen(false)
    } catch (err) {
      console.error('[Reportes] handleGenerateMonthlyPdf failed', err)
      setPdfError(getErrorMessage(err) || 'No se pudo generar el reporte mensual. Intenta de nuevo.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  function openClientReportDialog() {
    setClientPdfError(null)
    if (!clientReportProjectId && projects.length > 0) {
      setClientReportProjectId(projects[0].id)
    }
    setClientReportDialogOpen(true)
  }

  function closeClientReportDialog() {
    if (generatingClientPdf) return
    setClientReportDialogOpen(false)
  }

  async function handleGenerateClientPdf() {
    setClientPdfError(null)
    if (!clientReportProjectId) {
      setClientPdfError('Selecciona un proyecto.')
      return
    }
    const project = projects.find((p) => p.id === clientReportProjectId)
    if (!project) {
      setClientPdfError('Proyecto no encontrado.')
      return
    }
    setGeneratingClientPdf(true)
    try {
      const input = await loadClientReportData(clientReportProjectId, {
        includePhotos: clientReportIncludePhotos,
      })
      const doc = generateClientReport(input)
      const filename = `reporte-cliente-${project.code || project.id}.pdf`
      downloadPdf(doc, filename)
      setClientReportDialogOpen(false)
    } catch (err) {
      console.error('[Reportes] handleGenerateClientPdf failed', err)
      setClientPdfError(getErrorMessage(err) || 'No se pudo generar el reporte para cliente. Intenta de nuevo.')
    } finally {
      setGeneratingClientPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Resumen Financiero</h1>
          <p className="text-sm text-app-muted mt-1">Reporte consolidado de todos los proyectos activos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openMonthlyDialog}
            className="flex items-center gap-2 px-4 py-2 border border-app-border bg-app-surface text-sm font-medium text-app-muted rounded-xl hover:bg-app-hover transition-colors"
          >
            <FileText className="w-4 h-4" /> Descargar reporte mensual PDF
          </button>
          <button
            onClick={() => setReporteMensualOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-app-border bg-app-surface text-sm font-medium text-app-muted rounded-xl hover:bg-app-hover transition-colors"
          >
            <FileText className="w-4 h-4" /> Reporte mensual
          </button>
          <button
            onClick={openClientReportDialog}
            className="flex items-center gap-2 px-4 py-2 border border-blue-300 bg-blue-50 text-sm font-medium text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Users className="w-4 h-4" /> Reporte para cliente (PDF)
          </button>
          {reports.length > 0 && (
            <>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 border border-app-border bg-app-surface text-sm font-medium text-app-muted rounded-xl hover:bg-app-hover transition-colors"
              >
                <Printer className="w-4 h-4" /> Imprimir / PDF
              </button>
              <button
                onClick={() => {
                  void handleExport()
                }}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 border border-app-border bg-app-surface text-sm font-medium text-app-muted rounded-xl hover:bg-app-hover transition-colors"
              >
                <Download className="w-4 h-4" /> {exporting ? 'Exportando...' : 'Exportar Excel'}
              </button>
            </>
          )}
        </div>
      </div>

      <ReportsSummaryCards totals={totals} />
      <CubicationsTable reports={reports} />
      <FinancialSummaryTable reports={reports} totals={totals} loading={loading} />

      <ReporteMensualModal open={reporteMensualOpen} onClose={() => setReporteMensualOpen(false)} />

      <Modal open={monthlyDialogOpen} onClose={closeMonthlyDialog} title="Descargar reporte mensual PDF">
        <div className="space-y-4">
          <div>
            <label htmlFor="monthly-report-project" className="block text-xs font-medium text-app-muted mb-2">
              Proyecto
            </label>
            <select
              id="monthly-report-project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-app-text"
            >
              <option value="">Selecciona un proyecto…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="monthly-report-month" className="block text-xs font-medium text-app-muted mb-2">
              Mes
            </label>
            <input
              id="monthly-report-month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-app-text"
            />
            {(() => {
              const parsed = parseMonthValue(selectedMonth)
              if (!parsed) return null
              const label = `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`
              return <p className="mt-1 text-xs text-app-muted">{label}</p>
            })()}
          </div>

          {pdfError && (
            <p className="text-xs text-red-600" role="alert">
              {pdfError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeMonthlyDialog}
              disabled={generatingPdf}
              className="px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-app-muted hover:bg-app-hover transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void handleGenerateMonthlyPdf()
              }}
              disabled={generatingPdf || !selectedProjectId}
              aria-busy={generatingPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {generatingPdf ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Client report dialog */}
      <Modal open={clientReportDialogOpen} onClose={closeClientReportDialog} title="Reporte para cliente (PDF)">
        <div className="space-y-4">
          <p className="text-xs text-app-muted">
            Genera un PDF presentable para tu cliente o inversionista. Incluye avance de obra, resumen financiero e
            hitos del cronograma. <strong>No incluye</strong> costos unitarios, detalle de contratistas ni datos
            bancarios.
          </p>

          <div>
            <label htmlFor="client-report-project" className="block text-xs font-medium text-app-muted mb-2">
              Proyecto
            </label>
            <select
              id="client-report-project"
              value={clientReportProjectId}
              onChange={(e) => setClientReportProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-app-text"
            >
              <option value="">Selecciona un proyecto…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="client-report-photos"
              type="checkbox"
              checked={clientReportIncludePhotos}
              onChange={(e) => setClientReportIncludePhotos(e.target.checked)}
              className="w-4 h-4 rounded border-app-border text-blue-600"
            />
            <label htmlFor="client-report-photos" className="text-sm text-app-text">
              Incluir fotos recientes de la bitácora (hasta 6)
            </label>
          </div>

          {clientPdfError && (
            <p className="text-xs text-red-600" role="alert">
              {clientPdfError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeClientReportDialog}
              disabled={generatingClientPdf}
              className="px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-app-muted hover:bg-app-hover transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void handleGenerateClientPdf()
              }}
              disabled={generatingClientPdf || !clientReportProjectId}
              aria-busy={generatingClientPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {generatingClientPdf ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
