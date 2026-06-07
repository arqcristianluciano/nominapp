import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { adminService, type AdminUser } from '@/services/adminService'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/Toast'
import { parseDecimalInput } from '@/utils/decimalInput'
import { isCedula, isEmail, isPhone, isStrongPassword } from '@/utils/validators'

type CreateMode = 'password' | 'invite'

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

const input =
  'w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'text-xs font-medium text-app-muted mb-1 block'

type SetField = <K extends keyof FormState>(key: K, value: FormState[K]) => void

interface SectionProps {
  form: FormState
  set: SetField
}

interface CredentialsSectionProps extends SectionProps {
  createMode: CreateMode
}

function CredentialsSection({ form, set, createMode }: CredentialsSectionProps) {
  const { t } = useTranslation()
  const isInvite = createMode === 'invite'
  return (
    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
      <div className="col-span-2 text-xs text-blue-700 dark:text-blue-300">
        {isInvite ? t('admin.form.credentials_invite_hint') : t('admin.form.credentials_password_hint')}
      </div>
      <div className={isInvite ? 'col-span-2' : ''}>
        <label className={label}>{t('admin.form.email')} *</label>
        <input
          className={input}
          type="email"
          required
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder={t('admin.form.email_placeholder')}
        />
      </div>
      {!isInvite && (
        <div>
          <label className={label}>{t('admin.form.initial_password')} *</label>
          <input
            className={input}
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder={t('admin.form.password_placeholder')}
          />
        </div>
      )}
    </div>
  )
}

interface CreateModeTabsProps {
  mode: CreateMode
  onChange: (next: CreateMode) => void
}

function CreateModeTabs({ mode, onChange }: CreateModeTabsProps) {
  const { t } = useTranslation()
  const baseBtn =
    'flex-1 px-3 py-2 text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
  const active = 'bg-blue-600 text-white border-blue-600'
  const inactive = 'bg-app-bg text-app-muted border-app-border hover:bg-app-hover'
  return (
    <div className="flex rounded-lg overflow-hidden" role="tablist" aria-label={t('admin.form.tabs_label')}>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'password'}
        onClick={() => onChange('password')}
        className={`${baseBtn} rounded-l-lg ${mode === 'password' ? active : inactive}`}
      >
        {t('admin.form.create_with_password')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'invite'}
        onClick={() => onChange('invite')}
        className={`${baseBtn} rounded-r-lg ${mode === 'invite' ? active : inactive}`}
      >
        {t('admin.form.invite_by_email')}
      </button>
    </div>
  )
}

function BasicDataSection({ form, set }: SectionProps) {
  const { t } = useTranslation()
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-app-subtle mb-2">{t('admin.form.basic_data')}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('admin.form.first_name')} *</label>
          <input
            className={input}
            required
            value={form.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            placeholder={t('admin.form.first_name_placeholder')}
          />
        </div>
        <div>
          <label className={label}>{t('admin.form.last_name')} *</label>
          <input
            className={input}
            required
            value={form.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            placeholder={t('admin.form.last_name_placeholder')}
          />
        </div>
        <div>
          <label className={label}>{t('admin.form.cedula')}</label>
          <input
            className={input}
            value={form.cedula}
            onChange={(e) => set('cedula', e.target.value)}
            placeholder={t('admin.form.cedula_placeholder')}
          />
        </div>
        <div>
          <label className={label}>{t('admin.form.passport')}</label>
          <input
            className={input}
            value={form.passport}
            onChange={(e) => set('passport', e.target.value)}
            placeholder={t('admin.form.passport_placeholder')}
          />
        </div>
        <div>
          <label className={label}>{t('admin.form.phone')}</label>
          <input
            className={input}
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder={t('admin.form.phone_placeholder')}
          />
        </div>
        <div>
          <label className={label}>{t('admin.form.display_name')}</label>
          <input
            className={input}
            value={form.display_name}
            onChange={(e) => set('display_name', e.target.value)}
            placeholder={t('admin.form.display_name_placeholder')}
          />
        </div>
      </div>
    </div>
  )
}

interface WorkDataSectionProps extends SectionProps {
  isCreate: boolean
}

function WorkDataSection({ form, set, isCreate }: WorkDataSectionProps) {
  const { t } = useTranslation()
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-app-subtle mb-2">{t('admin.form.work_data')}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('admin.form.job_title')}</label>
          <input
            className={input}
            value={form.job_title}
            onChange={(e) => set('job_title', e.target.value)}
            placeholder={t('admin.form.job_title_placeholder')}
          />
        </div>
        <div>
          <label className={label}>{t('admin.form.hire_date')}</label>
          <input
            className={input}
            type="date"
            value={form.hire_date}
            onChange={(e) => set('hire_date', e.target.value)}
          />
        </div>
        {!isCreate && (
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="is_active" className="text-sm text-app-text">
              {t('admin.form.active_employee')}
            </label>
          </div>
        )}
      </div>
    </div>
  )
}

