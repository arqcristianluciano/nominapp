import { FileText } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { ProjectReport, ReportTotals } from './reportTypes'

export function CubicationsTable({ reports }: { reports: ProjectReport[] }) {
  const rows = reports.filter((report) => report.acordado > 0)
  if (rows.length === 0) return null

  return (
    <div>
      <h2 className="text-base font-semibold text-app-text mb-3">Cubicaciones</h2>
      <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
        <table className="w-full hidden sm:table">
          <thead>
            <tr className="bg-app-bg border-b border-app-border">
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-app-muted uppercase">Proyecto</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase">Acordado</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden sm:table-cell">
                Acumulado
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">
                Pendiente
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold text-app-muted uppercase">% Avance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((report) => (
              <tr key={report.id} className="border-b border-app-border hover:bg-app-hover">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-app-text">{report.name}</p>
                  <p className="text-xs text-app-subtle">{report.code}</p>
                </td>
                <td className="px-4 py-3 text-sm text-app-muted text-right">{formatRD(report.acordado)}</td>
                <td className="px-4 py-3 text-sm text-green-600 font-medium text-right hidden sm:table-cell">
                  {formatRD(report.acumulado)}
                </td>
                <td className="px-4 py-3 text-sm text-amber-600 font-medium text-right hidden md:table-cell">
                  {formatRD(report.pendiente)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-16 h-2 bg-app-chip rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${report.avgCompletion > 90 ? 'bg-red-500' : report.avgCompletion > 70 ? 'bg-amber-500' : 'bg-teal-500'}`}
                        style={{ width: `${report.avgCompletion}%` }}
                      />
                    </div>
                    <span className="text-xs text-app-muted w-10 text-right">{report.avgCompletion.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="sm:hidden divide-y divide-app-border">
          {rows.map((report) => (
            <div key={report.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-app-text truncate">{report.name}</p>
                  <p className="text-xs text-app-subtle mt-0.5">{report.code}</p>
                </div>
                <p className="text-sm text-app-text font-semibold whitespace-nowrap text-right">
                  {formatRD(report.acordado)}
                </p>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-app-subtle">
                <p>
                  Acumulado: <span className="text-green-600 font-medium">{formatRD(report.acumulado)}</span>
                </p>
                <p>
                  Pendiente: <span className="text-amber-600 font-medium">{formatRD(report.pendiente)}</span>
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-app-chip rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${report.avgCompletion > 90 ? 'bg-red-500' : report.avgCompletion > 70 ? 'bg-amber-500' : 'bg-teal-500'}`}
                    style={{ width: `${report.avgCompletion}%` }}
                  />
                </div>
                <span className="text-xs text-app-muted w-10 text-right shrink-0">
                  {report.avgCompletion.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function FinancialSummaryTable({
  reports,
  totals,
  loading,
}: {
  reports: ProjectReport[]
  totals: ReportTotals
  loading: boolean
}) {
  if (loading) return <div className="text-sm text-app-muted">Generando reporte...</div>
  if (reports.length === 0)
    return (
      <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
        <FileText className="w-12 h-12 text-app-subtle mx-auto mb-3" />
        <p className="text-app-muted">No hay datos de proyectos para reportar</p>
      </div>
    )

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      <table className="w-full hidden sm:table">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-app-muted uppercase">Proyecto</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase">Total incurrido</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden sm:table-cell">
              Presupuesto
            </th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold text-app-muted uppercase">% Avance</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">
              CxP
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden lg:table-cell">
              Cash
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className="border-b border-app-border hover:bg-app-hover">
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-app-text">{report.name}</p>
                <p className="text-xs text-app-subtle">{report.code}</p>
              </td>
              <td className="px-4 py-3 text-sm text-app-muted text-right">{formatRD(report.totalIncurrido)}</td>
              <td className="px-4 py-3 text-sm text-app-muted text-right hidden sm:table-cell">
                {formatRD(report.presupuesto)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-16 h-2 bg-app-chip rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${report.avance > 90 ? 'bg-red-500' : report.avance > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${report.avance}%` }}
                    />
                  </div>
                  <span className="text-xs text-app-muted w-10 text-right">{report.avance.toFixed(0)}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-red-600 font-medium text-right hidden md:table-cell">
                {formatRD(report.cxp)}
              </td>
              <td
                className={`px-4 py-3 text-sm font-medium text-right hidden lg:table-cell ${report.cashDisponible >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatRD(report.cashDisponible)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-app-bg border-t-2 border-app-border">
            <td className="px-4 py-3 text-sm font-bold text-app-text">TOTALES</td>
            <td className="px-4 py-3 text-sm font-bold text-app-text text-right">{formatRD(totals.totalIncurrido)}</td>
            <td className="px-4 py-3 text-sm font-bold text-app-text text-right hidden sm:table-cell">
              {formatRD(totals.presupuesto)}
            </td>
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3 text-sm font-bold text-red-700 text-right hidden md:table-cell">
              {formatRD(totals.cxp)}
            </td>
            <td
              className={`px-4 py-3 text-sm font-bold text-right hidden lg:table-cell ${totals.cashDisponible >= 0 ? 'text-green-700' : 'text-red-700'}`}
            >
              {formatRD(totals.cashDisponible)}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className="sm:hidden divide-y divide-app-border">
        {reports.map((report) => (
          <div key={report.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-app-text truncate">{report.name}</p>
                <p className="text-xs text-app-subtle mt-0.5">{report.code}</p>
              </div>
              <p className="text-sm text-app-text font-semibold whitespace-nowrap text-right">
                {formatRD(report.totalIncurrido)}
              </p>
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-app-subtle">
              <p>
                Presupuesto: <span className="text-app-muted font-medium">{formatRD(report.presupuesto)}</span>
              </p>
              <p>
                CxP: <span className="text-red-600 font-medium">{formatRD(report.cxp)}</span>
              </p>
              <p>
                Cash:{' '}
                <span className={`font-medium ${report.cashDisponible >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatRD(report.cashDisponible)}
                </span>
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-app-chip rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${report.avance > 90 ? 'bg-red-500' : report.avance > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${report.avance}%` }}
                />
              </div>
              <span className="text-xs text-app-muted w-10 text-right shrink-0">{report.avance.toFixed(0)}%</span>
            </div>
          </div>
        ))}
        <div className="bg-app-bg p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-app-text uppercase">Totales</span>
            <span className="text-sm font-bold text-app-text">{formatRD(totals.totalIncurrido)}</span>
          </div>
          <div className="text-xs text-app-subtle space-y-0.5">
            <p>
              Presupuesto: <span className="text-app-text font-bold">{formatRD(totals.presupuesto)}</span>
            </p>
            <p>
              CxP: <span className="text-red-700 font-bold">{formatRD(totals.cxp)}</span>
            </p>
            <p>
              Cash:{' '}
              <span className={`font-bold ${totals.cashDisponible >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatRD(totals.cashDisponible)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
