import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { useProjectReports } from '@/hooks/useProjectReports'
import { ReportsSummaryCards } from '@/components/features/reports/ReportsSummaryCards'
import { CubicationsTable, FinancialSummaryTable } from '@/components/features/reports/ReportsTables'

export default function Reportes() {
  const { projects, fetchProjects } = useProjectStore()
  const [exporting, setExporting] = useState(false)
  const { reports, totals, loading, exportToExcel } = useProjectReports(projects)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  async function handleExport() {
    setExporting(true)
    try {
      await exportToExcel()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Resumen Financiero</h1>
          <p className="text-sm text-app-muted mt-1">Reporte consolidado de todos los proyectos activos</p>
        </div>
        {reports.length > 0 && (
          <div className="flex gap-2">
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
          </div>
        )}
      </div>

      <ReportsSummaryCards totals={totals} />
      <CubicationsTable reports={reports} />
      <FinancialSummaryTable reports={reports} totals={totals} loading={loading} />
    </div>
  )
}
