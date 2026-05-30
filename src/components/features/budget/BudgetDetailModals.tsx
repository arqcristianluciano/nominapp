import { BudgetAmountEditModal } from '@/components/features/budget/BudgetAmountEditModal'
import CopyPriceListModal from '@/components/features/budget/CopyPriceListModal'
import ExcelImportModal, { type ImportPayload } from '@/components/features/budget/ExcelImportModal'
import { DeleteEmptyCategoriesModal } from '@/components/features/budget/DeleteEmptyCategoriesModal'
import type { BudgetCategory, PriceListItem, Project } from '@/types/database'

export function BudgetDetailModals({
  showCopyModal,
  showImport,
  projectName,
  projects,
  projectId,
  priceList,
  categories,
  editingId,
  editValue,
  onEditValueChange,
  onSaveEdit,
  onCloseEdit,
  onCloseCopyModal,
  onCopyPriceList,
  onCloseImport,
  onImport,
  emptyCategories,
  removingEmpty,
  onConfirmRemoveEmpty,
  onCancelRemoveEmpty,
}: {
  showCopyModal: boolean
  showImport: boolean
  projectName: string
  projects: Project[]
  projectId: string
  priceList: PriceListItem[]
  categories: BudgetCategory[]
  editingId: string | null
  editValue: string
  onEditValueChange: (value: string) => void
  onSaveEdit: () => Promise<void>
  onCloseEdit: () => void
  onCloseCopyModal: () => void
  onCopyPriceList: (targetProjectId: string) => Promise<void>
  onCloseImport: () => void
  onImport: (payload: ImportPayload) => Promise<void>
  emptyCategories: BudgetCategory[]
  removingEmpty: boolean
  onConfirmRemoveEmpty: () => void
  onCancelRemoveEmpty: () => void
}) {
  return (
    <>
      {showCopyModal && (
        <CopyPriceListModal
          sourceProjectName={projectName}
          projects={projects}
          currentProjectId={projectId}
          itemCount={priceList.length}
          onConfirm={onCopyPriceList}
          onClose={onCloseCopyModal}
        />
      )}

      <BudgetAmountEditModal
        open={!!editingId}
        value={editValue}
        onChange={onEditValueChange}
        onSave={onSaveEdit}
        onClose={onCloseEdit}
      />

      {showImport && <ExcelImportModal categories={categories} onImport={onImport} onClose={onCloseImport} />}

      <DeleteEmptyCategoriesModal
        categories={emptyCategories}
        loading={removingEmpty}
        onConfirm={onConfirmRemoveEmpty}
        onCancel={onCancelRemoveEmpty}
      />
    </>
  )
}
