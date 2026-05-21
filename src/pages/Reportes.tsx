import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, Printer } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { useProjectReports } from '@/hooks/useProjectReports'
import { ReportsSummaryCards } from '@/components/features/reports/ReportsSummaryCards'
import { CubicationsTable, FinancialSummaryTable } from '@/components/features/reports/ReportsTables'
import { ReporteMensualModal } from '@/components/features/reports/ReporteMensualModal'
import { Modal } from '@/components/ui/Modal'
import {
  downloadPdf,
  generateMonthlyReport,
  type MonthlyReportInput,
} from '@/services/reports/pdfReportService'

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
      const input: MonthlyReportInput = {
        project: {
          id: selectedProject.id,
          name: selectedProject.name,
          companyName: selectedProject.company?.name,
        },
        month: parsed,
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
        payroll: {
          totalPaid: 0,
          entriesCount: 0,
        },
      }
      const doc = generateMonthlyReport(input)
      const monthLabel = `${parsed.year}-${String(parsed.month).padStart(2, '0')}`
      const filename = `reporte-mensual-${selectedProject.code || selectedProject.id}-${monthLabel}.pdf`
      downloadPdf(doc, filename)
      setMonthlyDialogOpen(false)
    } catch (err) {
      console.error('[Reportes] handleGenerateMonthlyPdf failed', err)
      setPdfError('No se pudo generar el reporte mensual. Intenta de nuevo.')
    } finally {
      setGeneratingPdf(false)
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
          {reports.length > 0 && (
            <>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 border border-app-border bg-app-surface text-sm font-medium text-app-muted rounded-xl hover:bg-app-hover transition-colors"
              >
                <Printer className="w-4 h-4" /> Imprimir / PDF
              </button>
              <button
                onClick={() => { void handleExport() }}
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

      <ReporteMensualModal
        open={reporteMensualOpen}
        onClose={() => setReporteMensualOpen(false)}
      />

      <Modal
        open={monthlyDialogOpen}
        onClose={closeMonthlyDialog}
        title="Descargar reporte mensual PDF"
      >
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
              return (
                <p className="mt-1 text-xs text-app-muted">{label}</p>
              )
            })()}
          </div>

          {pdfError && (
            <p className="text-xs text-red-600" role="alert">{pdfError}</p>
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
              onClick={() => { void handleGenerateMonthlyPdf() }}
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
    </div>
  )
}
