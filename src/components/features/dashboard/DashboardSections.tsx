import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Landmark,
} from 'lucide-react'
import { formatRD } from '@/utils/currency'
import { StatCard } from '@/components/features/dashboard/StatCard'
import { ProjectCard } from '@/components/features/dashboard/ProjectCard'
import { QuickAction } from '@/components/features/dashboard/QuickAction'
import { EmptyProjects, ProjectsSkeleton } from '@/components/features/dashboard/ProjectsSkeleton'
import type { ProjectProgress } from '@/hooks/useDashboardData'
import type { Project } from '@/types/database'

interface DashboardStatsSectionProps {
  activeProjectsCount: number
  totalInvested: number
  cxpTotal: number
  payrollsThisMonth: number
  kpiTrend: {
    investedPrev: number
    payrollsPrev: number
    cxpPrev: number
  } | null
}

interface DashboardProjectsSectionProps {
  loading: boolean
  projects: Project[]
  progressMap: Record<string, ProjectProgress>
}

const QUICK_ACTIONS = [
  { icon: Landmark, label: 'Control financiero', sub: 'Libro diario', accent: 'blue', path: '/finanzas' },
  { icon: BarChart3, label: 'Presupuesto', sub: 'vs Real', accent: 'purple', path: '/presupuesto' },
  { icon: CreditCard, label: 'Cuentas x Pagar', sub: 'Por proyecto', accent: 'red', path: '/cxp' },
  { icon: FileText, label: 'Reportes', sub: 'Resumen financiero', accent: 'emerald', path: '/reportes' },
] as const

export function DashboardHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-app-text">Dashboard</h1>
      <p className="mt-0.5 text-sm text-app-muted">Vista general de tus proyectos de construcción</p>
    </div>
  )
}

export function DashboardStatsSection({
  activeProjectsCount,
  totalInvested,
  cxpTotal,
  payrollsThisMonth,
  kpiTrend,
}: DashboardStatsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Building2} label="Proyectos activos" value={String(activeProjectsCount)} accent="blue" />
      <StatCard icon={DollarSign} label="Total invertido" value={formatRD(totalInvested)} accent="emerald" prev={kpiTrend?.investedPrev} />
      <StatCard icon={CreditCard} label="CxP pendientes" value={formatRD(cxpTotal)} accent="red" prev={kpiTrend?.cxpPrev} invertTrend />
      <StatCard icon={ClipboardList} label="Reportes este mes" value={String(payrollsThisMonth)} accent="amber" prev={kpiTrend?.payrollsPrev} />
    </div>
  )
}

export function DashboardProjectsSection({
  loading,
  projects,
  progressMap,
}: DashboardProjectsSectionProps) {
  return (
    <div className="space-y-3 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-app-text">Proyectos activos</h2>
        <Link to="/proyectos" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {loading && projects.length === 0 ? <ProjectsSkeleton /> : projects.length === 0 ? <EmptyProjects /> : (
        <div className="space-y-2.5">
          {projects.slice(0, 4).map((project) => (
            <ProjectCard key={project.id} project={project} progress={progressMap[project.id]} />
          ))}
          {projects.length > 4 && (
            <Link to="/proyectos" className="block py-1 text-center text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Ver {projects.length - 4} más
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export function DashboardQuickActionsSection({
  onNavigate,
}: {
  onNavigate: (path: string) => void
}) {
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-app-text">Accesos rápidos</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <QuickAction
            key={action.path}
            icon={action.icon}
            label={action.label}
            sub={action.sub}
            accent={action.accent}
            onClick={() => onNavigate(action.path)}
          />
        ))}
      </div>
    </div>
  )
}
