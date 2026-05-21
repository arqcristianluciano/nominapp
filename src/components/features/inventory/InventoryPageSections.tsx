import { ArrowUpCircle, Package, Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import type { InventoryItem, InventoryMovement } from '@/services/inventoryService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { InventoryItemForm, InventoryMovementForm } from '@/components/features/inventory/InventoryForms'
import { InventoryMovementsTable, InventoryStockTable } from '@/components/features/inventory/InventoryTables'
import type { InventoryMovementFormState, InventoryTab } from '@/components/features/inventory/inventoryConfig'

export function InventoryPageHeader({
  projectId,
  projectName,
  onOpenMovement,
  onOpenItem,
}: {
  projectId: string
  projectName: string
  onOpenMovement: () => void
  onOpenItem: () => void
}) {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: projectName, to: `/proyectos/${projectId}` }, { label: 'Inventario' }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-2">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600 shrink-0" />
          <h1 className="text-lg sm:text-xl font-bold text-app-text">Inventario de Materiales</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            onClick={onOpenMovement}
            className="flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 border border-app-border text-app-muted rounded-lg text-sm hover:bg-app-hover transition-colors"
          >
            <ArrowUpCircle className="w-4 h-4" />
            Movimiento
          </button>
          <button
            onClick={onOpenItem}
            className="flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Material
          </button>
        </div>
      </div>
    </div>
  )
}

export function InventoryLoadingState() {
  return <div className="text-center py-8 text-app-muted text-sm">Cargando...</div>
}

type ItemFormState = {
  name: string
  unit: string
  current_stock: number
  min_stock: number
  unit_cost: number
  material_catalog_id: string | null
}

interface InventoryActionFormsSectionProps {
  showItemForm: boolean
  showMovementForm: boolean
  itemForm: ItemFormState
  movementForm: InventoryMovementFormState
  items: InventoryItem[]
  projectId: string
  saving: boolean
  onItemFormChange: (next: ItemFormState) => void
  onMovementFormChange: (next: InventoryMovementFormState) => void
  onCloseItemForm: () => void
  onCloseMovementForm: () => void
  onSaveItem: () => void
  onSaveMovement: () => void
}

export function InventoryActionFormsSection({
  showItemForm,
  showMovementForm,
  itemForm,
  movementForm,
  items,
  projectId,
  saving,
  onItemFormChange,
  onMovementFormChange,
  onCloseItemForm,
  onCloseMovementForm,
  onSaveItem,
  onSaveMovement,
}: InventoryActionFormsSectionProps) {
  return (
    <>
      {showItemForm && (
        <InventoryItemForm
          form={itemForm}
          saving={saving}
          onChange={onItemFormChange}
          onCancel={onCloseItemForm}
          onSave={onSaveItem}
        />
      )}

      {showMovementForm && (
        <InventoryMovementForm
          form={movementForm}
          items={items}
          projectId={projectId}
          saving={saving}
          onChange={onMovementFormChange}
          onCancel={onCloseMovementForm}
          onSave={onSaveMovement}
        />
      )}
    </>
  )
}

interface InventoryContentSectionProps {
  loading: boolean
  tab: InventoryTab
  items: InventoryItem[]
  movements: InventoryMovement[]
  onDeleteItem: (itemId: string) => void
}

export function InventoryContentSection({
  loading,
  tab,
  items,
  movements,
  onDeleteItem,
}: InventoryContentSectionProps) {
  if (loading) return <InventoryLoadingState />
  if (tab === 'stock') return <InventoryStockTable items={items} onDelete={onDeleteItem} />
  return <InventoryMovementsTable movements={movements} />
}

interface InventoryDeleteModalSectionProps {
  deleteId: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function InventoryDeleteModalSection({
  deleteId,
  onConfirm,
  onCancel,
}: InventoryDeleteModalSectionProps) {
  return (
    <ConfirmModal
      open={Boolean(deleteId)}
      title="Eliminar material"
      message="¿Eliminar este material del inventario? Se perderá el historial de movimientos."
      variant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
