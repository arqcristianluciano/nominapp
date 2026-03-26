import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { transactionService } from '@/services/transactionService'
import { budgetCategoryService } from '@/services/budgetCategoryService'
import { getProjectsProgress } from '@/services/cubicationService'
import {
  calcTotalIncurrido,
  calcTotalCxP,
  calcCashDisponible,
} from '@/utils/financialCalculations'
import { formatRD } from '@/utils/currency'

interface ProjectReport {
  id: string
  name: string
  code: string
  totalIncurrido: number
  presupuesto: number
  cxp: number
  cashDisponible: number
  avance: number
  acordado: number
  acumulado: number
  pendiente: number
  avgCompletion: number
}

export default function Reportes() {
  const { projects, fetchProjects } = useProjectStore()
  const [reports, setReports] = useState<ProjectReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    async function loadReports() {
      const activeProjects = projects.filter((p) => p.status === 'active')
      if (activeProjects.length === 0) {
        setLoading(false)
        return
      }

      try {
        const results: ProjectReport[] = []
        const cubProgress = await getProjectsProgress()

        for (const project of activeProjects) {
          const [transactions, categories] = await Promise.all([
            transactionService.getByProject(project.id),
            budgetCategoryService.getByProject(project.id),
          ])

          const totalIncurrido = calcTotalIncurrido(transactions)
          const presupuesto = categories.reduce((sum, c) => sum + c.budgeted_amount, 0)
          const cxp = calcTotalCxP(transactions)
          const cashDisponible = calcCashDisponible(transactions)
          const avance = presupuesto > 0 ? (totalIncurrido / presupuesto) * 100 : 0
          const cub = cubProgress[project.id] ?? { acordado: 0, acumulado: 0, avg_completion: 0 }

          results.push({
            id: project.id,
            name: project.name,
            code: project.code,
            totalIncurrido,
            presupuesto,
            cxp,
            cashDisponible,
            avance: Math.min(avance, 100),
            acordado: cub.acordado,
            acumulado: cub.acumulado,
            pendiente: cub.acordado - cub.acumulado,
            avgCompletion: cub.avg_completion,
          })
        }

        setReports(results)
      } catch {
      } finally {
        setLoading(false)
      }
    }
    if (projects.length > 0) loadReports()
  }, [projects])

  const totals = reports.reduce(
    (acc, r) => ({
      totalIncurrido: acc.totalIncurrido + r.totalIncurrido,
      presupuesto: acc.presupuesto + r.presupuesto,
      cxp: acc.cxp + r.cxp,
      cashDisponible: acc.cashDisponible + r.cashDisponible,
    }),
    { totalIncurrido: 0, presupuesto: 0, cxp: 0, cashDisponible: 0 }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-app-text">Resumen Financiero</h1>
        <p className="text-sm text-app-muted mt-1">Reporte consolidado de todos los proyectos activos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-surface rounded-xl border border-app-border p-4">
          <p className="text-xs text-app-muted">Total incurrido</p>
          <p className="text-xl font-semibold text-app-text mt-1">{formatRD(totals.totalIncurrido)}</p>
        </div>
        <div className="bg-app-surface rounded-xl border border-app-border p-4">
          <p className="text-xs text-app-muted">Presupuesto total</p>
          <p className="text-xl font-semibold text-app-text mt-1">{formatRD(totals.presupuesto)}</p>
        </div>
        <div className="bg-app-surface rounded-xl border border-app-border p-4">
          <p className="text-xs text-app-muted">CxP pendientes</p>
          <p className="text-xl font-semibold text-red-700 mt-1">{formatRD(totals.cxp)}</p>
        </div>
        <div className="bg-app-surface rounded-xl border border-app-border p-4">
          <p className="text-xs text-app-muted">Cash disponible</p>
          <p className={`text-xl font-semibold mt-1 ${totals.cashDisponible >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatRD(totals.cashDisponible)}
          </p>
        </div>
      </div>

      {reports.some((r) => r.acordado > 0) && (
        <div>
          <h2 className="text-base font-semibold text-app-text mb-3">Cubicaciones</h2>
          <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-app-bg border-b border-app-border">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-app-muted uppercase">Proyecto</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase">Acordado</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden sm:table-cell">Acumulado</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">Pendiente</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-app-muted uppercase">% Avance</th>
                </tr>
              </thead>
              <tbody>
                {reports.filter((r) => r.acordado > 0).map((r) => (
                  <tr key={r.id} className="border-b border-app-border hover:bg-app-hover">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-app-text">{r.name}</p>
                      <p className="text-xs text-app-subtle">{r.code}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-app-muted text-right">{formatRD(r.acordado)}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium text-right hidden sm:table-cell">{formatRD(r.acumulado)}</td>
                    <td className="px-4 py-3 text-sm text-amber-600 font-medium text-right hidden md:table-cell">{formatRD(r.pendiente)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-app-chip rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${r.avgCompletion > 90 ? 'bg-red-500' : r.avgCompletion > 70 ? 'bg-amber-500' : 'bg-teal-500'}`}
                            style={{ width: `${r.avgCompletion}%` }}
                          />
                        </div>
                        <span className="text-xs text-app-muted w-10 text-right">{r.avgCompletion.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-app-muted">Generando reporte...</div>
      ) : reports.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <FileText className="w-12 h-12 text-app-subtle mx-auto mb-3" />
          <p className="text-app-muted">No hay datos de proyectos para reportar</p>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-app-muted uppercase">Proyecto</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase">Total incurrido</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden sm:table-cell">Presupuesto</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-app-muted uppercase">% Avance</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">CxP</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-app-muted uppercase hidden lg:table-cell">Cash</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-app-border hover:bg-app-hover">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-app-text">{r.name}</p>
                    <p className="text-xs text-app-subtle">{r.code}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-app-muted text-right">{formatRD(r.totalIncurrido)}</td>
                  <td className="px-4 py-3 text-sm text-app-muted text-right hidden sm:table-cell">{formatRD(r.presupuesto)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-2 bg-app-chip rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${r.avance > 90 ? 'bg-red-500' : r.avance > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${r.avance}%` }}
                        />
                      </div>
                      <span className="text-xs text-app-muted w-10 text-right">{r.avance.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium text-right hidden md:table-cell">{formatRD(r.cxp)}</td>
                  <td className={`px-4 py-3 text-sm font-medium text-right hidden lg:table-cell ${r.cashDisponible >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatRD(r.cashDisponible)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-app-bg border-t-2 border-app-border">
                <td className="px-4 py-3 text-sm font-bold text-app-text">TOTALES</td>
                <td className="px-4 py-3 text-sm font-bold text-app-text text-right">{formatRD(totals.totalIncurrido)}</td>
                <td className="px-4 py-3 text-sm font-bold text-app-text text-right hidden sm:table-cell">{formatRD(totals.presupuesto)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-sm font-bold text-red-700 text-right hidden md:table-cell">{formatRD(totals.cxp)}</td>
                <td className={`px-4 py-3 text-sm font-bold text-right hidden lg:table-cell ${totals.cashDisponible >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatRD(totals.cashDisponible)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
