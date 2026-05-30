import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, LineChart } from 'lucide-react'
import {
  partidaProgressService,
  type MonthlyCubicationRow,
  type PartidaActualCostRow,
  type PartidaCostCoverage,
} from '@/services/partidaProgressService'
import { exportToExcel } from '@/utils/excelExport'
import { useToast } from '@/components/ui/Toast'
import { useProjectStore } from '@/stores/projectStore'
import { formatRD } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'

type ViewMode = 'mensual' | 'partida'

export default function CubicacionMensualPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)

  const [view, setView] = useState<ViewMode>('mensual')
  const [rows, setRows] = useState<MonthlyCubicationRow[]>([])
  const [partidaRows, setPartidaRows] = useState<PartidaActualCostRow[]>([])
  const [coverage, setCoverage] = useState<PartidaCostCoverage | null>(null)
  const [loading, setLoading] = useState(true)
  const { success, error } = useToast()

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    Promise.all([
      partidaProgressService.getMonthlyCubication(projectId),
      partidaProgressService.getActualCostByPartida(projectId),
    ])
      .then(([monthly, partida]) => {
        if (cancelled) return
        setRows(monthly)
        setPartidaRows(partida.rows)
        setCoverage(partida.coverage)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const months = Array.from(new Set(rows.map((r) => r.month))).sort()

  async function handleExport() {
    try {
      if (view === 'mensual') {
        await exportToExcel(`cubicacion_mensual_${project?.code ?? projectId}`, [
          {
            name: 'Cubicación mensual',
            rows: rows.map((r) => ({
              Mes: r.month,
              Capítulo: r.category_code ?? '—',
              Nombre: r.category_name ?? '—',
              'Cubicado (DOP)': r.cubicado.toFixed(2),
              'Costo real (DOP)': r.costo_real.toFixed(2),
              'Desviación (DOP)': r.desviacion.toFixed(2),
              'Desviación %': `${r.cubicado > 0 ? ((r.desviacion / r.cubicado) * 100).toFixed(1) : '0.0'}%`,
            })),
          },
        ])
      } else {
        await exportToExcel(`costo_real_por_partida_${project?.code ?? projectId}`, [
          {
            name: 'Costo real por partida',
            rows: partidaRows.map((r) => ({
              Capítulo: r.category_code ?? '—',
              Partida: r.item_code ?? '—',
              Descripción: r.item_description,
              'Presupuesto (DOP)': r.presupuesto.toFixed(2),
              'Costo real (DOP)': r.costo_real.toFixed(2),
              'Desviación (DOP)': r.desviacion.toFixed(2),
              'Desviación %': `${r.presupuesto > 0 ? ((r.desviacion / r.presupuesto) * 100).toFixed(1) : '0.0'}%`,
            })),
          },
        ])
      }
      success('Exportado')
    } catch (err) {
      error(getErrorMessage(err) || 'No se pudo exportar')
    }
  }

  // Solo mostramos partidas con presupuesto o con costo real imputado, para
  // evitar un listado lleno de filas en cero.
  const partidaRowsToShow = partidaRows.filter((r) => r.presupuesto > 0 || r.costo_real > 0)

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">Cubicación {project?.name && `— ${project.name}`}</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 border border-app-border text-app-muted rounded-lg text-sm hover:bg-app-hover"
        >
          <Download className="w-4 h-4" /> Excel
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Vista de cubicación"
        className="grid grid-cols-2 gap-1 bg-app-hover rounded-lg p-1 max-w-md"
      >
        {(
          [
            { value: 'mensual', label: 'Por capítulo (mensual)' },
            { value: 'partida', label: 'Por partida (acumulado)' },
          ] as const
        ).map((tab) => {
          const active = view === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(tab.value)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                active ? 'bg-blue-600 text-white shadow-sm' : 'text-app-muted hover:text-app-text'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Calculando...</div>
      ) : view === 'mensual' ? (
        rows.length === 0 ? (
          <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
            <p className="text-base font-semibold text-app-text mb-1">Sin avances registrados</p>
            <p className="text-sm text-app-muted">
              Captura avances por partida para que aparezca la cubicación mensual con su comparación contra el costo
              real.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {months.map((month) => {
              const monthRows = rows.filter((r) => r.month === month)
              const sumCub = monthRows.reduce((s, r) => s + r.cubicado, 0)
              const sumReal = monthRows.reduce((s, r) => s + r.costo_real, 0)
              const sumDesv = sumReal - sumCub
              return (
                <div key={month} className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-app-chip flex justify-between text-sm font-semibold">
                    <span>{month}</span>
                    <span>
                      Cubicado {formatRD(sumCub)} · Real {formatRD(sumReal)} ·{' '}
                      <span className={sumDesv > 0 ? 'text-red-600' : 'text-green-600'}>
                        {sumDesv >= 0 ? '+' : ''}
                        {formatRD(sumDesv)}
                      </span>
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-app-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Capítulo</th>
                        <th className="px-3 py-2 text-right">Cubicado</th>
                        <th className="px-3 py-2 text-right">Costo real</th>
                        <th className="px-3 py-2 text-right">Desviación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((r) => (
                        <tr key={`${r.month}-${r.budget_category_id ?? 'none'}`} className="border-t border-app-border">
                          <td className="px-3 py-2">
                            {r.category_code ? `[${r.category_code}] ` : ''}
                            {r.category_name ?? <span className="text-app-subtle">Sin imputación</span>}
                          </td>
                          <td className="px-3 py-2 text-right">{formatRD(r.cubicado)}</td>
                          <td className="px-3 py-2 text-right">{formatRD(r.costo_real)}</td>
                          <td
                            className={`px-3 py-2 text-right font-medium ${
                              r.desviacion > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {r.desviacion >= 0 ? '+' : ''}
                            {formatRD(r.desviacion)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )
      ) : partidaRowsToShow.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
          <p className="text-base font-semibold text-app-text mb-1">Sin partidas con datos</p>
          <p className="text-sm text-app-muted">
            Imputa costos (salidas de almacén, mano de obra o facturas de materiales) a una partida para ver aquí el
            costo real acumulado contra el presupuesto.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {coverage && coverage.total > 0 && coverage.unattributed > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Cobertura del reporte: {((coverage.attributed / coverage.total) * 100).toFixed(0)}% del costo real está
                imputado a una partida.
              </p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                {formatRD(coverage.unattributed)} de {formatRD(coverage.total)} quedó sin partida (solo capítulo o sin
                imputar) y no se refleja en las filas de abajo. Asigna partida al capturar costos para un seguimiento
                completo.
              </p>
            </div>
          )}
          <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-app-chip flex justify-between text-sm font-semibold">
              <span>Costo real acumulado por partida</span>
              <span>
                Presupuesto {formatRD(partidaRowsToShow.reduce((s, r) => s + r.presupuesto, 0))} · Real{' '}
                {formatRD(partidaRowsToShow.reduce((s, r) => s + r.costo_real, 0))}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="text-xs text-app-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Capítulo</th>
                    <th className="px-3 py-2 text-left">Partida</th>
                    <th className="px-3 py-2 text-right">Presupuesto</th>
                    <th className="px-3 py-2 text-right">Costo real</th>
                    <th className="px-3 py-2 text-right">Desviación</th>
                  </tr>
                </thead>
                <tbody>
                  {partidaRowsToShow.map((r) => (
                    <tr key={r.budget_item_id} className="border-t border-app-border">
                      <td className="px-3 py-2 text-app-muted">
                        {r.category_code ? `[${r.category_code}] ` : ''}
                        {r.category_name ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {r.item_code ? `[${r.item_code}] ` : ''}
                        {r.item_description}
                      </td>
                      <td className="px-3 py-2 text-right">{formatRD(r.presupuesto)}</td>
                      <td className="px-3 py-2 text-right">{formatRD(r.costo_real)}</td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          r.desviacion > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {r.desviacion >= 0 ? '+' : ''}
                        {formatRD(r.desviacion)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
