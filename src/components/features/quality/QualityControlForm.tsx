import { useState } from 'react'
import type { QualityControl } from '@/types/database'

type FormData = Omit<QualityControl, 'id' | 'status'>

interface Props {
  initial?: QualityControl
  projectId: string
  saving: boolean
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

const TEST_AGES = ['7 días', '14 días', '21 días', '28 días']

export function QualityControlForm({ initial, projectId, saving, onSubmit, onCancel }: Props) {
  const [element, setElement] = useState(initial?.element || '')
  const [pourDate, setPourDate] = useState(initial?.pour_date || '')
  const [testDate, setTestDate] = useState(initial?.test_date || '')
  const [testAge, setTestAge] = useState(initial?.test_age || '28 días')
  const [expectedRes, setExpectedRes] = useState(initial?.expected_resistance?.toString() || '')
  const [actualRes, setActualRes] = useState(initial?.actual_resistance?.toString() || '')
  const [supplier, setSupplier] = useState(initial?.concrete_supplier || '')
  const [laboratory, setLaboratory] = useState(initial?.laboratory || '')
  const [notes, setNotes] = useState(initial?.notes || '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      project_id: projectId,
      element: element.toUpperCase(),
      pour_date: pourDate,
      test_date: testDate || null,
      test_age: testAge || null,
      expected_resistance: expectedRes ? Number(expectedRes) : null,
      actual_resistance: actualRes ? Number(actualRes) : null,
      concrete_supplier: supplier || null,
      laboratory: laboratory || null,
      notes: notes || null,
    })
  }

  const inputClass = 'w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  const labelClass = 'text-xs font-medium text-app-muted mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Elemento *</label>
        <input type="text" value={element} onChange={(e) => setElement(e.target.value)} placeholder="Ej: COLUMNA C-1 EJE A" className={inputClass} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Fecha de colada *</label>
          <input type="date" value={pourDate} onChange={(e) => setPourDate(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Resistencia esperada (kg/cm²) *</label>
          <input type="number" step="any" value={expectedRes} onChange={(e) => setExpectedRes(e.target.value)} placeholder="210" className={inputClass} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Edad de ensayo</label>
          <select value={testAge} onChange={(e) => setTestAge(e.target.value)} className={inputClass}>
            {TEST_AGES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fecha de ensayo</label>
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Resistencia real (kg/cm²)</label>
          <input type="number" step="any" value={actualRes} onChange={(e) => setActualRes(e.target.value)} placeholder="—" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Proveedor de hormigón</label>
          <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Laboratorio</label>
          <input type="text" value={laboratory} onChange={(e) => setLaboratory(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">Cancelar</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Registrar ensayo'}
        </button>
      </div>
    </form>
  )
}
