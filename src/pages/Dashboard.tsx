import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, ClipboardList, CreditCard, DollarSign, FileText, Landmark, Scissors, TrendingUp, Building2 } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import { useDashboardData } from '@/hooks/useDashboardData'
import { StatCard } from '@/components/features/dashboard/StatCard'
import { ProjectCard } from '@/components/features/dashboard/ProjectCard'
import { QuickAction } from '@/components/features/dashboard/QuickAction'
import { EmptyProjects, ProjectsSkeleton } from '@/components/features/dashboard/ProjectsSkeleton'

export default function Dashboard() {
  const navigate = useNavigate()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const data = useDashboardData()

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const timeAgo = (dateStr: string) => {
    const minutes = Math.floor((nowMs - new Date(dateStr).getTime()) / 60000)
    if (minutes < 60) return `hace ${minutes}m`
    if (minutes < 1440) return `hace ${Math.floor(minutes / 60)}h`
    const days = Math.floor(minutes / 1440)
    return days === 1 ? 'ayer' : `hace ${days}d`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-app-text">Dashboard</h1>
        <p className="mt-0.5 text-sm text-app-muted">Vista general de tus proyectos de construcción</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Proyectos activos" value={String(data.activeProjects.length)} accent="blue" />
        <StatCard icon={DollarSign} label="Total invertido" value={formatRD(data.totalInvested)} accent="emerald" prev={data.kpiTrend?.investedPrev} />
        <StatCard icon={CreditCard} label="CxP pendientes" value={formatRD(data.cxpTotal)} accent="red" prev={data.kpiTrend?.cxpPrev} invertTrend />
        <StatCard icon={ClipboardList} label="Reportes este mes" value={String(data.payrollsThisMonth)} accent="amber" prev={data.kpiTrend?.payrollsPrev} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-app-text">Proyectos activos</h2>
            <Link to="/proyectos" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">Ver todos <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {data.loading ? <ProjectsSkeleton /> : data.activeProjects.length === 0 ? <EmptyProjects /> : (
            <div className="space-y-2.5">
              {data.activeProjects.slice(0, 4).map((project) => <ProjectCard key={project.id} project={project} progress={data.progressMap[project.id]} />)}
              {data.activeProjects.length > 4 && <Link to="/proyectos" className="block py-1 text-center text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">Ver {data.activeProjects.length - 4} más</Link>}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {data.pendingCortes.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-amber-200 bg-app-surface shadow-xs dark:border-amber-800/60">
              <h2 className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-app-text"><Scissors className="h-4 w-4 text-amber-500" /> Cortes por pagar <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{data.pendingCortes.length}</span></h2>
              <div className="divide-y divide-app-border">
                {data.pendingCortes.slice(0, 5).map((corte) => (
                  <Link key={corte.id} to={`/proyectos/${corte.contract?.project_id}/cubicaciones/${corte.contract_id}`} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-app-hover">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-app-text">Corte #{corte.cut_number} — {corte.contract?.contractor?.name}</p>
                      <p className="mt-0.5 text-[11px] text-app-muted">{new Date(corte.cut_date).toLocaleDateString('es-DO')}</p>
                    </div>
                    <span className="ml-2 shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-400">{formatRD(corte.amount - corte.retention_amount)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xs">
            <h2 className="px-4 py-3 text-base font-semibold text-app-text">Actividad reciente</h2>
            {data.activities.length === 0 ? (
              <div className="p-8 text-center"><TrendingUp className="mx-auto mb-2 h-8 w-8 text-app-subtle" /><p className="text-sm text-app-muted">Sin actividad reciente</p></div>
            ) : (
              <div className="divide-y divide-app-border">
                {data.activities.map((activity) => (
                  <div key={activity.id} className="px-4 py-3 transition-colors hover:bg-app-hover">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-app-text">{activity.description}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${activity.type === 'payroll' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-app-chip text-app-muted'}`}>{activity.type === 'payroll' ? 'Reporte' : 'Transacción'}</span>
                          <span className="text-[11px] text-app-subtle">{timeAgo(activity.date)}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-app-text">{formatRD(activity.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-app-text">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction icon={Landmark} label="Control financiero" sub="Libro diario" accent="blue" onClick={() => navigate('/finanzas')} />
          <QuickAction icon={BarChart3} label="Presupuesto" sub="vs Real" accent="purple" onClick={() => navigate('/presupuesto')} />
          <QuickAction icon={CreditCard} label="Cuentas x Pagar" sub="Por proyecto" accent="red" onClick={() => navigate('/cxp')} />
          <QuickAction icon={FileText} label="Reportes" sub="Resumen financiero" accent="emerald" onClick={() => navigate('/reportes')} />
        </div>
      </div>
    </div>
  )
}
