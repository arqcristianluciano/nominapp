import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import {
  inventoryService,
  InventoryError,
  type InventoryItem,
  type InventoryMovement,
} from '@/services/inventoryService'
import { getErrorMessage } from '@/utils/errors'
import { lotService, type InventoryLotWithItem } from '@/services/lotService'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/stores/authStore'
import { InventoryLowStockAlert } from '@/components/features/inventory/InventoryLowStockAlert'
import {
  InventoryActionFormsSection,
  InventoryContentSection,
  InventoryDeleteModalSection,
  InventoryPageHeader,
} from '@/components/features/inventory/InventoryPageSections'
import { InventoryTabs } from '@/components/features/inventory/InventoryTabs'
import {
  EMPTY_ITEM_FORM,
  EMPTY_MOVEMENT_FORM,
  type InventoryMovementFormState,
  type InventoryTab,
} from '@/components/features/inventory/inventoryConfig'
import { StockOverrideModal } from '@/components/features/inventory/StockOverrideModal'
import { useProjectRoles } from '@/hooks/useProjectRoles'

export default function InventarioPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const roles = useProjectRoles(projectId)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [lots, setLots] = useState<InventoryLotWithItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<InventoryTab>('stock')
  const [showItemForm, setShowItemForm] = useState(false)
  const [showMovForm, setShowMovForm] = useState(false)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM)
  const [movForm, setMovForm] = useState(EMPTY_MOVEMENT_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [its, movs, lts] = await Promise.all([
        inventoryService.getItems(projectId!),
        inventoryService.getMovements(projectId!),
        lotService.listByProject(projectId!),
      ])
      setItems(its)
      setMovements(movs)
      setLots(lts)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const lowStock = useMemo(() => inventoryService.getLowStockItems(items), [items])
  const projectName = project?.name ?? 'Proyecto'
  const { success, error: toastError } = useToast()
  const user = useAuthStore((s) => s.user)
  const handleMovementFormChange = useCallback((next: InventoryMovementFormState) => {
    setMovForm(next)
  }, [])

  async function handleAddItem() {
    if (!itemForm.name.trim()) return
    setSaving(true)
    try {
      await inventoryService.createItem({ ...itemForm, project_id: projectId! })
      setShowItemForm(false)
      setItemForm(EMPTY_ITEM_FORM)
      await loadAll()
    } finally {
      setSaving(false)
    }
  }

  async function performAddMovement(override?: { motivo: string }) {
    await inventoryService.addMovement({
      item_id: movForm.item_id,
      project_id: projectId!,
      type: movForm.type,
      quantity: movForm.quantity,
      date: movForm.date,
      notes: movForm.notes ?? null,
      supplier_id: movForm.supplier_id ?? null,
      budget_category_id: movForm.budget_category_id ?? null,
      budget_item_id: movForm.budget_item_id ?? null,
      purchase_order_id: movForm.purchase_order_id ?? null,
      unit_cost: movForm.unit_cost ?? null,
      created_by: user?.displayName ?? null,
      override: override ? { motivo: override.motivo, actor: user?.displayName ?? 'desconocido' } : null,
    })
  }

  async function handleAddMovement() {
    if (!movForm.item_id) return
    setSaving(true)
    try {
      await performAddMovement()
      setShowMovForm(false)
      setMovForm(EMPTY_MOVEMENT_FORM)
      success('Movimiento registrado')
      await loadAll()
    } catch (e) {
      if (e instanceof InventoryError) {
        if (e.code === 'INSUFFICIENT_STOCK' && roles.canOverrideStock) {
          setOverrideOpen(true)
          return
        }
        toastError(e.message)
      } else {
        toastError('No se pudo registrar el movimiento')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmOverride(motivo: string) {
    setSaving(true)
    try {
      await performAddMovement({ motivo })
      setShowMovForm(false)
      setOverrideOpen(false)
      setMovForm(EMPTY_MOVEMENT_FORM)
      success('Salida registrada con override del Director')
      await loadAll()
    } finally {
      setSaving(false)
    }
  }

  const overrideContext = (() => {
    const item = items.find((it) => it.id === movForm.item_id)
    return {
      currentStock: Number(item?.current_stock ?? 0),
      requested: Number(movForm.quantity ?? 0),
    }
  })()

  async function handleDelete() {
    if (!deleteId) return
    try {
      await inventoryService.deleteItem(deleteId)
      setDeleteId(null)
      await loadAll()
    } catch (e) {
      setDeleteId(null)
      if (e instanceof InventoryError && e.code === 'HAS_STOCK_OR_MOVEMENTS') {
        toastError(e.message)
      } else {
        toastError(getErrorMessage(e) || 'No se pudo eliminar el material')
      }
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <InventoryPageHeader
        projectId={projectId!}
        projectName={projectName}
        onOpenMovement={() => setShowMovForm(true)}
        onOpenItem={() => setShowItemForm(true)}
      />

      <InventoryLowStockAlert items={lowStock} />

      <InventoryActionFormsSection
        showItemForm={showItemForm}
        showMovementForm={showMovForm}
        itemForm={itemForm}
        movementForm={movForm}
        items={items}
        projectId={projectId!}
        saving={saving}
        onItemFormChange={setItemForm}
        onMovementFormChange={handleMovementFormChange}
        onCloseItemForm={() => setShowItemForm(false)}
        onCloseMovementForm={() => setShowMovForm(false)}
        onSaveItem={handleAddItem}
        onSaveMovement={handleAddMovement}
      />

      <InventoryTabs tab={tab} onChange={setTab} />

      <InventoryContentSection
        loading={loading}
        tab={tab}
        items={items}
        movements={movements}
        lots={lots}
        onDeleteItem={setDeleteId}
      />

      <InventoryDeleteModalSection deleteId={deleteId} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />

      <StockOverrideModal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        onConfirm={handleConfirmOverride}
        defaultActor={user?.displayName}
        currentStock={overrideContext.currentStock}
        requested={overrideContext.requested}
      />
    </div>
  )
}
