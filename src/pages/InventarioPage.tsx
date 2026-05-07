import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { inventoryService, type InventoryItem, type InventoryMovement } from '@/services/inventoryService'
import { InventoryLowStockAlert } from '@/components/features/inventory/InventoryLowStockAlert'
import {
  InventoryActionFormsSection,
  InventoryContentSection,
  InventoryDeleteModalSection,
  InventoryPageHeader,
} from '@/components/features/inventory/InventoryPageSections'
import { InventoryTabs } from '@/components/features/inventory/InventoryTabs'
import { EMPTY_ITEM_FORM, EMPTY_MOVEMENT_FORM, type InventoryTab } from '@/components/features/inventory/inventoryConfig'

export default function InventarioPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<InventoryTab>('stock')
  const [showItemForm, setShowItemForm] = useState(false)
  const [showMovForm, setShowMovForm] = useState(false)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM)
  const [movForm, setMovForm] = useState(EMPTY_MOVEMENT_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [its, movs] = await Promise.all([
        inventoryService.getItems(projectId!),
        inventoryService.getMovements(projectId!),
      ])
      setItems(its)
      setMovements(movs)
    } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { loadAll() }, [loadAll])

  const lowStock = useMemo(() => inventoryService.getLowStockItems(items), [items])
  const projectName = project?.name ?? 'Proyecto'
  const handleMovementFormChange = useCallback(
    (next: Pick<InventoryMovement, 'item_id' | 'type' | 'quantity' | 'date' | 'notes'>) => {
      setMovForm((prev) => ({ ...prev, ...next }))
    },
    [],
  )

  async function handleAddItem() {
    if (!itemForm.name.trim()) return
    setSaving(true)
    try {
      await inventoryService.createItem({ ...itemForm, project_id: projectId! })
      setShowItemForm(false)
      setItemForm(EMPTY_ITEM_FORM)
      await loadAll()
    } finally { setSaving(false) }
  }

  async function handleAddMovement() {
    if (!movForm.item_id) return
    setSaving(true)
    try {
      await inventoryService.addMovement({ ...movForm, project_id: projectId!, supplier_id: null })
      setShowMovForm(false)
      setMovForm(EMPTY_MOVEMENT_FORM)
      await loadAll()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    await inventoryService.deleteItem(deleteId)
    setDeleteId(null)
    await loadAll()
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
        onDeleteItem={setDeleteId}
      />

      <InventoryDeleteModalSection
        deleteId={deleteId}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
