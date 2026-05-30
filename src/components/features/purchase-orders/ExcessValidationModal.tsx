import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { getErrorMessage } from '@/utils/errors'

interface Props {
  open: boolean
  onClose: () => void
  onValidate: (validatedBy: string, motivo: string) => Promise<void>
  defaultValidator?: string
}

export function ExcessValidationModal({ open, onClose, onValidate, defaultValidator }: Props) {
  const [validatedBy, setValidatedBy] = useState(defaultValidator ?? '')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!validatedBy.trim()) return setError('Ingrese su nombre')
    if (motivo.trim().length < 5) return setError('Motivo debe tener al menos 5 caracteres')
    setLoading(true)
    try {
      await onValidate(validatedBy.trim(), motivo.trim())
      setMotivo('')
      onClose()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Validar solicitud excedente" width="max-w-lg">
      <div className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200">
          La solicitud excede la cantidad planificada en la partida. Tu validación queda registrada en la auditoría con
          tu nombre, fecha y motivo (regla 7.1).
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Validado por *</label>
          <input
            value={validatedBy}
            onChange={(e) => setValidatedBy(e.target.value)}
            placeholder="Tu nombre completo"
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Motivo *</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            placeholder="Ej: Refuerzo estructural adicional según indicación del calculista..."
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          {loading ? 'Validando…' : 'Validar y liberar a cotización'}
        </button>
      </div>
    </Modal>
  )
}
