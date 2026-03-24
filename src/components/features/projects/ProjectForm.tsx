import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project, Company } from '@/types/database'

type ProjectFormData = {
  name: string
  code: string
  location: string
  company_id: string
  dt_percent: number
  admin_percent: number
  transport_percent: number
  planning_fee: number
  status?: 'active' | 'completed' | 'paused'
}

interface Props {
  initial?: Project
  onSubmit: (data: ProjectFormData) => void
  onCancel: () => void
  saving: boolean
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Completado' },
]

export function ProjectForm({ initial, onSubmit, onCancel, saving }: Props) {
  const [name, setName] = useState(initial?.name || '')
  const [code, setCode] = useState(initial?.code || '')
  const [location, setLocation] = useState(initial?.location || '')
  const [dtPercent, setDtPercent] = useState(initial?.dt_percent ?? 10)
  const [adminPercent, setAdminPercent] = useState(initial?.admin_percent ?? 1)
  const [transportPercent, setTransportPercent] = useState(initial?.transport_percent ?? 0.5)
  const [planningFee, setPlanningFee] = useState(initial?.planning_fee ?? 0)
  const [status, setStatus] = useState<'active' | 'completed' | 'paused'>(initial?.status || 'active')
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyId] = useState(initial?.company_id || '')

  const isEditing = !!initial

  useEffect(() => {
    if (isEditing) return
    supabase.from('companies').select('*').order('name').then(({ data }) => {
      if (data && data.length > 0) {
        setCompanies(data as Company[])
        setCompanyId((prev) => prev || data[0].id)
      }
    })
  }, [isEditing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name: name.toUpperCase(),
      code: code.toUpperCase(),
      location,
      company_id: companyId,
      dt_percent: dtPercent,
      admin_percent: adminPercent,
      transport_percent: transportPercent,
      planning_fee: planningFee,
      status,
    })
  }

  const inputClass = 'w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  const labelClass = 'text-xs font-medium text-app-muted mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Nombre del proyecto *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ej: RESIDENCIA MARTÍNEZ" required />
        </div>
        <div>
          <label className={labelClass}>Código *</label>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} placeholder="Ej: RM-2026" required />
        </div>
        <div>
          <label className={labelClass}>Ubicación</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Ej: Santo Domingo" />
        </div>
        {isEditing && (
          <div>
            <label className={labelClass}>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputClass}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        {!isEditing && companies.length > 1 && (
          <div className="col-span-2">
            <label className={labelClass}>Empresa</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="border-t border-app-border pt-4">
        <p className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Gastos indirectos</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Dirección técnica %</label>
            <input type="number" step="0.1" min="0" max="100" value={dtPercent} onChange={(e) => setDtPercent(Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Administración %</label>
            <input type="number" step="0.1" min="0" max="100" value={adminPercent} onChange={(e) => setAdminPercent(Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Transporte %</label>
            <input type="number" step="0.1" min="0" max="100" value={transportPercent} onChange={(e) => setTransportPercent(Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Planificación (RD$)</label>
            <input type="number" step="any" min="0" value={planningFee} onChange={(e) => setPlanningFee(Number(e.target.value))} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">
          Cancelar
        </button>
        <button type="submit" disabled={saving || !name || !code} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proyecto'}
        </button>
      </div>
    </form>
  )
}
