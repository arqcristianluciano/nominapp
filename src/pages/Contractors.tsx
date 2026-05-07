import { useCallback, useEffect, useMemo, useState } from 'react'
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

type CreateContractorInput = Parameters<typeof contractorService.create>[0]

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
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

  const handleCreate = useCallback(async (data: CreateContractorInput) => {
    setSaving(true)
    try {
      await contractorService.create(data)
      setShowForm(false)
      await load()
      success('Contratista creado correctamente')
    } catch {
      error('No se pudo crear el contratista')
    } finally {
      setSaving(false)
    }
  }, [error, load, success])

  const handleUpdate = useCallback(async (data: CreateContractorInput) => {
    if (!editing) return
    setSaving(true)
    try {
      await contractorService.update(editing.id, data)
      setEditing(undefined)
      await load()
      success('Contratista actualizado')
    } catch {
      error('No se pudo actualizar el contratista')
    } finally {
      setSaving(false)
    }
  }, [editing, error, load, success])

  const normalizedSearch = useMemo(() => search.toLowerCase(), [search])

  const filtered = useMemo(
    () =>
      contractors.filter((contractor) =>
        contractor.name.toLowerCase().includes(normalizedSearch) ||
        contractor.specialty?.toLowerCase().includes(normalizedSearch),
      ),
    [contractors, normalizedSearch],
  )

  const activeCount = useMemo(
    () => contractors.reduce((count, contractor) => count + (contractor.is_active ? 1 : 0), 0),
    [contractors],
  )

  const openCreateModal = useCallback(() => setShowForm(true), [])
  const closeCreateModal = useCallback(() => setShowForm(false), [])
  const closeEditModal = useCallback(() => setEditing(undefined), [])

  return (
    <div className="space-y-6">
      <ContractorsHeader total={contractors.length} active={activeCount} onNew={openCreateModal} />
      <ContractorsSearch value={search} onChange={setSearch} />

      {loading ? (
        <SkeletonCards count={6} />
      ) : filtered.length === 0 ? (
        <EmptyContractorsState hasSearch={!!search} onNew={openCreateModal} />
      ) : (
        <ContractorsGrid contractors={filtered} onEdit={setEditing} />
      )}

      <Modal open={showForm} onClose={closeCreateModal} title="Nuevo contratista">
        <ContractorForm onSubmit={handleCreate} onCancel={closeCreateModal} saving={saving} />
      </Modal>
      <Modal open={!!editing} onClose={closeEditModal} title="Editar contratista">
        {editing && <ContractorForm initial={editing} onSubmit={handleUpdate} onCancel={closeEditModal} saving={saving} />}
      </Modal>
    </div>
  )
}
