import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Contractor } from '@/types/database'
import { contractorService } from '@/services/contractorService'
import { isCedula, isPhone } from '@/utils/validators'

interface Props {
  initial?: Contractor
  onSubmit: (data: {
    name: string
    specialty?: string
    cedula?: string
    phone?: string
    bank_account?: string
    bank_name?: string
    payment_method?: 'cash' | 'check' | 'transfer'
    notes?: string
    parent_contractor_id?: string | null
  }) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export function ContractorForm({ initial, onSubmit, onCancel, saving }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name || '')
  const [specialty, setSpecialty] = useState(initial?.specialty || '')
  const [cedula, setCedula] = useState(initial?.cedula || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [bankAccount, setBankAccount] = useState(initial?.bank_account || '')
  const [bankName, setBankName] = useState(initial?.bank_name || '')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'transfer'>(initial?.payment_method || 'cash')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [parentContractorId, setParentContractorId] = useState<string>(initial?.parent_contractor_id ?? '')
  const [parentOptions, setParentOptions] = useState<Contractor[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    contractorService.getAll().then((all) => {
      if (cancelled) return
      setParentOptions(all.filter((c) => c.id !== initial?.id))
    }).catch(() => {
      if (!cancelled) setParentOptions([])
    })
    return () => {
      cancelled = true
    }
  }, [initial?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const cedulaTrimmed = cedula.trim()
    if (cedulaTrimmed && !isCedula(cedulaTrimmed)) {
      setFormError(t('contractors.form.error_cedula'))
      return
    }

    const phoneTrimmed = phone.trim()
    if (phoneTrimmed && !isPhone(phoneTrimmed)) {
      setFormError(t('contractors.form.error_phone'))
      return
    }

    await onSubmit({
      name,
      specialty: specialty || undefined,
      cedula: cedula || undefined,
      phone: phone || undefined,
      bank_account: bankAccount || undefined,
      bank_name: bankName || undefined,
      payment_method: paymentMethod,
      notes: notes || undefined,
      parent_contractor_id: parentContractorId ? parentContractorId : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-app-muted mb-1">{t('contractors.form.name')} *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('contractors.form.specialty')}</label>
          <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder={t('contractors.form.specialty_placeholder')} className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('contractors.form.cedula')}</label>
          <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder={t('contractors.form.cedula_placeholder')} className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('contractors.form.phone')}</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('contractors.form.payment_method')}</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'check' | 'transfer')} className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="cash">{t('contractors.payment_methods.cash')}</option>
            <option value="check">{t('contractors.payment_methods.check')}</option>
            <option value="transfer">{t('contractors.payment_methods.transfer')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('contractors.form.bank')}</label>
          <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('contractors.form.account_number')}</label>
          <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-app-muted mb-1">{t('contractors.form.parent_contractor')}</label>
          <select value={parentContractorId} onChange={(e) => setParentContractorId(e.target.value)} className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{t('contractors.form.no_parent')}</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-app-muted mb-1">{t('contractors.form.notes')}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {formError && (
        <div className="text-xs text-red-600 dark:text-red-400" role="alert">{formError}</div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted">{t('contractors.form.cancel')}</button>
        <button type="submit" disabled={saving || !name} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? t('contractors.form.saving') : initial ? t('contractors.form.update') : t('contractors.form.create')}
        </button>
      </div>
    </form>
  )
}
