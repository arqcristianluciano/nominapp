import { useNavigate } from 'react-router-dom'
import type { Project } from '@/types/database'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { CreateReportModalContent } from '@/components/features/payrollReports/CreateReportModalContent'

export function ReportesObraModals({
  projects,
  showCreate,
  selectedProjectId,
  confirmDeleteId,
  onCloseCreate,
  onProjectChange,
  onConfirmDelete,
  onCancelDelete,
}: {
  projects: Project[]
  showCreate: boolean
  selectedProjectId: string
  confirmDeleteId: string | null
  onCloseCreate: () => void
  onProjectChange: (projectId: string) => void
  onConfirmDelete: (periodId: string) => Promise<void>
  onCancelDelete: () => void
}) {
  const navigate = useNavigate()

  return (
    <>
      <ConfirmModal open={!!confirmDeleteId} title="Eliminar borrador" message="¿Eliminar este reporte en borrador? Esta acción no se puede deshacer." confirmLabel="Eliminar" onConfirm={() => confirmDeleteId && onConfirmDelete(confirmDeleteId)} onCancel={onCancelDelete} />
      <Modal open={showCreate} onClose={onCloseCreate} title="Nuevo reporte">
        {showCreate && <CreateReportModalContent projects={projects} selectedProjectId={selectedProjectId} onProjectChange={onProjectChange} onCreated={(periodId) => { onCloseCreate(); navigate(`/nominas/${periodId}`) }} onCancel={onCloseCreate} />}
      </Modal>
    </>
  )
}
