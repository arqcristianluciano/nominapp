import { useParams } from 'react-router-dom'
import { useBudgetDetailPage } from '@/hooks/useBudgetDetailPage'
import { useToast } from '@/components/ui/Toast'
import type { BudgetCategory } from '@/types/database'
import { BudgetTabs } from '@/components/features/budget/BudgetTabs'
import { BudgetDetailModals } from '@/components/features/budget/BudgetDetailModals'
import { BudgetDetailHeader } from '@/components/features/budget/BudgetDetailSections'
import { BudgetDetailTabContent } from '@/components/features/budget/BudgetDetailTabContent'

export default function PresupuestoDetalle() {
  const { projectId } = useParams<{ projectId: string }>()
  const toast = useToast()
  const {
    projects,
    project,
    budget,
    budgetItems,
    tab,
    setTab,
    showImport,
    setShowImport,
    showCopyModal,
    setShowCopyModal,
    editingId,
    setEditingId,
    editValue,
    setEditValue,
    startEdit,
    saveEdit,
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
    handleDeleteCategory,
    handleAddPrice,
    handleUpdatePrice,
    handleDeletePrice,
    handleImport,
    emptyCategories,
    showEmptyModal,
    removingEmpty,
    openEmptyModal,
    confirmRemoveEmpty,
    cancelRemoveEmpty,
    undoRemove,
    grandBudgeted,
  } = useBudgetDetailPage(projectId)

  // Tras borrar partidas vacías, ofrecemos "Deshacer" en un aviso temporal que
  // las recrea con sus datos originales. Pasamos las filas borradas directamente
  // para no depender de estado que aún no se haya re-renderizado.
  const notifyDeleted = (rows: BudgetCategory[]) => {
    if (rows.length === 0) return
    toast.success(rows.length === 1 ? 'Partida vacía eliminada.' : `${rows.length} partidas vacías eliminadas.`, {
      action: { label: 'Deshacer', onClick: () => void undoRemove(rows) },
      durationMs: 8000,
    })
  }

  if (!project) return <div className="text-sm text-app-muted">Cargando proyecto...</div>

  return (
    <div className="space-y-5">
      <BudgetDetailHeader
        project={project}
        projectId={projectId!}
        tab={tab}
        onOpenImport={() => setShowImport(true)}
        emptyCount={emptyCategories.length}
        onCleanEmpty={openEmptyModal}
      />

      <BudgetTabs tab={tab} projectId={projectId!} priceCount={budgetItems.priceList.length} onChange={setTab} />

      <BudgetDetailTabContent
        tab={tab}
        projectId={projectId!}
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
        onDeleteCategory={async (categoryId) => {
          const removed = await handleDeleteCategory(categoryId)
          notifyDeleted(removed)
        }}
        onAddPrice={handleAddPrice}
        onUpdatePrice={handleUpdatePrice}
        onDeletePrice={handleDeletePrice}
        onReplicatePrices={() => setShowCopyModal(true)}
      />

      <BudgetDetailModals
        showCopyModal={showCopyModal && !!projectId && !!project}
        showImport={showImport}
        projectName={project.name}
        projects={projects}
        projectId={projectId!}
        priceList={budgetItems.priceList}
        categories={budget.rows.map((r) => r.category)}
        editingId={editingId}
        editValue={editValue}
        onEditValueChange={setEditValue}
        onSaveEdit={saveEdit}
        onCloseEdit={() => setEditingId(null)}
        onCloseCopyModal={() => setShowCopyModal(false)}
        onCopyPriceList={async (targetProjectId) => {
          await budgetItems.copyPriceListToProject(targetProjectId)
        }}
        onCloseImport={() => setShowImport(false)}
        onImport={async (payload) => {
          await handleImport(payload)
          setShowImport(false)
        }}
        showEmptyModal={showEmptyModal}
        emptyCategories={emptyCategories}
        removingEmpty={removingEmpty}
        onConfirmRemoveEmpty={async (ids) => {
          const removed = await confirmRemoveEmpty(ids)
          notifyDeleted(removed)
        }}
        onCancelRemoveEmpty={cancelRemoveEmpty}
      />

      {budget.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{budget.error}</div>
      )}
    </div>
  )
}