function FinancialDataSection({ form, set }: SectionProps) {
  const { t } = useTranslation()
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-app-subtle mb-2">
        {t('admin.form.financial_data')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t('admin.form.salary')}</label>
          <input
            className={input}
            type="text"
            inputMode="decimal"
            value={form.salary}
            onChange={(e) => set('salary', e.target.value)}
            placeholder={t('admin.form.salary_placeholder')}
          />
        </div>
        <div>
          <label className={label}>{t('admin.form.payment_terms')}</label>
          <input
            className={input}
            value={form.payment_terms}
            onChange={(e) => set('payment_terms', e.target.value)}
            placeholder={t('admin.form.payment_terms_placeholder')}
          />
        </div>
      </div>
    </div>
  )
}

export function AdminUserForm({ mode, initial, onCancel, onSaved }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(emptyForm(initial))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createMode, setCreateMode] = useState<CreateMode>('password')
  const { error } = useToast()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  const isCreate = mode === 'create'
  const isInvite = isCreate && createMode === 'invite'

  const set: SetField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setFormError(null)
    setSaving(true)
    try {
      const displayName = form.display_name.trim() || `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
      if (!displayName && !isInvite) {
        const msg = t('admin.form.errors.display_name_empty')
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
          const msg = t('admin.form.errors.invalid_salary')
          setFormError(msg)
          error(msg)
          setSaving(false)
          return
        }
        salaryNum = parsed
      }

      const cedulaTrimmed = form.cedula.trim()
      if (cedulaTrimmed && !isCedula(cedulaTrimmed)) {
        const msg = t('admin.form.errors.invalid_cedula')
        setFormError(msg)
        error(msg)
        setSaving(false)
        return
      }

      const phoneTrimmed = form.phone.trim()
      if (phoneTrimmed && !isPhone(phoneTrimmed)) {
        const msg = t('admin.form.errors.invalid_phone')
        setFormError(msg)
        error(msg)
        setSaving(false)
        return
      }

      if (isCreate) {
        const emailTrim = form.email.trim()
        if (!emailTrim) {
          const msg = t('admin.form.errors.email_required')
          setFormError(msg)
          error(msg)
          setSaving(false)
          return
        }
        if (!isEmail(emailTrim)) {
          const msg = t('admin.form.errors.invalid_email')
          setFormError(msg)
          error(msg)
          setSaving(false)
          return
        }
        if (isInvite) {
          await adminService.inviteUser(emailTrim)
        } else {
          if (!form.password) {
            const msg = t('admin.form.errors.password_required')
            setFormError(msg)
            error(msg)
            setSaving(false)
            return
          }
          if (!isStrongPassword(form.password)) {
            const msg = t('admin.form.errors.weak_password')
            setFormError(msg)
            error(msg)
            setSaving(false)
            return
          }
          await adminService.createUser({
            email: emailTrim,
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
        }
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
        // D6: si el usuario editó su propio perfil, refrescamos la sesión para
        // que los cambios apliquen sin tener que cerrar y volver a entrar.
        if (initial.id === currentUserId) await refreshUser()
      }
      await onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.form.errors.save_failed')
      error(msg)
    } finally {
      setSaving(false)
    }
  }

  const submitLabel = saving
    ? t('admin.form.saving')
    : !isCreate
      ? t('admin.form.save_changes')
      : isInvite
        ? t('admin.form.send_invitation')
        : t('admin.form.create_user')

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isCreate && <CreateModeTabs mode={createMode} onChange={setCreateMode} />}

      {isCreate && <CredentialsSection form={form} set={set} createMode={createMode} />}

      {!isInvite && <BasicDataSection form={form} set={set} />}

      {!isInvite && <WorkDataSection form={form} set={set} isCreate={isCreate} />}

      {!isInvite && <FinancialDataSection form={form} set={set} />}

      {formError && (
        <div className="text-xs text-red-600 dark:text-red-400" role="alert">
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-app-border rounded-lg text-app-muted hover:bg-app-hover"
        >
          {t('admin.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
