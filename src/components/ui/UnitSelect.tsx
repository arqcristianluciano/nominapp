import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useMeasureUnits } from '@/hooks/useMeasureUnits'
import { getErrorMessage } from '@/utils/errors'

/** Valor especial de la opción "Añadir nueva unidad" (nunca se guarda). */
const ADD_NEW = '__add_new_unit__'

interface Props {
  value: string
  onChange: (unit: string) => void
  className?: string
}

/**
 * Select de unidad de medida con catálogo guardado en la base de datos.
 * La última opción permite registrar una unidad nueva (Atado, Libra, etc.)
 * que queda disponible en todos los formularios de la app.
 */
export function UnitSelect({ value, onChange, className }: Props) {
  const { units, addUnit } = useMeasureUnits()
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Valor guardado con un catálogo viejo o escrito a mano: se muestra tal cual
  // como opción extra para no perderlo al editar registros existentes.
  const valueInCatalog = value === '' || units.some((u) => u.code === value)

  const handleSelect = (next: string) => {
    if (next === ADD_NEW) {
      setNewLabel('')
      setError(null)
      setShowAdd(true)
      return
    }
    onChange(next)
  }

  const handleSave = async () => {
    const clean = newLabel.trim()
    if (!clean || saving) return
    // Si ya existe (sin distinguir mayúsculas) se selecciona directamente.
    const existing = units.find(
      (u) => u.code.toLowerCase() === clean.toLowerCase() || u.label.toLowerCase() === clean.toLowerCase(),
    )
    if (existing) {
      onChange(existing.code)
      setShowAdd(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await addUnit(clean)
      onChange(created.code)
      setShowAdd(false)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <select value={value} onChange={(e) => handleSelect(e.target.value)} className={className}>
        {!valueInCatalog && <option value={value}>{value}</option>}
        {units.map((u) => (
          <option key={u.code} value={u.code}>
            {u.label}
          </option>
        ))}
        <option value={ADD_NEW}>+ Añadir nueva unidad…</option>
      </select>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Añadir nueva unidad" width="max-w-sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-app-muted mb-1">Nombre de la unidad *</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSave()
                }
              }}
              placeholder="Ej: Atado, Libra, Quintal…"
              className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-[11px] text-app-subtle">
              La unidad queda guardada y disponible en todos los formularios.
            </p>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !newLabel.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar unidad'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
