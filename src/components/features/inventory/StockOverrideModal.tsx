import { useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
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
  const [confirmed, setConfirmed] = useState(false)

  async function handleConfirm() {
    setError(null)
    if (!confirmed) {
      return setError('Debes marcar la casilla de confirmación para continuar')
    }
    if (motivo.trim().length < 5) return setError('Motivo debe tener al menos 5 caracteres')
    setLoading(true)
    try {
      await onConfirm(motivo.trim())
      setMotivo('')
      setConfirmed(false)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setMotivo('')
    setConfirmed(false)
    setError(null)
    onClose()
  }

  const resultingStock = currentStock - requested

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Forzar salida con stock insuficiente"
      width="max-w-lg"
    >
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 rounded-lg p-3 flex gap-2 text-xs sm:text-sm text-red-800 dark:text-red-200">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Esta acción requiere autorización del Director.</p>
            <p>
              Quedará registrada en la auditoría con tu nombre, fecha y motivo (regla 7.5). Úsala
              solo cuando exista una razón operativa justificada.
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-app-hover/40 border border-app-border rounded-lg p-3">
          <div>
            <dt className="text-app-subtle">Stock actual</dt>
            <dd className="font-semibold text-app-text">{currentStock}</dd>
          </div>
          <div>
            <dt className="text-app-subtle">Solicitado</dt>
            <dd className="font-semibold text-app-text">{requested}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-app-subtle">Stock resultante</dt>
            <dd className="font-bold text-red-600">{resultingStock}</dd>
          </div>
        </dl>

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
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm resize-none bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <p className="text-[10px] text-app-subtle mt-1">Mínimo 5 caracteres.</p>
        </div>

        <label className="flex items-start gap-2 text-xs text-app-text bg-app-hover/40 border border-app-border rounded-lg p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-red-600"
          />
          <span>
            Confirmo que tengo autorización como Director y entiendo que esta acción dejará el
            stock en <strong>{resultingStock}</strong> y quedará en auditoría.
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-3 sm:py-2.5 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !confirmed || motivo.trim().length < 5}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            {loading ? 'Registrando…' : 'Confirmar override'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
