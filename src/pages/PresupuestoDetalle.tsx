import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useBudgetDetail } from '@/hooks/useBudgetDetail'
import { useBudgetItems } from '@/hooks/useBudgetItems'
import { BudgetTabs } from '@/components/features/budget/BudgetTabs'
import { BudgetAmountEditModal } from '@/components/features/budget/BudgetAmountEditModal'
import { BudgetDetailHeader, BudgetPreciosTab, BudgetPresupuestoTab } from '@/components/features/budget/BudgetDetailSections'
import ExcelImportModal from '@/components/features/budget/ExcelImportModal'
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

  const { load: loadBudget } = budget
  const { loadItems } = budgetItems

  useEffect(() => {
    loadBudget()
  }, [loadBudget])

  useEffect(() => {
    if (categoryIds.length) loadItems(categoryIds)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget.rows.length, loadItems])

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
      <BudgetDetailHeader project={project} projectId={projectId!} tab={tab} onOpenImport={() => setShowImport(true)} />

      <BudgetTabs tab={tab} projectId={projectId!} priceCount={budgetItems.priceList.length} onChange={setTab} />

      {tab === 'presupuesto' && (
        <BudgetPresupuestoTab
          loading={budget.loading}
          rows={budget.rows}
          spentTotal={budget.totals.spent}
          budgetedTotal={grandBudgeted}
          itemsByCategory={budgetItems.itemsByCategory}
          priceList={budgetItems.priceList}
          onAddItem={handleAddItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onEditBudgetAmount={startEdit}
        />
      )}

      {tab === 'precios' && projectId && (
        <BudgetPreciosTab
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

      <BudgetAmountEditModal
        open={!!editingId}
        value={editValue}
        onChange={setEditValue}
        onSave={saveEdit}
        onClose={() => setEditingId(null)}
      />

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
