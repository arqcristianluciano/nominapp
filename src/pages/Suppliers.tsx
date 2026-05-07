import { useCallback, useEffect, useMemo, useState } from 'react'
import { supplierService } from '@/services/supplierService'
import { Modal } from '@/components/ui/Modal'
import { SupplierForm } from '@/components/features/suppliers/SupplierForm'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { Supplier } from '@/types/database'
import {
  EmptySuppliersState,
  SuppliersHeader,
  SuppliersSearch,
  SuppliersTable,
} from '@/components/features/suppliers/SuppliersSections'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | undefined>()
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSuppliers(await supplierService.getAll())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = useCallback(async (data: Parameters<typeof supplierService.create>[0]) => {
    setSaving(true)
    try {
      await supplierService.create(data)
      setShowForm(false)
      await load()
      success('Suplidor creado correctamente')
    } catch {
      error('No se pudo crear el suplidor')
    } finally {
      setSaving(false)
    }
  }, [error, load, success])

  const handleUpdate = useCallback(async (data: Parameters<typeof supplierService.create>[0]) => {
    if (!editing) return
    setSaving(true)
    try {
      await supplierService.update(editing.id, data)
      setEditing(undefined)
      await load()
      success('Suplidor actualizado')
    } catch {
      error('No se pudo actualizar el suplidor')
    } finally {
      setSaving(false)
    }
  }, [editing, error, load, success])

  const normalizedSearch = useMemo(() => search.toLowerCase(), [search])

  const filtered = useMemo(
    () =>
      suppliers.filter((supplier) =>
        supplier.name.toLowerCase().includes(normalizedSearch) ||
        supplier.rnc?.toLowerCase().includes(normalizedSearch),
      ),
    [normalizedSearch, suppliers],
  )

  const activeCount = useMemo(
    () => suppliers.reduce((count, supplier) => count + (supplier.is_active ? 1 : 0), 0),
    [suppliers],
  )

  const openCreateModal = useCallback(() => setShowForm(true), [])
  const closeCreateModal = useCallback(() => setShowForm(false), [])
  const closeEditModal = useCallback(() => setEditing(undefined), [])

  return (
    <div className="space-y-6">
      <SuppliersHeader total={suppliers.length} active={activeCount} onNew={openCreateModal} />
      <SuppliersSearch value={search} onChange={setSearch} />

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptySuppliersState hasSearch={!!search} onNew={openCreateModal} />
      ) : (
        <SuppliersTable suppliers={filtered} onEdit={setEditing} />
      )}

      <Modal open={showForm} onClose={closeCreateModal} title="Nuevo proveedor">
        <SupplierForm onSubmit={handleCreate} onCancel={closeCreateModal} saving={saving} />
      </Modal>
      <Modal open={!!editing} onClose={closeEditModal} title="Editar proveedor">
        {editing && <SupplierForm initial={editing} onSubmit={handleUpdate} onCancel={closeEditModal} saving={saving} />}
      </Modal>
    </div>
  )
}
