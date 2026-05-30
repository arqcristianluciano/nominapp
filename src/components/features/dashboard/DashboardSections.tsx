import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  {
    icon: Landmark,
    labelKey: 'dashboard.quick_actions.finance_label',
    subKey: 'dashboard.quick_actions.finance_sub',
    accent: 'blue',
    path: '/finanzas',
  },
  {
    icon: BarChart3,
    labelKey: 'dashboard.quick_actions.budget_label',
    subKey: 'dashboard.quick_actions.budget_sub',
    accent: 'purple',
    path: '/presupuesto',
  },
  {
    icon: CreditCard,
    labelKey: 'dashboard.quick_actions.cxp_label',
    subKey: 'dashboard.quick_actions.cxp_sub',
    accent: 'red',
    path: '/cxp',
  },
  {
    icon: FileText,
    labelKey: 'dashboard.quick_actions.reports_label',
    subKey: 'dashboard.quick_actions.reports_sub',
    accent: 'emerald',
    path: '/reportes',
  },
] as const

export function DashboardHeader() {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-2xl font-bold text-app-text">{t('dashboard.title')}</h1>
      <p className="mt-0.5 text-sm text-app-muted">{t('dashboard.subtitle')}</p>
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
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={Building2}
        label={t('dashboard.stats.active_projects')}
        value={String(activeProjectsCount)}
        accent="blue"
      />
      <StatCard
        icon={DollarSign}
        label={t('dashboard.stats.total_invested')}
        value={formatRD(totalInvested)}
        accent="emerald"
        prev={kpiTrend?.investedPrev}
      />
      <StatCard
        icon={CreditCard}
        label={t('dashboard.stats.cxp_pending')}
        value={formatRD(cxpTotal)}
        accent="red"
        prev={kpiTrend?.cxpPrev}
        invertTrend
      />
      <StatCard
        icon={ClipboardList}
        label={t('dashboard.stats.reports_this_month')}
        value={String(payrollsThisMonth)}
        accent="amber"
        prev={kpiTrend?.payrollsPrev}
      />
    </div>
  )
}

export function DashboardProjectsSection({ loading, projects, progressMap }: DashboardProjectsSectionProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-app-text">{t('dashboard.projects.section_title')}</h2>
        <Link
          to="/proyectos"
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          {t('dashboard.projects.view_all')} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {loading && projects.length === 0 ? (
        <ProjectsSkeleton />
      ) : projects.length === 0 ? (
        <EmptyProjects />
      ) : (
        <div className="space-y-2.5">
          {projects.slice(0, 4).map((project) => (
            <ProjectCard key={project.id} project={project} progress={progressMap[project.id]} />
          ))}
          {projects.length > 4 && (
            <Link
              to="/proyectos"
              className="block py-1 text-center text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {t('dashboard.projects.view_more', { count: projects.length - 4 })}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export function DashboardQuickActionsSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-app-text">{t('dashboard.quick_actions.section_title')}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <QuickAction
            key={action.path}
            icon={action.icon}
            label={t(action.labelKey)}
            sub={t(action.subKey)}
            accent={action.accent}
            onClick={() => onNavigate(action.path)}
          />
        ))}
      </div>
    </div>
  )
}
