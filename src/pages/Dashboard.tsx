import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, DollarSign, CreditCard, ClipboardList, Plus, ArrowRight, Landmark, BarChart3, FileText } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { dashboardService } from '@/services/dashboardService'
import { supabase } from '@/lib/supabase'
import { formatRD } from '@/utils/currency'
import type { Project } from '@/types/database'

interface Activity {
  id: string
  type: string
  description: string
  amount: number
  date: string
  projectId: string
}

interface ProjectProgress {
  project_id: string
  avg_completion: number
  total_contracted: number
  total_advanced: number
  contractor_count: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { projects, loading, fetchProjects } = useProjectStore()
  const [totalInvested, setTotalInvested] = useState(0)
  const [payrollsThisMonth, setPayrollsThisMonth] = useState(0)
  const [cxpTotal, setCxpTotal] = useState(0)
  const [activities, setActivities] = useState<Activity[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ProjectProgress>>({})

  useEffect(() => {
    fetchProjects()
    dashboardService.getKPIs().then((kpis) => {
      setTotalInvested(kpis.totalInvested)
      setPayrollsThisMonth(kpis.payrollsThisMonth)
      setCxpTotal(kpis.cxpTotal)
    }).catch(() => {})
    dashboardService.getRecentActivity().then(setActivities).catch(() => {})
    loadProgress()
  }, [fetchProjects])

  async function loadProgress() {
    try {
      const { data } = await supabase
        .from('contract_cubications')
        .select('project_id, adjusted_budget, total_advanced, completion_percent')
      if (!data) return

      const grouped: Record<string, ProjectProgress> = {}
      for (const row of data as any[]) {
        if (!grouped[row.project_id]) {
          grouped[row.project_id] = { project_id: row.project_id, avg_completion: 0, total_contracted: 0, total_advanced: 0, contractor_count: 0 }
        }
        grouped[row.project_id].total_contracted += row.adjusted_budget || 0
        grouped[row.project_id].total_advanced += row.total_advanced || 0
        grouped[row.project_id].contractor_count += 1
      }

      for (const key of Object.keys(grouped)) {
        const g = grouped[key]
        g.avg_completion = g.total_contracted > 0
          ? Math.min((g.total_advanced / g.total_contracted) * 100, 100)
          : 0
      }
      setProgressMap(grouped)
    } catch {}
  }

  const activeProjects = projects.filter((p) => p.status === 'active')

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `hace ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'ayer'
    return `hace ${days}d`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-app-text">Dashboard</h1>
        <p className="text-sm text-app-muted mt-1">Vista general de tus proyectos de construcción</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Proyectos activos" value={activeProjects.length} color="blue" />
        <StatCard icon={DollarSign} label="Total invertido" value={formatRD(totalInvested)} color="emerald" />
        <StatCard icon={CreditCard} label="CxP pendientes" value={formatRD(cxpTotal)} color="red" />
        <StatCard icon={ClipboardList} label="Reportes este mes" value={payrollsThisMonth} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects with progress */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-app-text">Proyectos activos</h2>
            <Link to="/proyectos" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="text-sm text-app-muted">Cargando...</div>
          ) : activeProjects.length === 0 ? (
            <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
              <Building2 className="w-10 h-10 text-app-subtle mx-auto mb-3" />
              <p className="text-app-muted text-sm">No hay proyectos activos</p>
              <Link to="/proyectos" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium">
                Crear un proyecto
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProjects.slice(0, 4).map((project) => (
                <ProjectCard key={project.id} project={project} progress={progressMap[project.id]} />
              ))}
              {activeProjects.length > 4 && (
                <Link to="/proyectos" className="block text-center text-xs text-blue-600 hover:text-blue-800 font-medium py-1">
                  Ver {activeProjects.length - 4} más
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-medium text-app-text mb-3">Actividad reciente</h2>
          <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
            {activities.length === 0 ? (
              <div className="p-6 text-center text-sm text-app-muted">Sin actividad reciente</div>
            ) : (
              <div className="divide-y divide-app-border">
                {activities.map((act) => (
                  <div key={act.id} className="px-4 py-3 hover:bg-app-hover">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-app-text truncate">{act.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            act.type === 'payroll' ? 'bg-blue-50 text-blue-600' : 'bg-app-chip text-app-muted'
                          }`}>
                            {act.type === 'payroll' ? 'Reporte' : 'Transacción'}
                          </span>
                          <span className="text-[10px] text-app-subtle">{timeAgo(act.date)}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-app-muted shrink-0 ml-2">
                        {formatRD(act.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-app-text mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={Landmark} label="Control financiero" sub="Libro diario" color="blue" onClick={() => navigate('/finanzas')} />
          <QuickAction icon={BarChart3} label="Presupuesto" sub="vs Real" color="purple" onClick={() => navigate('/presupuesto')} />
          <QuickAction icon={CreditCard} label="Cuentas x Pagar" sub="Por proyecto" color="red" onClick={() => navigate('/cxp')} />
          <QuickAction icon={FileText} label="Reportes" sub="Resumen financiero" color="emerald" onClick={() => navigate('/reportes')} />
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ project, progress }: { project: Project; progress?: ProjectProgress }) {
  const pct = progress?.avg_completion ?? null

  function progressColor(p: number) {
    if (p >= 80) return 'bg-emerald-500'
    if (p >= 40) return 'bg-blue-500'
    return 'bg-amber-500'
  }

  return (
    <Link
      to={`/proyectos/${project.id}`}
      className="flex flex-col bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-app-text text-sm truncate">{project.name}</h3>
            <p className="text-xs text-app-muted truncate">{project.location || project.code}</p>
          </div>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          {pct !== null ? (
            <span className="text-sm font-semibold text-app-muted">{Math.round(pct)}%</span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">Activo</span>
          )}
          {progress && (
            <p className="text-[10px] text-app-subtle mt-0.5">{progress.contractor_count} contratos</p>
          )}
        </div>
      </div>

      {pct !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-app-subtle">Avance de obra</span>
            <span className="text-[10px] font-medium text-app-muted">{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 bg-app-chip rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColor(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xl font-semibold text-app-text">{value}</p>
          <p className="text-xs text-app-muted">{label}</p>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, sub, color, onClick }: {
  icon: React.ElementType; label: string; sub: string; color: string; onClick: () => void
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <button onClick={onClick} className="flex items-center gap-3 bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left w-full">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-app-text truncate">{label}</p>
        <p className="text-[10px] text-app-muted">{sub}</p>
      </div>
    </button>
  )
}
