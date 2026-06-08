import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import SupplierExcelImportModal from '@/components/features/suppliers/SupplierExcelImportModal'
import type { ParsedSupplierRow } from '@/components/features/suppliers/parseSupplierExcel'
import { useAppRoles } from '@/hooks/useAppRoles'

export default function Suppliers() {
  const { t } = useTranslation()
  const { canWriteSuppliers } = useAppRoles()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
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

  const handleCreate = useCallback(
    async (data: Parameters<typeof supplierService.create>[0]) => {
      setSaving(true)
      try {
        await supplierService.create(data)
        setShowForm(false)
        await load()
        success(t('suppliers.toast.created'))
      } catch {
        error(t('suppliers.toast.create_failed'))
      } finally {
        setSaving(false)
      }
    },
    [error, load, success, t],
  )

  const handleUpdate = useCallback(
    async (data: Parameters<typeof supplierService.create>[0]) => {
      if (!editing) return
      setSaving(true)
      try {
        await supplierService.update(editing.id, data)
        setEditing(undefined)
        await load()
        success(t('suppliers.toast.updated'))
      } catch {
        error(t('suppliers.toast.update_failed'))
      } finally {
        setSaving(false)
      }
    },
    [editing, error, load, success, t],
  )

  const handleImport = useCallback(
    async (rows: ParsedSupplierRow[]): Promise<{ created: number; skipped: number }> => {
      let created = 0
      let skipped = 0
      for (const row of rows) {
        try {
          await supplierService.create({
            name: row.name,
            rnc: row.rnc,
            contact_phone: row.contact_phone,
            bank_name: row.bank_name,
            bank_account: row.bank_account,
            tipo_cuenta: row.tipo_cuenta,
            payment_terms: row.payment_terms,
          })
          created++
        } catch {
          skipped++
        }
      }
      await load()
      if (created > 0) {
        success(`${created} ${created === 1 ? 'proveedor importado' : 'proveedores importados'} correctamente`)
      }
      return { created, skipped }
    },
    [load, success],
  )

  const normalizedSearch = useMemo(() => search.toLowerCase(), [search])

  const filtered = useMemo(
    () =>
      suppliers.filter(
        (supplier) =>
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
  const openImportModal = useCallback(() => setShowImport(true), [])
  const closeImportModal = useCallback(() => setShowImport(false), [])

  const existingNames = useMemo(() => suppliers.map((s) => s.name), [suppliers])

  return (
    <div className="space-y-6">
      <SuppliersHeader
        total={suppliers.length}
        active={activeCount}
        onNew={openCreateModal}
        onImport={canWriteSuppliers ? openImportModal : undefined}
      />
      <SuppliersSearch value={search} onChange={setSearch} />

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptySuppliersState hasSearch={!!search} onNew={openCreateModal} />
      ) : (
        <SuppliersTable suppliers={filtered} onEdit={setEditing} />
      )}

      <Modal open={showForm} onClose={closeCreateModal} title={t('suppliers.new_supplier')}>
        <SupplierForm onSubmit={handleCreate} onCancel={closeCreateModal} saving={saving} />
      </Modal>
      <Modal open={!!editing} onClose={closeEditModal} title={t('suppliers.edit_supplier')}>
        {editing && (
          <SupplierForm initial={editing} onSubmit={handleUpdate} onCancel={closeEditModal} saving={saving} />
        )}
      </Modal>

      {showImport && (
        <SupplierExcelImportModal existingNames={existingNames} onImport={handleImport} onClose={closeImportModal} />
      )}
    </div>
  )
}
