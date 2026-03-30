import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { useProjectStore } from '@/stores/projectStore'
import { useTransactions } from '@/hooks/useTransactions'
import { FinancialIndicators } from '@/components/features/control/FinancialIndicators'
import { TransactionInlineForm } from '@/components/features/control/TransactionInlineForm'
import { TransactionRow } from '@/components/features/control/TransactionRow'
import { CxPView } from '@/components/features/control/CxPView'
import { ChequesEfectivoView } from '@/components/features/control/ChequesEfectivoView'
import { formatRD } from '@/utils/currency'

type Tab = 'diario' | 'cxp' | 'cheques'

export default function ControlFinanciero() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const txns = useTransactions(projectId)
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
    txns.load()
  }, [txns.load])

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
  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return txns.transactions.slice(start, start + PAGE_SIZE)
  }, [txns.transactions, page, PAGE_SIZE])

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
        <div className="flex items-center gap-2">
          {activeTab === 'diario' && (
            <>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
              >
                <Filter className="w-3.5 h-3.5" /> Filtrar
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva transacción
              </button>
            </>
          )}
        </div>
      </div>

      {showFilter && activeTab === 'diario' && (
        <div className="flex items-end gap-3 bg-app-bg rounded-lg p-3">
          <div>
            <label className="text-[10px] font-medium text-app-muted mb-0.5 block">Desde</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="px-2 py-1.5 border border-app-border rounded text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-app-muted mb-0.5 block">Hasta</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="px-2 py-1.5 border border-app-border rounded text-xs" />
          </div>
          <button onClick={handleApplyFilter} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Aplicar</button>
          {(txns.dateFrom || txns.dateTo) && (
            <button onClick={handleClearFilter} className="flex items-center gap-1 px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover-strong">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
      )}

      {activeTab === 'diario' && (
        <>
          {showAddForm && (
            <TransactionInlineForm
              projectId={projectId!}
              budgetCategories={txns.budgetCategories}
              suppliers={txns.suppliers}
              onSubmit={txns.addTransaction}
              saving={txns.saving}
            />
          )}

          {txns.loading ? (
            <div className="text-sm text-app-muted">Cargando transacciones...</div>
          ) : txns.transactions.length === 0 ? (
            <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
              <p className="text-app-muted">No hay transacciones registradas</p>
              <button onClick={() => setShowAddForm(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                Registrar la primera transacción
              </button>
            </div>
          ) : (
            <div className="bg-app-surface rounded-xl border border-app-border overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="bg-app-bg border-b border-app-border">
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Cód.</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Descripción</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Proveedor</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Cant.</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Precio</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Total</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Condición</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Factura</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Cheque</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase hidden lg:table-cell">Banco</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-app-muted uppercase hidden lg:table-cell">Canje</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-app-muted uppercase w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTransactions.map((t) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      budgetCategories={txns.budgetCategories}
                      suppliers={txns.suppliers}
                      onUpdate={txns.updateTransaction}
                      onDelete={txns.deleteTransaction}
                      isCurrentMonth={isCurrentMonth(t.date)}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-app-bg border-t border-app-border">
                    <td colSpan={6} className="px-2 py-2 text-xs font-semibold text-app-muted text-right">
                      Total ({txns.transactions.length} transacciones):
                    </td>
                    <td className="px-2 py-2 text-xs font-bold text-app-text text-right">
                      {formatRD(txns.transactions.reduce((sum, t) => sum + t.total, 0))}
                    </td>
                    <td colSpan={6}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-app-surface rounded-xl border border-app-border">
              <span className="text-xs text-app-muted">
                Página {page} de {totalPages} — mostrando {Math.min(PAGE_SIZE, txns.transactions.length - (page - 1) * PAGE_SIZE)} de {txns.transactions.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-app-subtle hover:text-app-muted hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                        p === page ? 'bg-blue-600 text-white' : 'text-app-muted hover:bg-app-hover'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-app-subtle hover:text-app-muted hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
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
