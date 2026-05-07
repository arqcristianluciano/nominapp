import { Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { QualityControlForm } from '@/components/features/quality/QualityControlForm'
import type { QualityControl } from '@/types/database'

type QualityFormData = Omit<QualityControl, 'id' | 'status'>

export function QualityControlPageHeader({
  projectId,
  projectName,
  onCreate,
}: {
  projectId: string
  projectName: string
  onCreate: () => void
}) {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: projectName, to: `/proyectos/${projectId}` }, { label: 'Calidad' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Control de Calidad</h1>
          <p className="mt-0.5 text-sm text-app-muted">Ensayos de resistencia del hormigón</p>
        </div>
        <button onClick={onCreate} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Nuevo ensayo
        </button>
      </div>
    </div>
  )
}

export function QualityControlPageModals({
  projectId,
  showCreate,
  editing,
  deletingId,
  saving,
  onSubmit,
  onCloseCreate,
  onCloseEdit,
  onConfirmDelete,
  onCancelDelete,
}: {
  projectId: string
  showCreate: boolean
  editing: QualityControl | undefined
  deletingId: string | null
  saving: boolean
  onSubmit: (data: QualityFormData) => void
  onCloseCreate: () => void
  onCloseEdit: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  return (
    <>
      <Modal open={showCreate} onClose={onCloseCreate} title="Nuevo ensayo de hormigón">
        <QualityControlForm projectId={projectId} saving={saving} onSubmit={onSubmit} onCancel={onCloseCreate} />
      </Modal>

      <Modal open={!!editing} onClose={onCloseEdit} title="Editar ensayo">
        {editing && <QualityControlForm projectId={projectId} initial={editing} saving={saving} onSubmit={onSubmit} onCancel={onCloseEdit} />}
      </Modal>

      <ConfirmModal
        open={!!deletingId}
        title="Eliminar ensayo"
        message="¿Estás seguro de que deseas eliminar este ensayo? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </>
  )
}
