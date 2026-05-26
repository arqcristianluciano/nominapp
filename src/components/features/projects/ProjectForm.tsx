import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project, Company, CustomIndirect } from '@/types/database'
import { parseDecimalInput } from '@/utils/decimalInput'
import { CustomIndirectsSection } from './CustomIndirectsSection'

type ProjectFormData = {
  name: string
  code: string
  location: string
  company_id: string
  dt_percent: number
  admin_percent: number
  transport_percent: number
  planning_fee: number
  custom_indirects: CustomIndirect[]
  status?: 'active' | 'completed' | 'paused'
  new_company?: { name: string; rnc: string | null }
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

function generateCodeFromName(name: string): string {
  const initials = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/\s+/)
    .map((word) => word.match(/[A-Z]/)?.[0] || '')
    .join('')
    .slice(0, 4)
  if (!initials) return ''
  return `${initials}-${new Date().getFullYear()}`
}

export function ProjectForm({ initial, onSubmit, onCancel, saving }: Props) {
  const [name, setName] = useState(initial?.name || '')
  const [code, setCode] = useState(initial?.code || '')
  const [codeTouched, setCodeTouched] = useState(!!initial?.code)
  const [location, setLocation] = useState(initial?.location || '')
  const [dtPercent, setDtPercent] = useState(initial?.dt_percent ?? 10)
  const [adminPercent, setAdminPercent] = useState(initial?.admin_percent ?? 1)
  const [transportPercent, setTransportPercent] = useState(initial?.transport_percent ?? 0.5)
  const [planningFee, setPlanningFee] = useState<string>(
    initial?.planning_fee != null ? String(initial.planning_fee) : '0',
  )
  const [customIndirects, setCustomIndirects] = useState<CustomIndirect[]>(initial?.custom_indirects ?? [])
  const [status, setStatus] = useState<'active' | 'completed' | 'paused'>(initial?.status || 'active')
  const [companies, setCompanies] = useState<Company[]>([])
  const [companiesLoaded, setCompaniesLoaded] = useState(false)
  const [companyId, setCompanyId] = useState(initial?.company_id || '')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyRnc, setNewCompanyRnc] = useState('')

  // Reset all form fields when the edited entity changes (or switches to create
  // mode), so a reused mounted form does not keep the previous project's values.
  useEffect(() => {
    setName(initial?.name || '')
    setCode(initial?.code || '')
    setCodeTouched(!!initial?.code)
    setLocation(initial?.location || '')
    setDtPercent(initial?.dt_percent ?? 10)
    setAdminPercent(initial?.admin_percent ?? 1)
    setTransportPercent(initial?.transport_percent ?? 0.5)
    setPlanningFee(initial?.planning_fee != null ? String(initial.planning_fee) : '0')
    setCustomIndirects(initial?.custom_indirects ?? [])
    setStatus(initial?.status || 'active')
    setCompanyId(initial?.company_id || '')
    setNewCompanyName('')
    setNewCompanyRnc('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id])

  const isEditing = !!initial
  const needsNewCompany = !isEditing && companiesLoaded && companies.length === 0

  useEffect(() => {
    if (isEditing) return
    supabase.from('companies').select('*').order('name').then(({ data }: { data: Company[] | null }) => {
      if (data && data.length > 0) {
        setCompanies(data)
        setCompanyId((prev) => prev || data[0].id)
      }
      setCompaniesLoaded(true)
    })
  }, [isEditing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedNewCompanyName = newCompanyName.trim()
    const planningFeeParsed = planningFee.trim() ? parseDecimalInput(planningFee) : 0
    onSubmit({
      name: name.toUpperCase(),
      code: code.toUpperCase(),
      location,
      company_id: companyId,
      dt_percent: dtPercent,
      admin_percent: adminPercent,
      transport_percent: transportPercent,
      planning_fee: planningFeeParsed ?? 0,
      custom_indirects: customIndirects.filter((c) => c.name.trim() && c.value > 0),
      status,
      new_company: needsNewCompany && trimmedNewCompanyName
        ? { name: trimmedNewCompanyName, rnc: newCompanyRnc.trim() || null }
        : undefined,
    })
  }

  const submitDisabled =
    saving ||
    !name ||
    !code ||
    (!isEditing && !companiesLoaded) ||
    (needsNewCompany && !newCompanyName.trim()) ||
    (!isEditing && !needsNewCompany && !companyId)

  const inputClass = 'w-full px-3 py-2 border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  const labelClass = 'text-xs font-medium text-app-muted mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Nombre del proyecto *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              const nextName = e.target.value
              setName(nextName)
              if (!isEditing && !codeTouched) {
                setCode(generateCodeFromName(nextName))
              }
            }}
            className={inputClass}
            placeholder="Ej: RESIDENCIA MARTÍNEZ"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Código *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeTouched(true) }}
            className={inputClass}
            placeholder="Ej: RM-2026"
            required
          />
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
        {!isEditing && companies.length > 0 && (
          <div className="col-span-2">
            <label className={labelClass}>Empresa</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        {needsNewCompany && (
          <>
            <div className="col-span-2">
              <p className="text-xs text-app-muted">No hay empresas registradas. Crea la primera empresa al registrar este proyecto.</p>
            </div>
            <div>
              <label className={labelClass}>Nombre de la empresa *</label>
              <input type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className={inputClass} placeholder="Ej: MI EMPRESA, S.R.L." required />
            </div>
            <div>
              <label className={labelClass}>RNC (opcional)</label>
              <input type="text" value={newCompanyRnc} onChange={(e) => setNewCompanyRnc(e.target.value)} className={inputClass} placeholder="Ej: 1-32-66032-3" />
            </div>
          </>
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
            <input type="text" inputMode="decimal" placeholder="0,00" value={planningFee} onChange={(e) => setPlanningFee(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-app-border">
          <p className="text-xs font-semibold text-app-muted uppercase tracking-wider mb-3">Otros gastos indirectos</p>
          <CustomIndirectsSection items={customIndirects} onChange={setCustomIndirects} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">
          Cancelar
        </button>
        <button type="submit" disabled={submitDisabled} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proyecto'}
        </button>
      </div>
    </form>
  )
}
