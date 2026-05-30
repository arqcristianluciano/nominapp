import { useState } from 'react'
import type { Company } from '@/types/database'
import { isRNC } from '@/utils/validators'

interface Props {
  initial?: Company
  saving: boolean
  onSubmit: (data: Partial<Company>) => void
  onCancel: () => void
}

export function CompanyForm({ initial, saving, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name || '')
  const [rnc, setRnc] = useState(initial?.rnc || '')
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const nameTrimmed = name.trim()
    if (!nameTrimmed) {
      setFormError('El nombre de la empresa es obligatorio')
      return
    }

    const rncTrimmed = rnc.trim()
    if (rncTrimmed && !isRNC(rncTrimmed)) {
      setFormError('RNC inválido (9 u 11 dígitos)')
      return
    }

    onSubmit({
      name: nameTrimmed,
      rnc: rncTrimmed || null,
    })
  }

  const inputClass =
    'w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-app-muted mb-1 block">Nombre</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-app-muted mb-1 block">RNC</label>
          <input
            type="text"
            value={rnc}
            onChange={(e) => setRnc(e.target.value)}
            className={inputClass}
            placeholder="Opcional"
          />
        </div>
      </div>
      {formError && (
        <div className="text-xs text-red-600 dark:text-red-400" role="alert">
          {formError}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}
