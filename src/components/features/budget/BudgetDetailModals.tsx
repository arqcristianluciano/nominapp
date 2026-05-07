import { BudgetAmountEditModal } from '@/components/features/budget/BudgetAmountEditModal'
import CopyPriceListModal from '@/components/features/budget/CopyPriceListModal'
import ExcelImportModal from '@/components/features/budget/ExcelImportModal'
import type { BudgetCategory, BudgetItem, PriceListItem, Project } from '@/types/database'

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
  onImport: (items: Omit<BudgetItem, 'id'>[]) => Promise<void>
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

      {showImport && (
        <ExcelImportModal
          categories={categories}
          onImport={onImport}
          onClose={onCloseImport}
        />
      )}
    </>
  )
}
