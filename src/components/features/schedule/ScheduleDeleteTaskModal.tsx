import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface ScheduleDeleteTaskModalProps {
  deleteId: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ScheduleDeleteTaskModal({ deleteId, onConfirm, onCancel }: ScheduleDeleteTaskModalProps) {
  return (
    <ConfirmModal
      open={!!deleteId}
      title="Eliminar tarea"
      message="¿Eliminar esta tarea del cronograma?"
      variant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
