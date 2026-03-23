import { useState } from 'react'
import type { Project } from '@/types/database'

interface Payload {
  project_id: string
  description: string
  requested_by: string
  required_date?: string
  notes?: string
}

interface Props {
  projects: Project[]
  onSubmit: (payload: Payload) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export function RequisitionForm({ projects, onSubmit, onCancel, saving }: Props) {
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [requiredDate, setRequiredDate] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      project_id: projectId,
      description,
      requested_by: requestedBy,
      required_date: requiredDate || undefined,
      notes: notes || undefined,
    })
  }

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Proyecto *</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required className={input}>
          <option value="">Seleccionar proyecto…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">¿Qué se necesita comprar? *</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} required
          placeholder="Ej: Materiales para estructura nivel 3" className={input} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Solicitado por *</label>
          <input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} required
            placeholder="Nombre" className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha requerida</label>
          <input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} className={input} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className={`${input} resize-none`} />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Crear solicitud'}
        </button>
      </div>
    </form>
  )
}
