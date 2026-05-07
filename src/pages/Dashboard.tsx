import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardData } from '@/hooks/useDashboardData'
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const data = useDashboardData()

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

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

      <DashboardQuickActionsSection onNavigate={navigate} />
    </div>
  )
}
