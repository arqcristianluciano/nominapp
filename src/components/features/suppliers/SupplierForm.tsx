import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Supplier } from '@/types/database'
import { PAYMENT_CONDITIONS } from '@/constants/indirectCosts'
import { isRNC, isPhone } from '@/utils/validators'

interface Props {
  initial?: Supplier
  onSubmit: (data: {
    name: string
    rnc?: string
    contact_phone?: string
    bank_account?: string
    bank_name?: string
    payment_terms?: string
  }) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export function SupplierForm({ initial, onSubmit, onCancel, saving }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name || '')
  const [rnc, setRnc] = useState(initial?.rnc || '')
  const [phone, setPhone] = useState(initial?.contact_phone || '')
  const [bankAccount, setBankAccount] = useState(initial?.bank_account || '')
  const [bankName, setBankName] = useState(initial?.bank_name || '')
  const [terms, setTerms] = useState(initial?.payment_terms || '')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const rncTrimmed = rnc.trim()
    if (rncTrimmed && !isRNC(rncTrimmed)) {
      setFormError(t('suppliers.form.error_rnc'))
      return
    }

    const phoneTrimmed = phone.trim()
    if (phoneTrimmed && !isPhone(phoneTrimmed)) {
      setFormError(t('suppliers.form.error_phone'))
      return
    }

    await onSubmit({
      name,
      rnc: rnc || undefined,
      contact_phone: phone || undefined,
      bank_account: bankAccount || undefined,
      bank_name: bankName || undefined,
      payment_terms: terms || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-app-muted mb-1">{t('suppliers.form.name')} *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('suppliers.form.rnc')}</label>
          <input
            type="text"
            value={rnc}
            onChange={(e) => setRnc(e.target.value)}
            placeholder={t('suppliers.form.rnc_placeholder')}
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('suppliers.form.phone')}</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('suppliers.form.payment_terms')}</label>
          <select
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('suppliers.form.select_placeholder')}</option>
            {PAYMENT_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">{t('suppliers.form.bank')}</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-app-muted mb-1">{t('suppliers.form.account_number')}</label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {formError && (
        <div className="text-xs text-red-600 dark:text-red-400" role="alert">
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted">
          {t('suppliers.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving || !name}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? t('suppliers.form.saving') : initial ? t('suppliers.form.update') : t('suppliers.form.create')}
        </button>
      </div>
    </form>
  )
}
