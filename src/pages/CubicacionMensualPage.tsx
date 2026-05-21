import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, LineChart } from 'lucide-react'
import {
  partidaProgressService,
  type MonthlyCubicationRow,
} from '@/services/partidaProgressService'
import { exportToExcel } from '@/utils/excelExport'
import { useToast } from '@/components/ui/Toast'
import { useProjectStore } from '@/stores/projectStore'
import { formatRD } from '@/utils/currency'

export default function CubicacionMensualPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)

  const [rows, setRows] = useState<MonthlyCubicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const { success, error } = useToast()

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    partidaProgressService
      .getMonthlyCubication(projectId)
      .then((data) => {
        if (!cancelled) setRows(data)
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
      success('Exportado')
    } catch {
      error('No se pudo exportar')
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">
            Cubicación mensual {project?.name && `— ${project.name}`}
          </h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 border border-app-border text-app-muted rounded-lg text-sm hover:bg-app-hover"
        >
          <Download className="w-4 h-4" /> Excel
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Calculando...</div>
      ) : rows.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
          <p className="text-base font-semibold text-app-text mb-1">Sin avances registrados</p>
          <p className="text-sm text-app-muted">
            Captura avances por partida para que aparezca la cubicación mensual con su comparación
            contra el costo real.
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
      )}
    </div>
  )
}
