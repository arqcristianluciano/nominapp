import { AlertTriangle, Trash2 } from 'lucide-react'
import { Modal } from './Modal'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const isDanger = variant === 'danger'

  return (
    <Modal open={open} onClose={onCancel} title="" width="max-w-sm">
      <div className="text-center space-y-4 pb-1">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
          isDanger
            ? 'bg-red-100 dark:bg-red-950/50'
            : 'bg-amber-100 dark:bg-amber-950/50'
        }`}>
          {isDanger
            ? <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            : <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
        </div>

        <div>
          <h3 className="text-base font-semibold text-app-text">{title}</h3>
          <p className="text-sm text-app-muted mt-1 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onCancel() }}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
