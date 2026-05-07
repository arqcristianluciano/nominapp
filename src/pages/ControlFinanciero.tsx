import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useTransactions } from '@/hooks/useTransactions'
import { FinancialIndicators } from '@/components/features/control/FinancialIndicators'
import { CxPView } from '@/components/features/control/CxPView'
import { ChequesEfectivoView } from '@/components/features/control/ChequesEfectivoView'
import { DiarioTab } from '@/components/features/control/DiarioTab'
import {
  ControlFinancieroCxpNotice,
  ControlFinancieroHeader,
  ControlFinancieroTabBar,
  type ControlTab,
} from '@/components/features/control/ControlFinancieroSections'

export default function ControlFinanciero() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const txns = useTransactions(projectId)
  const loadTransactions = txns.load
  const [activeTab, setActiveTab] = useState<ControlTab>('diario')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 30

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projects.length) fetchProjects()
  }, [projects.length, fetchProjects])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return txns.transactions.slice(start, start + PAGE_SIZE)
  }, [txns.transactions, page])

  if (!project) return <div className="text-sm text-app-muted">Cargando proyecto...</div>

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const isCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }

  const handleApplyFilter = () => {
    txns.applyDateFilter(filterFrom, filterTo)
  }

  const handleClearFilter = () => {
    setFilterFrom('')
    setFilterTo('')
    txns.clearDateFilter()
  }

  const totalPages = Math.max(1, Math.ceil(txns.transactions.length / PAGE_SIZE))

  return (
    <div className="space-y-5">
      <ControlFinancieroHeader project={project} projectId={projectId!} />

      <FinancialIndicators
        transitos={txns.transitos}
        cashDisponible={txns.cashDisponible}
        disponibleNeto={txns.disponibleNeto}
        totalIncurrido={txns.totalIncurrido}
      />

      <ControlFinancieroTabBar activeTab={activeTab} totalCxP={txns.totalCxP} onChange={setActiveTab} />

      {activeTab === 'diario' && (
        <DiarioTab
          projectId={projectId!}
          txns={txns}
          showAddForm={showAddForm}
          showFilter={showFilter}
          filterFrom={filterFrom}
          filterTo={filterTo}
          page={page}
          pageSize={PAGE_SIZE}
          pagedTransactions={pagedTransactions}
          totalPages={totalPages}
          onToggleAdd={() => setShowAddForm((value) => !value)}
          onToggleFilter={() => setShowFilter((value) => !value)}
          onFilterFrom={setFilterFrom}
          onFilterTo={setFilterTo}
          onApplyFilter={handleApplyFilter}
          onClearFilter={handleClearFilter}
          onPage={setPage}
          isCurrentMonth={isCurrentMonth}
        />
      )}

      {activeTab === 'cxp' && (
        <div className="space-y-3">
          <ControlFinancieroCxpNotice projectId={projectId!} />
          <CxPView transactions={txns.transactions} />
        </div>
      )}

      {activeTab === 'cheques' && (
        <ChequesEfectivoView
          transactions={txns.transactions}
          transitos={txns.transitos}
          cashDisponible={txns.cashDisponible}
        />
      )}

      {txns.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {txns.error}
        </div>
      )}
    </div>
  )
}
