import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface CubicacionesDeleteContractModalProps {
  contractId: string | null
  onConfirmDelete: (contractId: string) => Promise<void>
  onClose: () => void
}

export function CubicacionesDeleteContractModal({
  contractId,
  onConfirmDelete,
  onClose,
}: CubicacionesDeleteContractModalProps) {
  return (
    <ConfirmModal
      open={Boolean(contractId)}
      title="Eliminar contrato"
      message="¿Eliminar este contrato y todos sus partidas y cortes? Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      onConfirm={() => {
        if (contractId) {
          void onConfirmDelete(contractId)
        }
      }}
      onCancel={onClose}
    />
  )
}
