import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => Promise<void>
  defaultActor?: string
  currentStock: number
  requested: number
}

export function StockOverrideModal({
  open,
  onClose,
  onConfirm,
  defaultActor,
  currentStock,
  requested,
}: Props) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)
    if (motivo.trim().length < 5) return setError('Motivo debe tener al menos 5 caracteres')
    setLoading(true)
    try {
      await onConfirm(motivo.trim())
      setMotivo('')
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Forzar salida con stock insuficiente" width="max-w-lg">
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 rounded-lg p-3 flex gap-2 text-xs text-red-800 dark:text-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            Esta operación dejará stock <strong>{currentStock - requested}</strong>. El override
            queda registrado en la auditoría con tu nombre, fecha y motivo (regla 7.5). Solo el
            Gerente debe usarlo cuando exista una razón operativa justificada.
          </div>
        </div>
        {defaultActor && (
          <p className="text-xs text-app-muted">
            Override por: <strong>{defaultActor}</strong>
          </p>
        )}
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Motivo *</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            placeholder="Ej: Material en tránsito de OC-2026-045; obra no puede detenerse..."
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Registrando…' : 'Confirmar override y registrar salida'}
        </button>
      </div>
    </Modal>
  )
}
