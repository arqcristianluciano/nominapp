import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FileUp, ListOrdered } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { useProjectStore } from '@/stores/projectStore'
import { useBudgetDetail } from '@/hooks/useBudgetDetail'
import { useBudgetItems } from '@/hooks/useBudgetItems'
import { formatRD } from '@/utils/currency'
import BudgetPartidaRow from '@/components/features/budget/BudgetPartidaRow'
import ExcelImportModal from '@/components/features/budget/ExcelImportModal'
import PriceListPanel from '@/components/features/budget/PriceListPanel'
import CopyPriceListModal from '@/components/features/budget/CopyPriceListModal'
import type { BudgetItem } from '@/types/database'

type Tab = 'presupuesto' | 'precios'

export default function PresupuestoDetalle() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const budget = useBudgetDetail(projectId)
  const budgetItems = useBudgetItems(projectId)

  const [tab, setTab] = useState<Tab>('presupuesto')
  const [showImport, setShowImport] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const project = projects.find((p) => p.id === projectId)
  const categoryIds = budget.rows.map((r) => r.category.id)

  useEffect(() => {
    if (!projects.length) fetchProjects()
  }, [projects.length, fetchProjects])

  useEffect(() => {
    budget.load()
  }, [budget.load])

  useEffect(() => {
    if (categoryIds.length) budgetItems.loadItems(categoryIds)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget.rows.length, budgetItems.loadItems])

  const startEdit = useCallback((id: string, amount: number) => {
    setEditingId(id)
    setEditValue(amount.toString())
  }, [])

  const saveEdit = useCallback(async () => {
    if (editingId) {
      await budget.updateBudget(editingId, Number(editValue) || 0)
      setEditingId(null)
    }
  }, [editingId, editValue, budget])

  const handleAddItem = useCallback(async (data: Omit<BudgetItem, 'id'>) => {
    await budgetItems.addItem(data)
  }, [budgetItems])

  const handleUpdateItem = useCallback(async (id: string, categoryId: string, changes: Partial<Omit<BudgetItem, 'id'>>) => {
    await budgetItems.updateItem(id, categoryId, changes)
  }, [budgetItems])

  const handleDeleteItem = useCallback(async (id: string, categoryId: string) => {
    await budgetItems.deleteItem(id, categoryId)
  }, [budgetItems])

  const grandBudgeted = budget.rows.reduce((sum, row) => {
    const hasItems = (budgetItems.itemsByCategory[row.category.id] ?? []).length > 0
    return sum + (hasItems ? budgetItems.getCategoryTotal(row.category.id) : row.budgeted)
  }, 0)

  if (!project) return <div className="text-sm text-app-muted">Cargando proyecto...</div>

  return (
    <div className="space-y-5">
      <div>
        <Breadcrumb items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: project.name, to: `/proyectos/${projectId}` },
          { label: 'Presupuesto' },
        ]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-app-text">Presupuesto</h1>
            <p className="text-sm text-app-muted mt-0.5">{project.name} · {project.code}</p>
          </div>
          {tab === 'presupuesto' && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
            >
              <FileUp className="w-3.5 h-3.5" /> Importar Excel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-app-chip rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('presupuesto')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'presupuesto' ? 'bg-app-surface text-app-text shadow-sm' : 'text-app-muted hover:text-app-muted'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" /> Presupuesto
        </button>
        <button
          onClick={() => setTab('precios')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'precios' ? 'bg-app-surface text-app-text shadow-sm' : 'text-app-muted hover:text-app-muted'
          }`}
        >
          Lista de precios
          <span className="text-[10px] text-app-subtle">({budgetItems.priceList.length})</span>
        </button>
      </div>

      {tab === 'presupuesto' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-app-surface rounded-xl border border-app-border p-4">
              <p className="text-xs text-app-muted">Total gastado</p>
              <p className="text-2xl font-semibold text-app-text mt-1">{formatRD(budget.totals.spent)}</p>
            </div>
            <div className="bg-app-surface rounded-xl border border-app-border p-4">
              <p className="text-xs text-app-muted">Presupuesto total</p>
              <p className="text-2xl font-semibold text-app-text mt-1">{formatRD(grandBudgeted)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${grandBudgeted - budget.totals.spent < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-xs text-app-muted">Diferencia</p>
              <p className={`text-2xl font-semibold mt-1 ${grandBudgeted - budget.totals.spent < 0 ? 'text-red-700' : 'text-green-700'}`}>
                {formatRD(grandBudgeted - budget.totals.spent)}
              </p>
            </div>
          </div>

          {/* Tabla jerárquica */}
          {budget.loading ? (
            <div className="text-sm text-app-muted">Cargando presupuesto...</div>
          ) : (
            <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-app-bg border-b border-app-border">
                    <th className="px-3 py-2 w-8" />
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Partida / Subpartida</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Gastado</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Presupuesto</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Diferencia</th>
                    <th className="px-3 py-2 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {budget.rows.map((row) => (
                    <BudgetPartidaRow
                      key={row.category.id}
                      category={row.category}
                      items={budgetItems.itemsByCategory[row.category.id] ?? []}
                      spent={row.spent}
                      priceList={budgetItems.priceList}
                      onAddItem={handleAddItem}
                      onUpdateItem={(id, changes) => handleUpdateItem(id, row.category.id, changes)}
                      onDeleteItem={(id) => handleDeleteItem(id, row.category.id)}
                      onEditBudgetAmount={() => startEdit(row.category.id, row.budgeted)}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-app-bg border-t-2 border-app-border">
                    <td colSpan={2} className="px-3 py-3 text-xs font-bold text-app-text pl-11">TOTAL</td>
                    <td className="px-3 py-3 text-xs font-bold text-app-text text-right">{formatRD(budget.totals.spent)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-app-text text-right">{formatRD(grandBudgeted)}</td>
                    <td className={`px-3 py-3 text-xs font-bold text-right ${grandBudgeted - budget.totals.spent < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatRD(grandBudgeted - budget.totals.spent)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'precios' && projectId && (
        <PriceListPanel
          projectId={projectId}
          items={budgetItems.priceList}
          onAdd={async (item) => { await budgetItems.addPriceListItem(item) }}
          onUpdate={async (id, changes) => { await budgetItems.updatePriceListItem(id, changes) }}
          onDelete={async (id) => { await budgetItems.deletePriceListItem(id) }}
          onReplicate={() => setShowCopyModal(true)}
        />
      )}

      {showCopyModal && projectId && project && (
        <CopyPriceListModal
          sourceProjectName={project.name}
          projects={projects}
          currentProjectId={projectId}
          itemCount={budgetItems.priceList.length}
          onConfirm={async (targetId) => { await budgetItems.copyPriceListToProject(targetId) }}
          onClose={() => setShowCopyModal(false)}
        />
      )}

      {/* Modal edición monto directo (sin subpartidas) */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-app-surface rounded-xl shadow-xl p-5 w-72 space-y-3">
            <p className="text-sm font-semibold text-app-text">Editar monto presupuestado</p>
            <input
              type="number" step="any" autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm text-right focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[10px] text-app-subtle">O agrega subpartidas para que el total se calcule automáticamente.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover">Cancelar</button>
              <button onClick={saveEdit} className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ExcelImportModal
          categories={budget.rows.map((r) => r.category)}
          onImport={async (items) => {
            await budgetItems.bulkImport(items)
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {budget.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{budget.error}</div>
      )}
    </div>
  )
}
