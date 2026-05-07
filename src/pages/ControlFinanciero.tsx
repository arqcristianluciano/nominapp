import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { ControlFinancieroTabContent } from '@/components/features/control/ControlFinancieroTabContent'
import { useTransactions } from '@/hooks/useTransactions'
import { useControlFinancieroState } from '@/hooks/useControlFinancieroState'
import { FinancialIndicators } from '@/components/features/control/FinancialIndicators'
import {
  ControlFinancieroHeader,
  ControlFinancieroTabBar,
} from '@/components/features/control/ControlFinancieroSections'

export default function ControlFinanciero() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const txns = useTransactions(projectId)
  const loadTransactions = txns.load
  const controlState = useControlFinancieroState({
    transactions: txns.transactions,
    applyDateFilter: txns.applyDateFilter,
    clearDateFilter: txns.clearDateFilter,
  })

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projects.length) fetchProjects()
  }, [projects.length, fetchProjects])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  if (!project) return <div className="text-sm text-app-muted">Cargando proyecto...</div>

  return (
    <div className="space-y-5">
      <ControlFinancieroHeader project={project} projectId={projectId!} />

      <FinancialIndicators
        transitos={txns.transitos}
        cashDisponible={txns.cashDisponible}
        disponibleNeto={txns.disponibleNeto}
        totalIncurrido={txns.totalIncurrido}
      />

      <ControlFinancieroTabBar
        activeTab={controlState.activeTab}
        totalCxP={txns.totalCxP}
        onChange={controlState.setActiveTab}
      />

      <ControlFinancieroTabContent
        projectId={projectId!}
        txns={txns}
        controlState={controlState}
      />

      {txns.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {txns.error}
        </div>
      )}
    </div>
  )
}
