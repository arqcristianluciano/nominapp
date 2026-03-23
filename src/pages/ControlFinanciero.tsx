import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Filter, X } from 'lucide-react'
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

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projects.length) fetchProjects()
  }, [projects.length, fetchProjects])

  useEffect(() => {
    txns.load()
  }, [txns.load])

  if (!project) return <div className="text-sm text-gray-500">Cargando proyecto...</div>

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'diario', label: 'Libro Diario' },
    { key: 'cxp', label: `CxP (${formatRD(txns.totalCxP)})` },
    { key: 'cheques', label: 'Cheques y Efectivo' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/proyectos/${projectId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft className="w-4 h-4" /> {project.name}
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Control Financiero</h1>
        <p className="text-sm text-gray-500 mt-0.5">{project.name} · {project.code}</p>
      </div>

      <FinancialIndicators
        transitos={txns.transitos}
        cashDisponible={txns.cashDisponible}
        disponibleNeto={txns.disponibleNeto}
        totalIncurrido={txns.totalIncurrido}
      />

      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
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
        <div className="flex items-end gap-3 bg-gray-50 rounded-lg p-3">
          <div>
            <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Desde</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Hasta</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
          </div>
          <button onClick={handleApplyFilter} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Aplicar</button>
          {(txns.dateFrom || txns.dateTo) && (
            <button onClick={handleClearFilter} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">
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
            <div className="text-sm text-gray-500">Cargando transacciones...</div>
          ) : txns.transactions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No hay transacciones registradas</p>
              <button onClick={() => setShowAddForm(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                Registrar la primera transacción
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Fecha</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Cód.</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Descripción</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Proveedor</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Cant.</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Precio</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Total</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Condición</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Factura</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Cheque</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase hidden lg:table-cell">Banco</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase hidden lg:table-cell">Canje</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {txns.transactions.map((t) => (
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
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={6} className="px-2 py-2 text-xs font-semibold text-gray-700 text-right">Total:</td>
                    <td className="px-2 py-2 text-xs font-bold text-gray-900 text-right">
                      {formatRD(txns.transactions.reduce((sum, t) => sum + t.total, 0))}
                    </td>
                    <td colSpan={6}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'cxp' && (
        <CxPView transactions={txns.transactions} />
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
