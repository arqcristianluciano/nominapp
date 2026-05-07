import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { CreatePayrollForm } from '@/components/features/payroll/CreatePayrollForm'
import { ProjectForm } from '@/components/features/projects/ProjectForm'
import type { Project } from '@/types/database'

export function ProjectDetailModals({
  projectId,
  project,
  showCreate,
  showEditProject,
  savingProject,
  confirmDeleteId,
  onCloseCreate,
  onCreated,
  onCloseEditProject,
  onSubmitEditProject,
  onConfirmDeletePeriod,
  onCancelDeletePeriod,
}: {
  projectId: string
  project: Project
  showCreate: boolean
  showEditProject: boolean
  savingProject: boolean
  confirmDeleteId: string | null
  onCloseCreate: () => void
  onCreated: (periodId: string) => void
  onCloseEditProject: () => void
  onSubmitEditProject: (data: Partial<Project>) => Promise<void>
  onConfirmDeletePeriod: (periodId: string) => Promise<void>
  onCancelDeletePeriod: () => void
}) {
  return (
    <>
      <Modal open={showCreate} onClose={onCloseCreate} title="Nuevo reporte">
        <CreatePayrollForm projectId={projectId} onCreated={onCreated} onCancel={onCloseCreate} />
      </Modal>

      <Modal open={showEditProject} onClose={onCloseEditProject} title="Editar proyecto">
        <ProjectForm initial={project} onSubmit={onSubmitEditProject} onCancel={onCloseEditProject} saving={savingProject} />
      </Modal>

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Eliminar reporte"
        message="¿Eliminar este reporte? Esta acción no se puede deshacer y se perderán todas las partidas asociadas."
        confirmLabel="Eliminar"
        onConfirm={() => confirmDeleteId && onConfirmDeletePeriod(confirmDeleteId)}
        onCancel={onCancelDeletePeriod}
      />
    </>
  )
}
