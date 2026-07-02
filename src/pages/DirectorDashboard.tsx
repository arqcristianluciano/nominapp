import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Building2, Download, TrendingDown, TrendingUp } from 'lucide-react'
import { directorService, type CompanyKPI, type ProjectKPI } from '@/services/directorService'
import { exportToExcel } from '@/utils/excelExport'
import { useToast } from '@/components/ui/Toast'
import { formatRD } from '@/utils/currency'
import { round2 } from '@/utils/money'
import { getErrorMessage } from '@/utils/errors'

function pctClass(pct: number): string {
  if (pct >= 100) return 'text-red-600'
  if (pct >= 80) return 'text-amber-600'
  return 'text-green-600'
}

export default function DirectorDashboard() {
  const [projects, setProjects] = useState<ProjectKPI[]>([])
  const [companies, setCompanies] = useState<CompanyKPI[]>([])
  const [loading, setLoading] = useState(true)
  const { success, error } = useToast()

  useEffect(() => {
    let cancelled = false
    Promise.all([directorService.getProjectKPIs(), directorService.getCompanyKPIs()])
      .then(([p, c]) => {
        if (cancelled) return
        setProjects(p)
        setCompanies(c)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const totalBudget = projects.reduce((s, p) => s + p.total_budget, 0)
  const totalActual = projects.reduce((s, p) => s + p.total_actual, 0)
  const totalVariance = totalActual - totalBudget
  const overallPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0

  async function handleExport() {
    try {
      await exportToExcel('dashboard_director', [
        {
          name: 'Por empresa',
          rows: companies.map((c) => ({
            Empresa: c.company_name,
            'Proyectos activos': c.active_projects,
            'Proyectos totales': c.projects_count,
            // Montos como números reales para que Excel los pueda sumar/ordenar.
            'Presupuesto total (DOP)': round2(c.total_budget),
            'Ejecutado (DOP)': round2(c.total_actual),
            'Desviación (DOP)': round2(c.variance),
            'Desviación %': round2(c.variance_pct),
          })),
        },
        {
          name: 'Por proyecto',
          rows: projects.map((p) => ({
            Proyecto: p.project_name,
            Código: p.project_code,
            Empresa: p.company_name,
            Estado: p.status,
            'Presupuesto (DOP)': round2(p.total_budget),
            'Ejecutado (DOP)': round2(p.total_actual),
            'Desviación (DOP)': round2(p.variance),
            'Desviación %': round2(p.variance_pct),
            'CxP pendiente': round2(p.cxp_pending),
            'Solicitudes pend.': p.pending_requisitions,
            'Items bajo mínimo': p.low_stock_items,
          })),
        },
      ])
      success('Exportado a Excel')
    } catch (err) {
      error(getErrorMessage(err) || 'No se pudo exportar')
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl font-bold text-app-text truncate">Dashboard Director General</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 px-3 py-2 border border-app-border text-app-muted rounded-lg text-sm hover:bg-app-hover w-full sm:w-auto min-h-[44px] sm:min-h-0"
          aria-label="Exportar datos a Excel"
        >
          <Download className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Cargando KPIs consolidados...</div>
      ) : (
        <>
          {/* KPIs globales */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiCard label="Empresas" value={String(companies.length)} icon={<Building2 className="w-4 h-4" />} />
            <KpiCard label="Proyectos activos" value={String(projects.filter((p) => p.status === 'active').length)} />
            <KpiCard label="Presupuesto total" value={formatRD(totalBudget)} />
            <KpiCard
              label="Ejecutado"
              value={formatRD(totalActual)}
              extra={
                <span className={`text-xs ${pctClass(overallPct)}`}>
                  {overallPct.toFixed(1)}% · {totalVariance >= 0 ? '+' : ''}
                  {formatRD(totalVariance)}
                </span>
              }
              icon={
                totalVariance >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                )
              }
            />
          </div>

          {/* Tabla por empresa */}
          <div>
            <h2 className="text-base font-semibold text-app-text mb-2">Por empresa</h2>
            {/* Desktop: tabla */}
            <div className="hidden md:block bg-app-surface border border-app-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-app-chip text-app-muted text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-right">Proyectos</th>
                    <th className="px-3 py-2 text-right">Presupuesto</th>
                    <th className="px-3 py-2 text-right">Ejecutado</th>
                    <th className="px-3 py-2 text-right">Desviación</th>
                    <th className="px-3 py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.company_id} className="border-t border-app-border">
                      <td className="px-3 py-2 font-medium">{c.company_name}</td>
                      <td className="px-3 py-2 text-right">
                        {c.active_projects} / {c.projects_count}
                      </td>
                      <td className="px-3 py-2 text-right">{formatRD(c.total_budget)}</td>
                      <td className="px-3 py-2 text-right">{formatRD(c.total_actual)}</td>
                      <td className={`px-3 py-2 text-right ${pctClass(c.variance_pct)}`}>
                        {c.variance >= 0 ? '+' : ''}
                        {formatRD(c.variance)}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${pctClass(c.variance_pct)}`}>
                        {c.variance_pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-2">
              {companies.map((c) => (
                <div key={c.company_id} className="bg-app-surface border border-app-border rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-app-text">{c.company_name}</div>
                    <span className={`text-sm font-semibold whitespace-nowrap ${pctClass(c.variance_pct)}`}>
                      {c.variance_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-app-muted">Proyectos</div>
                      <div className="font-medium">
                        {c.active_projects} / {c.projects_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-app-muted">Presupuesto</div>
                      <div className="font-medium">{formatRD(c.total_budget)}</div>
                    </div>
                    <div>
                      <div className="text-app-muted">Ejecutado</div>
                      <div className="font-medium">{formatRD(c.total_actual)}</div>
                    </div>
                    <div>
                      <div className="text-app-muted">Desviación</div>
                      <div className={`font-medium ${pctClass(c.variance_pct)}`}>
                        {c.variance >= 0 ? '+' : ''}
                        {formatRD(c.variance)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla por proyecto */}
          <div>
            <h2 className="text-base font-semibold text-app-text mb-2">Por proyecto</h2>
            {/* Desktop: tabla */}
            <div className="hidden md:block bg-app-surface border border-app-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-app-chip text-app-muted text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Proyecto</th>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-right">Presupuesto</th>
                    <th className="px-3 py-2 text-right">Ejecutado</th>
                    <th className="px-3 py-2 text-right">%</th>
                    <th className="px-3 py-2 text-right">CxP</th>
                    <th className="px-3 py-2 text-right">Solic.</th>
                    <th className="px-3 py-2 text-right">Stock bajo</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.project_id} className="border-t border-app-border hover:bg-app-hover">
                      <td className="px-3 py-2">
                        <Link to={`/proyectos/${p.project_id}`} className="text-blue-600 hover:underline font-medium">
                          {p.project_name}
                        </Link>
                        <span className="text-xs text-app-subtle ml-1">[{p.project_code}]</span>
                      </td>
                      <td className="px-3 py-2 text-app-muted text-xs">{p.company_name}</td>
                      <td className="px-3 py-2 text-right">{formatRD(p.total_budget)}</td>
                      <td className="px-3 py-2 text-right">{formatRD(p.total_actual)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${pctClass(p.variance_pct)}`}>
                        {p.variance_pct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right">{formatRD(p.cxp_pending)}</td>
                      <td className="px-3 py-2 text-right">{p.pending_requisitions}</td>
                      <td
                        className={`px-3 py-2 text-right ${
                          p.low_stock_items > 0 ? 'text-amber-600 font-semibold' : ''
                        }`}
                      >
                        {p.low_stock_items}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-2">
              {projects.map((p) => (
                <div key={p.project_id} className="bg-app-surface border border-app-border rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/proyectos/${p.project_id}`}
                        className="text-blue-600 hover:underline font-medium break-words"
                      >
                        {p.project_name}
                      </Link>
                      <div className="text-xs text-app-subtle">
                        [{p.project_code}] · {p.company_name}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap ${pctClass(p.variance_pct)}`}>
                      {p.variance_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-app-muted">Presupuesto</div>
                      <div className="font-medium">{formatRD(p.total_budget)}</div>
                    </div>
                    <div>
                      <div className="text-app-muted">Ejecutado</div>
                      <div className="font-medium">{formatRD(p.total_actual)}</div>
                    </div>
                    <div>
                      <div className="text-app-muted">CxP pendiente</div>
                      <div className="font-medium">{formatRD(p.cxp_pending)}</div>
                    </div>
                    <div>
                      <div className="text-app-muted">Solicitudes pend.</div>
                      <div className="font-medium">{p.pending_requisitions}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-app-muted">Items bajo mínimo</div>
                      <div className={`font-medium ${p.low_stock_items > 0 ? 'text-amber-600 font-semibold' : ''}`}>
                        {p.low_stock_items}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  extra,
  icon,
}: {
  label: string
  value: string
  extra?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-app-muted">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold text-app-text">{value}</p>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  )
}
