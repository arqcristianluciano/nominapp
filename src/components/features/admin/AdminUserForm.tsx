import { useState, type FormEvent } from 'react'
import { adminService, type AdminUser } from '@/services/adminService'
import { useToast } from '@/components/ui/Toast'
import { parseDecimalInput } from '@/utils/decimalInput'
import { isCedula, isEmail, isPhone } from '@/utils/validators'

interface Props {
  mode: 'create' | 'edit'
  initial?: AdminUser
  onCancel: () => void
  onSaved: () => void | Promise<void>
}

interface FormState {
  email: string
  password: string
  display_name: string
  first_name: string
  last_name: string
  cedula: string
  passport: string
  phone: string
  job_title: string
  hire_date: string
  is_active: boolean
  salary: string
  payment_terms: string
}

function emptyForm(initial?: AdminUser): FormState {
  return {
    email: '',
    password: '',
    display_name: initial?.display_name ?? '',
    first_name: initial?.first_name ?? '',
    last_name: initial?.last_name ?? '',
    cedula: initial?.cedula ?? '',
    passport: initial?.passport ?? '',
    phone: initial?.phone ?? '',
    job_title: initial?.job_title ?? '',
    hire_date: initial?.hire_date ?? '',
    is_active: initial?.is_active ?? true,
    salary: initial?.salary != null ? String(initial.salary) : '',
    payment_terms: initial?.payment_terms ?? '',
  }
}

const input = 'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'text-xs font-medium text-app-muted mb-1 block'

type SetField = <K extends keyof FormState>(key: K, value: FormState[K]) => void

interface SectionProps {
  form: FormState
  set: SetField
}

function CredentialsSection({ form, set }: SectionProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
      <div className="col-span-2 text-xs text-blue-700 dark:text-blue-300">Credenciales de acceso (la persona inicia sesión con estos datos).</div>
      <div>
        <label className={label}>Email *</label>
        <input className={input} type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="empleado@empresa.com" />
      </div>
      <div>
        <label className={label}>Contraseña inicial *</label>
        <input className={input} type="text" required value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" />
      </div>
    </div>
  )
}

function BasicDataSection({ form, set }: SectionProps) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-app-subtle mb-2">Datos básicos</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Nombre *</label>
          <input className={input} required value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Juan" />
        </div>
        <div>
          <label className={label}>Apellido *</label>
          <input className={input} required value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Pérez" />
        </div>
        <div>
          <label className={label}>Cédula</label>
          <input className={input} value={form.cedula} onChange={(e) => set('cedula', e.target.value)} placeholder="001-1234567-8" />
        </div>
        <div>
          <label className={label}>Pasaporte</label>
          <input className={input} value={form.passport} onChange={(e) => set('passport', e.target.value)} placeholder="A12345678" />
        </div>
        <div>
          <label className={label}>Teléfono</label>
          <input className={input} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="809-555-0000" />
        </div>
        <div>
          <label className={label}>Nombre para mostrar</label>
          <input className={input} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="Se autocompleta con nombre+apellido" />
        </div>
      </div>
    </div>
  )
}

interface WorkDataSectionProps extends SectionProps {
  isCreate: boolean
}

function WorkDataSection({ form, set, isCreate }: WorkDataSectionProps) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-app-subtle mb-2">Datos laborales</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Puesto / Título</label>
          <input className={input} value={form.job_title} onChange={(e) => set('job_title', e.target.value)} placeholder="Maestro de obra" />
        </div>
        <div>
          <label className={label}>Fecha de ingreso</label>
          <input className={input} type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} />
        </div>
        {!isCreate && (
          <div className="col-span-2 flex items-center gap-2">
            <input id="is_active" type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="is_active" className="text-sm text-app-text">Empleado activo</label>
          </div>
        )}
      </div>
    </div>
  )
}

function FinancialDataSection({ form, set }: SectionProps) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-app-subtle mb-2">Datos financieros</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Salario</label>
          <input className={input} type="text" inputMode="decimal" value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="0,00" />
        </div>
        <div>
          <label className={label}>Condición de pago</label>
          <input className={input} value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} placeholder="Quincenal · Transferencia" />
        </div>
      </div>
    </div>
  )
}

export function AdminUserForm({ mode, initial, onCancel, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm(initial))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { error } = useToast()

  const isCreate = mode === 'create'

  const set: SetField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setFormError(null)
    setSaving(true)
    try {
      const displayName =
        form.display_name.trim() ||
        `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
      if (!displayName) {
        const msg = 'El nombre para mostrar no puede quedar vacío'
        setFormError(msg)
        error(msg)
        setSaving(false)
        return
      }
      const salaryTrim = form.salary.trim()
      let salaryNum: number | null = null
      if (salaryTrim) {
        const parsed = parseDecimalInput(salaryTrim)
        if (parsed === null) {
          const msg = 'Salario inválido'
          setFormError(msg)
          error(msg)
          setSaving(false)
          return
        }
        salaryNum = parsed
      }

      const cedulaTrimmed = form.cedula.trim()
      if (cedulaTrimmed && !isCedula(cedulaTrimmed)) {
        const msg = 'Cédula inválida (formato 000-0000000-0)'
        setFormError(msg)
        error(msg)
        setSaving(false)
        return
      }

      const phoneTrimmed = form.phone.trim()
      if (phoneTrimmed && !isPhone(phoneTrimmed)) {
        const msg = 'Teléfono inválido (10 dígitos)'
        setFormError(msg)
        error(msg)
        setSaving(false)
        return
      }

      if (isCreate) {
        if (!form.email.trim() || !form.password) {
          const msg = 'Email y contraseña inicial son obligatorios'
          setFormError(msg)
          error(msg)
          setSaving(false)
          return
        }
        if (!isEmail(form.email.trim())) {
          const msg = 'Email inválido'
          setFormError(msg)
          error(msg)
          setSaving(false)
          return
        }
        await adminService.createUser({
          email: form.email.trim(),
          password: form.password,
          display_name: displayName,
          first_name: form.first_name.trim() || undefined,
          last_name: form.last_name.trim() || undefined,
          cedula: form.cedula.trim() || undefined,
          passport: form.passport.trim() || undefined,
          phone: form.phone.trim() || undefined,
          job_title: form.job_title.trim() || undefined,
          hire_date: form.hire_date || undefined,
          salary: salaryNum ?? undefined,
          payment_terms: form.payment_terms.trim() || undefined,
        })
      } else if (initial) {
        await adminService.updateUserProfile(initial.id, {
          display_name: displayName,
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          cedula: form.cedula.trim() || null,
          passport: form.passport.trim() || null,
          phone: form.phone.trim() || null,
          job_title: form.job_title.trim() || null,
          hire_date: form.hire_date || null,
          salary: salaryNum,
          payment_terms: form.payment_terms.trim() || null,
          is_active: form.is_active,
        })
      }
      await onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar'
      error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isCreate && <CredentialsSection form={form} set={set} />}

      <BasicDataSection form={form} set={set} />

      <WorkDataSection form={form} set={set} isCreate={isCreate} />

      <FinancialDataSection form={form} set={set} />

      {formError && (
        <div className="text-xs text-red-600 dark:text-red-400" role="alert">{formError}</div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-app-border rounded-lg text-app-muted hover:bg-app-hover">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
          {saving ? 'Guardando...' : (isCreate ? 'Crear usuario' : 'Guardar cambios')}
        </button>
      </div>
    </form>
  )
}
