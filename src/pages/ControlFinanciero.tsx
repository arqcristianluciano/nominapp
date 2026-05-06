import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { useProjectStore } from '@/stores/projectStore'
import { useTransactions } from '@/hooks/useTransactions'
import { FinancialIndicators } from '@/components/features/control/FinancialIndicators'
import { CxPView } from '@/components/features/control/CxPView'
import { ChequesEfectivoView } from '@/components/features/control/ChequesEfectivoView'
import { DiarioTab } from '@/components/features/control/DiarioTab'
import { formatRD } from '@/utils/currency'

type Tab = 'diario' | 'cxp' | 'cheques'

export default function ControlFinanciero() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const txns = useTransactions(projectId)
  const loadTransactions = txns.load
  const [activeTab, setActiveTab] = useState<Tab>('diario')
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'diario', label: 'Libro Diario' },
    { key: 'cxp', label: `CxP (${formatRD(txns.totalCxP)})` },
    { key: 'cheques', label: 'Cheques y Efectivo' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <Breadcrumb items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: project.name, to: `/proyectos/${projectId}` },
          { label: 'Control Financiero' },
        ]} />
        <h1 className="text-2xl font-bold text-app-text">Control Financiero</h1>
        <p className="text-sm text-app-muted mt-0.5">{project.name} · {project.code}</p>
      </div>

      <FinancialIndicators
        transitos={txns.transitos}
        cashDisponible={txns.cashDisponible}
        disponibleNeto={txns.disponibleNeto}
        totalIncurrido={txns.totalIncurrido}
      />

      <div className="flex items-center justify-between border-b border-app-border">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-app-muted hover:text-app-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-xs">
            <span className="text-app-muted">Aquí solo ves este proyecto. Para filtrar o comparar otras obras abre el consolidado:</span>
            <Link
              to={`/cxp/${projectId}`}
              className="font-medium text-blue-600 hover:underline shrink-0"
            >
              Cuentas por Pagar (filtrar por proyecto)
            </Link>
          </div>
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
