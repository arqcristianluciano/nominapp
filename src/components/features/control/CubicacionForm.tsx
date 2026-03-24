import { useState } from 'react'
import type { Contractor } from '@/types/database'

interface CubicacionFormData {
  contractor_id: string
  specialty: string
  original_budget: number
  adjusted_budget: number
  total_advanced: number
}

interface Props {
  initial?: Partial<CubicacionFormData & { id: string }>
  contractors: Contractor[]
  saving: boolean
  onSubmit: (data: CubicacionFormData) => void
  onCancel: () => void
}

export function CubicacionForm({ initial, contractors, saving, onSubmit, onCancel }: Props) {
  const [contractorId, setContractorId] = useState(initial?.contractor_id || '')
  const [specialty, setSpecialty] = useState(initial?.specialty || '')
  const [originalBudget, setOriginalBudget] = useState(initial?.original_budget?.toString() || '')
  const [adjustedBudget, setAdjustedBudget] = useState(initial?.adjusted_budget?.toString() || '')
  const [totalAdvanced, setTotalAdvanced] = useState(initial?.total_advanced?.toString() || '0')

  function handleContractorChange(id: string) {
    setContractorId(id)
    const c = contractors.find((c) => c.id === id)
    if (c && !specialty) setSpecialty(c.specialty || '')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const original = Number(originalBudget) || 0
    onSubmit({
      contractor_id: contractorId,
      specialty: specialty.toUpperCase(),
      original_budget: original,
      adjusted_budget: Number(adjustedBudget) || original,
      total_advanced: Number(totalAdvanced) || 0,
    })
  }

  const inputClass = 'w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  const labelClass = 'text-xs font-medium text-app-muted mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Contratista *</label>
        <select value={contractorId} onChange={(e) => handleContractorChange(e.target.value)} className={inputClass} required>
          <option value="">Seleccionar contratista...</option>
          {contractors.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.specialty}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}>Especialidad / Trabajo *</label>
        <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ej: ESTRUCTURA DE HORMIGÓN ARMADO" className={inputClass} required />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Presupuesto original (RD$)</label>
          <input type="number" step="any" value={originalBudget} onChange={(e) => setOriginalBudget(e.target.value)} placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Presupuesto ajustado (RD$)</label>
          <input type="number" step="any" value={adjustedBudget} onChange={(e) => setAdjustedBudget(e.target.value)} placeholder="Igual al original" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Total avanzado (RD$)</label>
          <input type="number" step="any" value={totalAdvanced} onChange={(e) => setTotalAdvanced(e.target.value)} placeholder="0" className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">Cancelar</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : initial?.id ? 'Actualizar' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}
