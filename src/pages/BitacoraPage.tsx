import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { bitacoraService, type BitacoraEntry, type BitacoraFormData } from '@/services/bitacoraService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EMPTY_BITACORA_FORM } from '@/components/features/bitacora/bitacoraConfig'
import { BitacoraEntryForm } from '@/components/features/bitacora/BitacoraEntryForm'
import { BitacoraEntriesList } from '@/components/features/bitacora/BitacoraEntriesList'
import { BitacoraEmptyState, BitacoraHeader, BitacoraLoadingState } from '@/components/features/bitacora/BitacoraSections'

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

  function handleNew() {
    setShowForm(true)
    setEditId(null)
    setForm({ ...EMPTY_BITACORA_FORM, project_id: projectId! })
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <BitacoraHeader projectId={projectId!} projectName={project?.name ?? 'Proyecto'} onNew={handleNew} />

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
        <BitacoraLoadingState />
      ) : entries.length === 0 ? (
        <BitacoraEmptyState />
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
