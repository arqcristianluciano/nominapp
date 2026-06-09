import { useCallback, useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '@/utils/errors'
import { useTranslation } from 'react-i18next'
import { contractorService } from '@/services/contractorService'
import { Modal } from '@/components/ui/Modal'
import { ContractorForm } from '@/components/features/contractors/ContractorForm'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { Contractor } from '@/types/database'
import {
  ContractorsGrid,
  ContractorsHeader,
  ContractorsSearch,
  EmptyContractorsState,
} from '@/components/features/contractors/ContractorsSections'
import ContractorExcelImportModal from '@/components/features/contractors/ContractorExcelImportModal'
import type { ParsedContractorRow } from '@/components/features/contractors/parseContractorExcel'
import { useAppRoles } from '@/hooks/useAppRoles'

type CreateContractorInput = Parameters<typeof contractorService.create>[0]

export default function Contractors() {
  const { t } = useTranslation()
  const { canWriteContractors } = useAppRoles()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Contractor | undefined>()
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setContractors(await contractorService.getAll())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = useCallback(
    async (data: CreateContractorInput) => {
      setSaving(true)
      try {
        await contractorService.create(data)
        setShowForm(false)
        await load()
        success(t('contractors.toast.created'))
      } catch (err) {
        error(getErrorMessage(err) || t('contractors.toast.create_failed'))
      } finally {
        setSaving(false)
      }
    },
    [error, load, success, t],
  )

  const handleUpdate = useCallback(
    async (data: CreateContractorInput) => {
      if (!editing) return
      setSaving(true)
      try {
        await contractorService.update(editing.id, data)
        setEditing(undefined)
        await load()
        success(t('contractors.toast.updated'))
      } catch (err) {
        error(getErrorMessage(err) || t('contractors.toast.update_failed'))
      } finally {
        setSaving(false)
      }
    },
    [editing, error, load, success, t],
  )

  const normalizedSearch = useMemo(() => search.toLowerCase(), [search])

  const filtered = useMemo(
    () =>
      contractors.filter(
        (contractor) =>
          contractor.name.toLowerCase().includes(normalizedSearch) ||
          contractor.specialty?.toLowerCase().includes(normalizedSearch),
      ),
    [contractors, normalizedSearch],
  )

  const activeCount = useMemo(
    () => contractors.reduce((count, contractor) => count + (contractor.is_active ? 1 : 0), 0),
    [contractors],
  )

  const handleImport = useCallback(
    async (rows: ParsedContractorRow[]): Promise<{ created: number; skipped: number }> => {
      let created = 0
      let skipped = 0
      for (const row of rows) {
        try {
          await contractorService.create({
            name: row.name,
            specialty: row.specialty ?? undefined,
            cedula: row.cedula ?? undefined,
            phone: row.phone ?? undefined,
            bank_name: row.bank_name ?? undefined,
            bank_account: row.bank_account ?? undefined,
            payment_method: row.payment_method ?? 'cash',
          })
          created++
        } catch {
          skipped++
        }
      }
      await load()
      if (created > 0) {
        success(`${created} ${created === 1 ? 'contratista importado' : 'contratistas importados'} correctamente`)
      }
      return { created, skipped }
    },
    [load, success],
  )

  const openCreateModal = useCallback(() => setShowForm(true), [])
  const closeCreateModal = useCallback(() => setShowForm(false), [])
  const closeEditModal = useCallback(() => setEditing(undefined), [])
  const openImportModal = useCallback(() => setShowImport(true), [])
  const closeImportModal = useCallback(() => setShowImport(false), [])

  const existingNames = useMemo(() => contractors.map((c) => c.name), [contractors])

  return (
    <div className="space-y-6">
      <ContractorsHeader
        total={contractors.length}
        active={activeCount}
        onNew={openCreateModal}
        onImport={canWriteContractors ? openImportModal : undefined}
      />
      <ContractorsSearch value={search} onChange={setSearch} />

      {loading ? (
        <SkeletonCards count={6} />
      ) : filtered.length === 0 ? (
        <EmptyContractorsState hasSearch={!!search} onNew={openCreateModal} />
      ) : (
        <ContractorsGrid contractors={filtered} onEdit={setEditing} />
      )}

      <Modal open={showForm} onClose={closeCreateModal} title={t('contractors.new_contractor')}>
        <ContractorForm onSubmit={handleCreate} onCancel={closeCreateModal} saving={saving} />
      </Modal>
      <Modal open={!!editing} onClose={closeEditModal} title={t('contractors.edit_contractor')}>
        {editing && (
          <ContractorForm initial={editing} onSubmit={handleUpdate} onCancel={closeEditModal} saving={saving} />
        )}
      </Modal>

      {showImport && (
        <ContractorExcelImportModal existingNames={existingNames} onImport={handleImport} onClose={closeImportModal} />
      )}
    </div>
  )
}
