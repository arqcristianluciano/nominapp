import { useEffect, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'
import { useProjectStore } from '@/stores/projectStore'
import { dashboardService } from '@/services/dashboardService'
import { corteService, getProjectsProgress } from '@/services/cubicationService'
import type { AdjustmentContract, ContractCorte } from '@/types/database'

export interface DashboardActivity {
  id: string
  type: string
  description: string
  amount: number
  date: string
  projectId: string
}

export interface ProjectProgress {
  project_id: string
  avg_completion: number
  acordado: number
  acumulado: number
  contractor_count: number
}

export type PendingCorteItem = ContractCorte & { contract?: AdjustmentContract }

interface KpiTrend {
  investedPrev: number
  payrollsPrev: number
  cxpPrev: number
}

interface ProjectProgressSnapshot {
  avg_completion: number
  acordado: number
  acumulado: number
  contractor_count: number
}

function mapProjectProgress(data: Record<string, ProjectProgressSnapshot>) {
  const mapped: Record<string, ProjectProgress> = {}
  for (const [projectId, progress] of Object.entries(data)) {
    mapped[projectId] = {
      project_id: projectId,
      avg_completion: progress.avg_completion,
      acordado: progress.acordado,
      acumulado: progress.acumulado,
      contractor_count: progress.contractor_count,
    }
  }
  return mapped
}

export function useDashboardData() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const [totalInvested, setTotalInvested] = useState(0)
  const [payrollsThisMonth, setPayrollsThisMonth] = useState(0)
  const [cxpTotal, setCxpTotal] = useState(0)
  const [kpiTrend, setKpiTrend] = useState<KpiTrend | null>(null)
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ProjectProgress>>({})
  const [pendingCortes, setPendingCortes] = useState<PendingCorteItem[]>([])

  useEffect(() => {
    let cancelled = false

    async function run() {
      const [projectsResult, kpisResult, activityResult, progressResult, cortesResult] = await Promise.allSettled([
        fetchProjects(),
        dashboardService.getKPIs(),
        dashboardService.getRecentActivity(),
        getProjectsProgress(),
        corteService.getPendingApproved(),
      ])

      if (cancelled) return

      if (projectsResult.status === 'rejected') {
        console.error('[useDashboardData] fetchProjects fallo', projectsResult.reason)
        Sentry.captureException(projectsResult.reason, {
          tags: { area: 'useDashboardData', sub: 'fetchProjects' },
        })
      }

      if (kpisResult.status === 'fulfilled') {
        const kpis = kpisResult.value
        setTotalInvested(kpis.totalInvested)
        setPayrollsThisMonth(kpis.payrollsThisMonth)
        setCxpTotal(kpis.cxpTotal)
        setKpiTrend({
          investedPrev: kpis.prevInvested,
          payrollsPrev: kpis.prevPayrolls,
          cxpPrev: kpis.prevCxp,
        })
      } else {
        console.error('[useDashboardData] getKPIs fallo', kpisResult.reason)
        Sentry.captureException(kpisResult.reason, {
          tags: { area: 'useDashboardData', sub: 'getKPIs' },
        })
      }

      if (activityResult.status === 'fulfilled') {
        setActivities(activityResult.value)
      } else {
        console.error('[useDashboardData] getRecentActivity fallo', activityResult.reason)
        Sentry.captureException(activityResult.reason, {
          tags: { area: 'useDashboardData', sub: 'getRecentActivity' },
        })
      }

      if (progressResult.status === 'fulfilled') {
        setProgressMap(mapProjectProgress(progressResult.value))
      } else {
        console.error('[useDashboardData] getProjectsProgress fallo', progressResult.reason)
        Sentry.captureException(progressResult.reason, {
          tags: { area: 'useDashboardData', sub: 'getProjectsProgress' },
        })
      }

      if (cortesResult.status === 'fulfilled') {
        setPendingCortes(cortesResult.value)
      } else {
        console.error('[useDashboardData] getPendingApproved fallo', cortesResult.reason)
        Sentry.captureException(cortesResult.reason, {
          tags: { area: 'useDashboardData', sub: 'getPendingApproved' },
        })
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [fetchProjects])

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === 'active'),
    [projects],
  )

  return {
    loading,
    activeProjects,
    totalInvested,
    payrollsThisMonth,
    cxpTotal,
    kpiTrend,
    activities,
    progressMap,
    pendingCortes,
  }
}
