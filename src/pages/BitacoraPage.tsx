import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { BitacoraEntryForm } from '@/components/features/bitacora/BitacoraEntryForm'
import { BitacoraEntriesList } from '@/components/features/bitacora/BitacoraEntriesList'
import { BitacoraEmptyState, BitacoraHeader, BitacoraLoadingState } from '@/components/features/bitacora/BitacoraSections'
import { useBitacoraPage } from '@/components/features/bitacora/useBitacoraPage'

export default function BitacoraPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const {
    entries,
    loading,
    showForm,
    form,
    expandedId,
    deleteId,
    saving,
    editId,
    setForm,
    setDeleteId,
    openCreate,
    startEdit,
    closeForm,
    saveEntry,
    confirmDelete,
    toggleExpand,
  } = useBitacoraPage(projectId)

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <BitacoraHeader projectId={projectId ?? ''} projectName={project?.name ?? 'Proyecto'} onNew={openCreate} />

      {showForm && (
        <BitacoraEntryForm
          form={form}
          saving={saving}
          editMode={!!editId}
          onChange={setForm}
          onCancel={closeForm}
          onSave={saveEntry}
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
          onToggleExpand={toggleExpand}
          onEdit={startEdit}
          onDelete={setDeleteId}
        />
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar registro"
        message="¿Eliminar este registro de bitácora? Esta acción no se puede deshacer."
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
