import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  BookOpen, Plus,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { useProjectStore } from '@/stores/projectStore'
import { bitacoraService, type BitacoraEntry, type BitacoraFormData } from '@/services/bitacoraService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EMPTY_BITACORA_FORM } from '@/components/features/bitacora/bitacoraConfig'
import { BitacoraEntryForm } from '@/components/features/bitacora/BitacoraEntryForm'
import { BitacoraEntriesList } from '@/components/features/bitacora/BitacoraEntriesList'

export default function BitacoraPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const [entries, setEntries] = useState<BitacoraEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BitacoraFormData>({ ...EMPTY_BITACORA_FORM, project_id: projectId! })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setEntries(await bitacoraService.getByProject(projectId!)) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  function startEdit(entry: BitacoraEntry) {
    setForm({
      project_id: entry.project_id,
      date: entry.date,
      weather: entry.weather,
      temp_c: entry.temp_c,
      work_summary: entry.work_summary,
      workforce_count: entry.workforce_count,
      equipment: entry.equipment ?? '',
      visitors: entry.visitors ?? '',
      incidents: entry.incidents ?? '',
      notes: entry.notes ?? '',
      created_by: entry.created_by,
    })
    setEditId(entry.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.work_summary.trim()) return
    setSaving(true)
    try {
      if (editId) {
        await bitacoraService.update(editId, form)
      } else {
        await bitacoraService.create(form)
      }
      setShowForm(false)
      setEditId(null)
      setForm({ ...EMPTY_BITACORA_FORM, project_id: projectId! })
      await load()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    await bitacoraService.delete(deleteId)
    setDeleteId(null)
    await load()
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <Breadcrumb items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: project?.name ?? 'Proyecto', to: `/proyectos/${projectId}` },
          { label: 'Bitácora' },
        ]} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-app-text">Bitácora de Obra</h1>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_BITACORA_FORM, project_id: projectId! }) }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />Nuevo registro
          </button>
        </div>
      </div>

      {showForm && (
        <BitacoraEntryForm
          form={form}
          saving={saving}
          editMode={!!editId}
          onChange={setForm}
          onCancel={() => { setShowForm(false); setEditId(null) }}
          onSave={handleSave}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Cargando...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-app-muted">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No hay registros en la bitácora aún.</p>
        </div>
      ) : (
        <BitacoraEntriesList
          entries={entries}
          expandedId={expandedId}
          onToggleExpand={(entryId) => setExpandedId(expandedId === entryId ? null : entryId)}
          onEdit={startEdit}
          onDelete={setDeleteId}
        />
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar registro"
        message="¿Eliminar este registro de bitácora? Esta acción no se puede deshacer."
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
