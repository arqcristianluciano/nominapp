import { useState } from 'react'
import { calcInstallmentAmount } from '@/services/loanService'
import { formatRD } from '@/utils/currency'
import type { Contractor } from '@/types/database'

interface LoanFormValues {
  contractor_id: string
  principal: number
  interest_rate: number
  installments: number
  disbursed_date: string
  notes: string
}

interface Props {
  contractors: Contractor[]
  saving: boolean
  onSubmit: (values: Omit<LoanFormValues, 'notes'> & { notes?: string }) => Promise<void>
  onCancel: () => void
}

const INITIAL: LoanFormValues = {
  contractor_id: '',
  principal: 0,
  interest_rate: 5,
  installments: 6,
  disbursed_date: new Date().toISOString().slice(0, 10),
  notes: '',
}

export function LoanForm({ contractors, saving, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<LoanFormValues>(INITIAL)

  const set = (field: keyof LoanFormValues, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const installmentAmount = form.principal > 0 && form.installments > 0
    ? calcInstallmentAmount(form.principal, form.interest_rate, form.installments)
    : 0

  const totalToPay = installmentAmount * form.installments

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contractor_id || form.principal <= 0) return
    await onSubmit({
      contractor_id: form.contractor_id,
      principal: form.principal,
      interest_rate: form.interest_rate,
      installments: form.installments,
      disbursed_date: form.disbursed_date,
      notes: form.notes || undefined,
    })
  }

  const inputCls = 'w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-app-muted mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Contratista *</label>
        <select className={inputCls} value={form.contractor_id} onChange={e => set('contractor_id', e.target.value)} required>
          <option value="">Seleccionar...</option>
          {contractors.filter(c => c.is_active).map(c => (
            <option key={c.id} value={c.id}>{c.name}{c.specialty ? ` — ${c.specialty}` : ''}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Monto del préstamo (RD$) *</label>
          <input type="number" min="1" step="0.01" className={inputCls} value={form.principal || ''} onChange={e => set('principal', parseFloat(e.target.value) || 0)} required />
        </div>
        <div>
          <label className={labelCls}>Tasa de interés (%)</label>
          <input type="number" min="0" max="100" step="0.1" className={inputCls} value={form.interest_rate} onChange={e => set('interest_rate', parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Número de cuotas *</label>
          <input type="number" min="1" className={inputCls} value={form.installments} onChange={e => set('installments', parseInt(e.target.value) || 1)} required />
        </div>
        <div>
          <label className={labelCls}>Fecha de desembolso *</label>
          <input type="date" className={inputCls} value={form.disbursed_date} onChange={e => set('disbursed_date', e.target.value)} required />
        </div>
      </div>

      {installmentAmount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-4 py-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400">Cuota por período</p>
            <p className="font-semibold text-blue-900 dark:text-blue-100">{formatRD(installmentAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400">Total a pagar</p>
            <p className="font-semibold text-blue-900 dark:text-blue-100">{formatRD(totalToPay)}</p>
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Notas</label>
        <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Motivo del préstamo..." />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">Cancelar</button>
        <button type="submit" disabled={saving || !form.contractor_id || form.principal <= 0} className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Crear préstamo'}
        </button>
      </div>
    </form>
  )
}
