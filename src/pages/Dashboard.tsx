import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2, DollarSign, CreditCard, ClipboardList,
  ArrowRight, Landmark, BarChart3, FileText, Scissors, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { dashboardService } from '@/services/dashboardService'
import { getProjectsProgress, corteService } from '@/services/cubicationService'
import { formatRD } from '@/utils/currency'
import type { Project, ContractCorte, AdjustmentContract } from '@/types/database'

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
  acordado: number
  acumulado: number
  contractor_count: number
}

type PendingCorteItem = ContractCorte & { contract?: AdjustmentContract }

export default function Dashboard() {
  const navigate = useNavigate()
  const { projects, loading, fetchProjects } = useProjectStore()
  const [totalInvested, setTotalInvested] = useState(0)
  const [payrollsThisMonth, setPayrollsThisMonth] = useState(0)
  const [cxpTotal, setCxpTotal] = useState(0)
  const [kpiTrend, setKpiTrend] = useState<{ investedPrev: number; payrollsPrev: number; cxpPrev: number } | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ProjectProgress>>({})
  const [pendingCortes, setPendingCortes] = useState<PendingCorteItem[]>([])

  useEffect(() => {
    fetchProjects()
    dashboardService.getKPIs().then((kpis) => {
      setTotalInvested(kpis.totalInvested)
      setPayrollsThisMonth(kpis.payrollsThisMonth)
      setCxpTotal(kpis.cxpTotal)
      if ('prevInvested' in kpis) {
        setKpiTrend({ investedPrev: (kpis as any).prevInvested, payrollsPrev: (kpis as any).prevPayrolls, cxpPrev: (kpis as any).prevCxp })
      }
    }).catch(() => {})
    dashboardService.getRecentActivity().then(setActivities).catch(() => {})
    loadProgress()
    corteService.getPendingApproved().then(setPendingCortes).catch(() => {})
  }, [fetchProjects])

  async function loadProgress() {
    try {
      const data = await getProjectsProgress()
      const mapped: Record<string, ProjectProgress> = {}
      for (const [pid, g] of Object.entries(data)) {
        mapped[pid] = { project_id: pid, avg_completion: g.avg_completion, acordado: g.acordado, acumulado: g.acumulado, contractor_count: g.contractor_count }
      }
      setProgressMap(mapped)
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
        <h1 className="text-2xl font-bold text-app-text">Dashboard</h1>
        <p className="text-sm text-app-muted mt-0.5">Vista general de tus proyectos de construcción</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Proyectos activos"
          value={String(activeProjects.length)}
          accent="blue"
        />
        <StatCard
          icon={DollarSign}
          label="Total invertido"
          value={formatRD(totalInvested)}
          accent="emerald"
          prev={kpiTrend?.investedPrev}
        />
        <StatCard
          icon={CreditCard}
          label="CxP pendientes"
          value={formatRD(cxpTotal)}
          accent="red"
          prev={kpiTrend?.cxpPrev}
          invertTrend
        />
        <StatCard
          icon={ClipboardList}
          label="Reportes este mes"
          value={String(payrollsThisMonth)}
          accent="amber"
          prev={kpiTrend?.payrollsPrev}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-app-text">Proyectos activos</h2>
            <Link to="/proyectos" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 dark:text-blue-400">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <ProjectsSkeleton />
          ) : activeProjects.length === 0 ? (
            <EmptyProjects />
          ) : (
            <div className="space-y-2.5">
              {activeProjects.slice(0, 4).map((project) => (
                <ProjectCard key={project.id} project={project} progress={progressMap[project.id]} />
              ))}
              {activeProjects.length > 4 && (
                <Link to="/proyectos" className="block text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-1 dark:text-blue-400">
                  Ver {activeProjects.length - 4} proyecto{activeProjects.length - 4 !== 1 ? 's' : ''} más
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {pendingCortes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-app-text flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-500" />
                  Cortes por pagar
                  <span className="text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                    {pendingCortes.length}
                  </span>
                </h2>
              </div>
              <div className="bg-app-surface rounded-xl border border-amber-200 dark:border-amber-800/60 overflow-hidden shadow-xs">
                <div className="divide-y divide-app-border">
                  {pendingCortes.slice(0, 5).map((c) => {
                    const contract = c.contract as any
                    return (
                      <Link
                        key={c.id}
                        to={`/proyectos/${contract?.project_id}/cubicaciones/${c.contract_id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-app-hover transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-app-text">
                            Corte #{c.cut_number} — {contract?.contractor?.name}
                          </p>
                          <p className="text-[11px] text-app-muted mt-0.5">
                            {new Date(c.cut_date).toLocaleDateString('es-DO')}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0 ml-2">
                          {formatRD(c.amount - c.retention_amount)}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div>
            <h2 className="text-base font-semibold text-app-text mb-3">Actividad reciente</h2>
            <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
              {activities.length === 0 ? (
                <div className="p-8 text-center">
                  <TrendingUp className="w-8 h-8 text-app-subtle mx-auto mb-2" />
                  <p className="text-sm text-app-muted">Sin actividad reciente</p>
                </div>
              ) : (
                <div className="divide-y divide-app-border">
                  {activities.map((act) => (
                    <div key={act.id} className="px-4 py-3 hover:bg-app-hover transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-app-text truncate">{act.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                              act.type === 'payroll'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-app-chip text-app-muted'
                            }`}>
                              {act.type === 'payroll' ? 'Reporte' : 'Transacción'}
                            </span>
                            <span className="text-[11px] text-app-subtle">{timeAgo(act.date)}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-app-text shrink-0">
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
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-app-text mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={Landmark} label="Control financiero" sub="Libro diario" accent="blue" onClick={() => navigate('/finanzas')} />
          <QuickAction icon={BarChart3} label="Presupuesto" sub="vs Real" accent="purple" onClick={() => navigate('/presupuesto')} />
          <QuickAction icon={CreditCard} label="Cuentas x Pagar" sub="Por proyecto" accent="red" onClick={() => navigate('/cxp')} />
          <QuickAction icon={FileText} label="Reportes" sub="Resumen financiero" accent="emerald" onClick={() => navigate('/reportes')} />
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ACCENT_STYLES: Record<string, { card: string; icon: string; border: string }> = {
  blue:    { card: 'from-blue-500/10',    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300',    border: 'border-l-blue-500' },
  emerald: { card: 'from-emerald-500/10', icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300', border: 'border-l-emerald-500' },
  red:     { card: 'from-red-500/10',     icon: 'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300',         border: 'border-l-red-500' },
  amber:   { card: 'from-amber-500/10',   icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-300', border: 'border-l-amber-500' },
}

function StatCard({ icon: Icon, label, value, accent, prev, invertTrend }: {
  icon: React.ElementType; label: string; value: string; accent: string; prev?: number; invertTrend?: boolean
}) {
  const s = ACCENT_STYLES[accent]

  let trendEl: React.ReactNode = null
  if (prev !== undefined) {
    const current = parseFloat(value.replace(/[^0-9.]/g, ''))
    const isMonetary = value.startsWith('RD$') || value.includes(',')
    const change = prev === 0 ? null : ((current - prev) / Math.abs(prev)) * 100
    if (change !== null) {
      const isPositive = invertTrend ? change < 0 : change > 0
      const isNeutral = Math.abs(change) < 0.5
      const color = isNeutral ? 'text-app-muted' : isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
      const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
      trendEl = (
        <div className={`flex items-center gap-0.5 text-[11px] font-semibold mt-1 ${color}`}>
          <TrendIcon className="w-3 h-3" />
          <span>{Math.abs(change).toFixed(0)}% vs mes ant.</span>
        </div>
      )
      void isMonetary
    }
  }

  return (
    <div className={`bg-app-surface rounded-xl border border-app-border border-l-4 ${s.border} p-4 shadow-xs`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-app-muted mb-1.5">{label}</p>
          <p className="text-xl font-bold text-app-text truncate">{value}</p>
          {trendEl}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.icon}`}>
          <Icon className="w-4.5 h-4.5" />
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
      className="flex flex-col bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all dark:hover:border-blue-700"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-app-text text-sm truncate">{project.name}</h3>
            <p className="text-xs text-app-muted truncate">{project.location || project.code}</p>
          </div>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          {pct !== null ? (
            <span className="text-sm font-bold text-app-text">{Math.round(pct)}%</span>
          ) : (
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full">Activo</span>
          )}
          {progress && (
            <p className="text-[11px] text-app-subtle mt-0.5">
              {progress.contractor_count} {progress.contractor_count === 1 ? 'contrato' : 'contratos'}
            </p>
          )}
        </div>
      </div>

      {pct !== null && (
        <div className="mt-3">
          <div className="h-1.5 bg-app-chip rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColor(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-app-subtle">Avance de obra</span>
            <span className="text-[11px] font-semibold text-app-muted">{Math.round(pct)}%</span>
          </div>
        </div>
      )}
    </Link>
  )
}

function QuickAction({ icon: Icon, label, sub, accent, onClick }: {
  icon: React.ElementType; label: string; sub: string; accent: string; onClick: () => void
}) {
  const icons: Record<string, string> = {
    blue:    'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300',
    purple:  'bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-300',
    red:     'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300',
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-700 transition-all text-left w-full group"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${icons[accent]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-app-text truncate">{label}</p>
        <p className="text-[11px] text-app-muted">{sub}</p>
      </div>
    </button>
  )
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-app-surface rounded-xl border border-app-border p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-app-chip shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-app-chip rounded w-1/2" />
              <div className="h-2.5 bg-app-chip rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyProjects() {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center mx-auto mb-3">
        <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <p className="text-sm font-medium text-app-text mb-1">Sin proyectos activos</p>
      <p className="text-xs text-app-muted mb-4">Crea tu primer proyecto para empezar</p>
      <Link
        to="/proyectos"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Building2 className="w-3.5 h-3.5" />
        Ir a Proyectos
      </Link>
    </div>
  )
}
