import { useCallback, useEffect, useMemo, useState } from 'react'
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

export function useDashboardData() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const [totalInvested, setTotalInvested] = useState(0)
  const [payrollsThisMonth, setPayrollsThisMonth] = useState(0)
  const [cxpTotal, setCxpTotal] = useState(0)
  const [kpiTrend, setKpiTrend] = useState<KpiTrend | null>(null)
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ProjectProgress>>({})
  const [pendingCortes, setPendingCortes] = useState<PendingCorteItem[]>([])

  const loadProgress = useCallback(async () => {
    const data = await getProjectsProgress()
    const mapped: Record<string, ProjectProgress> = {}
    for (const [pid, progress] of Object.entries(data)) {
      mapped[pid] = {
        project_id: pid,
        avg_completion: progress.avg_completion,
        acordado: progress.acordado,
        acumulado: progress.acumulado,
        contractor_count: progress.contractor_count,
      }
    }
    setProgressMap(mapped)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      fetchProjects()
      try {
        const kpis = await dashboardService.getKPIs()
        if (cancelled) return
        setTotalInvested(kpis.totalInvested)
        setPayrollsThisMonth(kpis.payrollsThisMonth)
        setCxpTotal(kpis.cxpTotal)
        setKpiTrend({
          investedPrev: kpis.prevInvested,
          payrollsPrev: kpis.prevPayrolls,
          cxpPrev: kpis.prevCxp,
        })
      } catch (err) {
        console.error('Dashboard getKPIs failed', err)
      }

      try {
        const activity = await dashboardService.getRecentActivity()
        if (!cancelled) setActivities(activity)
      } catch (err) {
        console.error('Dashboard getRecentActivity failed', err)
      }

      try {
        if (!cancelled) await loadProgress()
      } catch (err) {
        console.error('Dashboard loadProgress failed', err)
      }

      try {
        const cortes = await corteService.getPendingApproved()
        if (!cancelled) setPendingCortes(cortes)
      } catch (err) {
        console.error('Dashboard getPendingApproved failed', err)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [fetchProjects, loadProgress])

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
