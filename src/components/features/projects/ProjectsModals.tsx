import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/features/projects/ProjectForm'
import { projectService } from '@/services/projectService'
import type { Project } from '@/types/database'

type ProjectFormInput = Parameters<typeof projectService.create>[0]

interface ProjectsModalsProps {
  showCreate: boolean
  editing: Project | undefined
  saving: boolean
  onCloseCreate: () => void
  onCloseEdit: () => void
  onCreate: (data: ProjectFormInput) => Promise<void>
  onUpdate: (data: ProjectFormInput) => Promise<void>
}

export function ProjectsModals({
  showCreate,
  editing,
  saving,
  onCloseCreate,
  onCloseEdit,
  onCreate,
  onUpdate,
}: ProjectsModalsProps) {
  return (
    <>
      <Modal open={showCreate} onClose={onCloseCreate} title="Nuevo proyecto">
        <ProjectForm onSubmit={onCreate} onCancel={onCloseCreate} saving={saving} />
      </Modal>

      <Modal open={!!editing} onClose={onCloseEdit} title="Editar proyecto">
        {editing && <ProjectForm initial={editing} onSubmit={onUpdate} onCancel={onCloseEdit} saving={saving} />}
      </Modal>
    </>
  )
}
