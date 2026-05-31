import { useState } from 'react'
import { parseDecimalInput } from '@/utils/decimalInput'

export function BudgetAmountEditModal({
  open,
  value,
  onChange,
  onSave,
  onClose,
}: {
  open: boolean
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSave = () => {
    const trimmed = value.trim()
    // Vacío => permitir guardar como 0 (compatibilidad con el flujo previo).
    if (!trimmed) {
      setError(null)
      onSave()
      return
    }
    const parsed = parseDecimalInput(trimmed)
    if (parsed === null) {
      setError('Monto inválido')
      return
    }
    setError(null)
    // Normalizar para que el consumidor (que aplica Number()) reciba un valor
    // parseable independientemente del formato local introducido.
    if (String(parsed) !== value) {
      onChange(String(parsed))
    }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-app-surface rounded-xl shadow-xl p-5 w-72 space-y-3">
        <p className="text-sm font-semibold text-app-text">Editar monto presupuestado</p>
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') onClose()
          }}
          className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm text-right focus:ring-1 focus:ring-blue-500"
        />
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        <p className="text-[10px] text-app-subtle">
          O agrega subpartidas para que el total se calcule automáticamente.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
