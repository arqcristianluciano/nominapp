import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useProjectStore } from '@/stores/projectStore'
import {
  DashboardHeader,
  DashboardQuickActionsSection,
  DashboardStatsSection,
  DashboardProjectsSection,
} from '@/components/features/dashboard/DashboardSections'
import {
  DashboardPendingCortesSection,
  DashboardRecentActivitySection,
} from '@/components/features/dashboard/DashboardSideSections'
import { TendenciasSection } from '@/components/features/dashboard/TendenciasSection'

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const data = useDashboardData()
  const projectError = useProjectStore((state) => state.error)
  const fetchProjects = useProjectStore((state) => state.fetchProjects)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await fetchProjects()
    } finally {
      setRetrying(false)
    }
  }

  // Show error state when the initial load failed and we have no data to render.
  const hasNoData = data.activeProjects.length === 0
  if (projectError && !data.loading && hasNoData) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/30"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-app-text">{t('dashboard.error_title')}</h2>
            <p className="mt-1 text-sm text-app-muted">{projectError}</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="mt-1 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? t('dashboard.retrying') : t('dashboard.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardStatsSection
        activeProjectsCount={data.activeProjects.length}
        totalInvested={data.totalInvested}
        cxpTotal={data.cxpTotal}
        payrollsThisMonth={data.payrollsThisMonth}
        kpiTrend={data.kpiTrend}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardProjectsSection
          loading={data.loading}
          projects={data.activeProjects}
          progressMap={data.progressMap}
        />

        <div className="space-y-4">
          <DashboardPendingCortesSection pendingCortes={data.pendingCortes} />
          <DashboardRecentActivitySection activities={data.activities} nowMs={nowMs} />
        </div>
      </div>

      <TendenciasSection />

      <DashboardQuickActionsSection onNavigate={navigate} />
    </div>
  )
}
