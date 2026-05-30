import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useProjectStore } from '@/stores/projectStore'
import { downloadPdf, generateMonthlyReport } from '@/services/reports/pdfReportService'
import { loadMonthlyReportData } from '@/services/reports/monthlyReportData'
import { getErrorMessage } from '@/utils/errors'

interface ReporteMensualModalProps {
  open: boolean
  onClose: () => void
}

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

interface MonthOption {
  /** ISO `YYYY-MM` value. */
  value: string
  /** Human-readable label, e.g. "Mayo 2026". */
  label: string
  year: number
  /** 1-indexed month (1 = January). */
  month: number
}

/**
 * Builds the list of selectable months: the current month plus the previous
 * eleven (12 in total), ordered most recent first.
 */
function buildLastTwelveMonths(reference: Date = new Date()): MonthOption[] {
  const options: MonthOption[] = []
  const baseYear = reference.getFullYear()
  const baseMonth = reference.getMonth() // 0-indexed
  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(baseYear, baseMonth - offset, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1 // convert to 1-indexed
    const value = `${year}-${String(month).padStart(2, '0')}`
    const label = `${MONTH_NAMES[month - 1]} ${year}`
    options.push({ value, label, year, month })
  }
  return options
}

/**
 * Modal that lets the user pick a project + month and triggers the PDF
 * monthly report generation/download flow.
 *
 * The real reporting data is loaded via {@link loadMonthlyReportData} before
 * the report is generated and downloaded.
 */
export function ReporteMensualModal({ open, onClose }: ReporteMensualModalProps) {
  const { projects, fetchProjects } = useProjectStore()

  const monthOptions = useMemo(() => buildLastTwelveMonths(), [])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? '')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load projects when the modal opens (no-op if already loaded).
  useEffect(() => {
    if (!open) return
    if (projects.length === 0) {
      void fetchProjects()
    }
  }, [open, projects.length, fetchProjects])

  // When the modal opens, pre-select the first project so the action is
  // immediately actionable.
  useEffect(() => {
    if (!open) return
    setError(null)
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [open, projects, selectedProjectId])

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  const selectedMonthOption = useMemo(
    () => monthOptions.find((option) => option.value === selectedMonth) ?? null,
    [monthOptions, selectedMonth],
  )

  function handleClose() {
    if (generating) return
    onClose()
  }

  async function handleGenerate() {
    setError(null)
    if (!selectedProject || !selectedMonthOption) {
      setError('Selecciona un proyecto y un mes válido.')
      return
    }
    setGenerating(true)
    try {
      const input = await loadMonthlyReportData(selectedProject.id, selectedMonthOption.value)
      const doc = generateMonthlyReport(input)
      const monthLabel = `${selectedMonthOption.year}-${String(selectedMonthOption.month).padStart(2, '0')}`
      const filename = `reporte-mensual-${selectedProject.code || selectedProject.id}-${monthLabel}.pdf`
      downloadPdf(doc, filename)
      onClose()
    } catch (err) {
      console.error('[ReporteMensualModal] handleGenerate failed', err)
      setError(getErrorMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Generar reporte mensual">
      <div className="space-y-4">
        <div>
          <label htmlFor="reporte-mensual-project" className="block text-xs font-medium text-app-muted mb-2">
            Proyecto
          </label>
          <select
            id="reporte-mensual-project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={generating}
            className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-app-text disabled:opacity-50"
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
          <label htmlFor="reporte-mensual-month" className="block text-xs font-medium text-app-muted mb-2">
            Mes
          </label>
          <select
            id="reporte-mensual-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={generating}
            className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-app-text disabled:opacity-50"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={generating}
            className="px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-app-muted hover:bg-app-hover transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              void handleGenerate()
            }}
            disabled={generating || !selectedProjectId || !selectedMonth}
            aria-busy={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {generating ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
