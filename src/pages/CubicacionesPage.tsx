import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { useProjectStore } from '@/stores/projectStore'
import { contractService } from '@/services/cubicationService'
import type { ContractSummary } from '@/services/cubicationService'
import { contractorService } from '@/services/contractorService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { CubicacionesSummaryCards } from '@/components/features/cubicacion/CubicacionesSummaryCards'
import { ContractsTable } from '@/components/features/cubicacion/ContractsTable'
import { CreateContractModal } from '@/components/features/cubicacion/CreateContractModal'
import type { Contractor } from '@/types/database'
import { getErrorMessage } from '@/utils/errors'

export default function CubicacionesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { projects, fetchProjects } = useProjectStore()
  const [contracts, setContracts] = useState<ContractSummary[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const project = projects.find((p) => p.id === projectId)

  const [form, setForm] = useState({ contractor_id: '', retention_percent: '5', signed_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  useEffect(() => {
    if (!projects.length) fetchProjects()
    contractorService.getAll().then(setContractors).catch(() => {})
  }, [projects.length, fetchProjects])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try { setContracts(await contractService.getByProject(projectId)) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const created = await contractService.create({
        project_id: projectId!,
        contractor_id: form.contractor_id,
        retention_percent: Number(form.retention_percent),
        signed_date: form.signed_date || null,
        notes: form.notes || null,
      })
      setShowForm(false)
      setForm({ contractor_id: '', retention_percent: '5', signed_date: '', notes: '' })
      navigate(`/proyectos/${projectId}/cubicaciones/${created.id}`)
    } catch (err) {

      setFormError(getErrorMessage(err) || 'Error al crear el contrato. Verifica que las tablas del módulo de cubicación existan en Supabase.')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await contractService.delete(id)
    await load()
    setDeleteTargetId(null)
  }

  const totals = contracts.reduce(
    (acc, c) => ({ acordado: acc.acordado + c.acordado, acumulado: acc.acumulado + c.acumulado, pendiente: acc.pendiente + c.pendiente }),
    { acordado: 0, acumulado: 0, pendiente: 0 }
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Breadcrumb items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: project?.name || 'Proyecto', to: `/proyectos/${projectId}` },
          { label: 'Cubicaciones' },
        ]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">Cubicaciones</h1>
            <p className="text-sm text-app-muted mt-0.5">Contratos de ajuste por contratista</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo contrato
          </button>
        </div>
      </div>

      <CubicacionesSummaryCards acordado={totals.acordado} acumulado={totals.acumulado} pendiente={totals.pendiente} />
      <ContractsTable
        loading={loading}
        contracts={contracts}
        onOpen={(contractId: string) => navigate(`/proyectos/${projectId}/cubicaciones/${contractId}`)}
        onDelete={setDeleteTargetId}
        onCreateFirst={() => setShowForm(true)}
      />

      <ConfirmModal
        open={!!deleteTargetId}
        title="Eliminar contrato"
        message="¿Eliminar este contrato y todos sus partidas y cortes? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteTargetId && handleDelete(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />

      <CreateContractModal
        open={showForm}
        contractors={contractors}
        form={form}
        saving={saving}
        error={formError}
        onChange={setForm}
        onSubmit={handleCreate}
        onClose={() => { setShowForm(false); setFormError(null) }}
      />
    </div>
  )
}
