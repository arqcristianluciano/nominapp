import { useEffect, useState } from 'react'
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

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setSuppliers(await supplierService.getAll()) }
    finally { setLoading(false) }
  }

  async function handleCreate(data: Parameters<typeof supplierService.create>[0]) {
    setSaving(true)
    try {
      await supplierService.create(data)
      setShowForm(false)
      await load()
      success('Suplidor creado correctamente')
    } catch { error('No se pudo crear el suplidor') }
    finally { setSaving(false) }
  }

  async function handleUpdate(data: Parameters<typeof supplierService.create>[0]) {
    if (!editing) return
    setSaving(true)
    try {
      await supplierService.update(editing.id, data)
      setEditing(undefined)
      await load()
      success('Suplidor actualizado')
    } catch { error('No se pudo actualizar el suplidor') }
    finally { setSaving(false) }
  }

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rnc?.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = suppliers.filter((s) => s.is_active).length

  return (
    <div className="space-y-6">
      <SuppliersHeader total={suppliers.length} active={activeCount} onNew={() => setShowForm(true)} />
      <SuppliersSearch value={search} onChange={setSearch} />

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptySuppliersState hasSearch={!!search} onNew={() => setShowForm(true)} />
      ) : (
        <SuppliersTable suppliers={filtered} onEdit={setEditing} />
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo proveedor">
        <SupplierForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="Editar proveedor">
        {editing && <SupplierForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(undefined)} saving={saving} />}
      </Modal>
    </div>
  )
}
