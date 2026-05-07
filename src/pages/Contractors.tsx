import { useEffect, useState } from 'react'
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

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setContractors(await contractorService.getAll()) }
    finally { setLoading(false) }
  }

  async function handleCreate(data: CreateContractorInput) {
    setSaving(true)
    try {
      await contractorService.create(data)
      setShowForm(false)
      await load()
      success('Contratista creado correctamente')
    } catch { error('No se pudo crear el contratista') }
    finally { setSaving(false) }
  }

  async function handleUpdate(data: CreateContractorInput) {
    if (!editing) return
    setSaving(true)
    try {
      await contractorService.update(editing.id, data)
      setEditing(undefined)
      await load()
      success('Contratista actualizado')
    } catch { error('No se pudo actualizar el contratista') }
    finally { setSaving(false) }
  }

  const filtered = contractors.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.specialty?.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = contractors.filter((c) => c.is_active).length

  return (
    <div className="space-y-6">
      <ContractorsHeader total={contractors.length} active={activeCount} onNew={() => setShowForm(true)} />
      <ContractorsSearch value={search} onChange={setSearch} />

      {loading ? (
        <SkeletonCards count={6} />
      ) : filtered.length === 0 ? (
        <EmptyContractorsState hasSearch={!!search} onNew={() => setShowForm(true)} />
      ) : (
        <ContractorsGrid contractors={filtered} onEdit={setEditing} />
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo contratista">
        <ContractorForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="Editar contratista">
        {editing && <ContractorForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(undefined)} saving={saving} />}
      </Modal>
    </div>
  )
}
