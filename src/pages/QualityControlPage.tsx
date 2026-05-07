import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { useProjectStore } from '@/stores/projectStore'
import { qualityControlService } from '@/services/qualityControlService'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { QualityControlForm } from '@/components/features/quality/QualityControlForm'
import { QualityStatsCards } from '@/components/features/quality/QualityStatsCards'
import { QualityRecordsTable } from '@/components/features/quality/QualityRecordsTable'
import type { QualityControl } from '@/types/database'

export default function QualityControlPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const [records, setRecords] = useState<QualityControl[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<QualityControl | undefined>()
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projects.length) fetchProjects()
  }, [projects.length, fetchProjects])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRecords(await qualityControlService.getByProject(projectId!))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) load()
  }, [projectId, load])

  async function handleSubmit(data: Omit<QualityControl, 'id' | 'status'>) {
    setSaving(true)
    try {
      if (editing) {
        await qualityControlService.update(editing.id, data)
        setEditing(undefined)
      } else {
        await qualityControlService.create(data)
        setShowForm(false)
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await qualityControlService.delete(id)
    await load()
    setDeletingId(null)
  }

  const passed = records.filter((r) => r.status === 'passed').length
  const failed = records.filter((r) => r.status === 'failed').length
  const pending = records.filter((r) => !r.status).length

  return (
    <div className="space-y-5">
      <div>
        <Breadcrumb items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: project?.name ?? 'Proyecto', to: `/proyectos/${projectId}` },
          { label: 'Calidad' },
        ]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">Control de Calidad</h1>
            <p className="text-sm text-app-muted mt-0.5">Ensayos de resistencia del hormigón</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo ensayo
          </button>
        </div>
      </div>

      <QualityStatsCards passed={passed} failed={failed} pending={pending} />
      <QualityRecordsTable
        loading={loading}
        records={records}
        onCreate={() => setShowForm(true)}
        onEdit={setEditing}
        onDelete={setDeletingId}
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo ensayo de hormigón">
        <QualityControlForm projectId={projectId!} saving={saving} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="Editar ensayo">
        {editing && <QualityControlForm projectId={projectId!} initial={editing} saving={saving} onSubmit={handleSubmit} onCancel={() => setEditing(undefined)} />}
      </Modal>

      <ConfirmModal
        open={!!deletingId}
        title="Eliminar ensayo"
        message="¿Estás seguro de que deseas eliminar este ensayo? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
