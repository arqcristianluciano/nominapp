import { useState } from 'react'
import { Link } from 'react-router-dom'
import { calcInstallmentAmount } from '@/services/loanService'
import { formatRD } from '@/utils/currency'
import type { BankAccount, Contractor, LoanFrecuencia } from '@/types/database'

interface LoanFormValues {
  contractor_id: string
  principal: number
  interest_rate: number
  installments: number
  disbursed_date: string
  first_installment_date: string
  frecuencia: LoanFrecuencia
  disbursement_account_id: string
  notes: string
}

interface Props {
  contractors: Contractor[]
  bankAccounts: BankAccount[]
  saving: boolean
  onSubmit: (
    values: Omit<LoanFormValues, 'notes' | 'disbursement_account_id' | 'first_installment_date'> & {
      notes?: string
      disbursement_account_id?: string | null
      first_installment_date?: string | null
    },
  ) => Promise<void>
  onCancel: () => void
  /** Si se pasa, el formulario trabaja en modo edición */
  initialValues?: Partial<LoanFormValues>
  editMode?: boolean
}

const INITIAL: LoanFormValues = {
  contractor_id: '',
  principal: 0,
  interest_rate: 5,
  installments: 6,
  disbursed_date: new Date().toISOString().slice(0, 10),
  first_installment_date: '',
  frecuencia: 'mensual',
  disbursement_account_id: '',
  notes: '',
}

const FRECUENCIA_LABELS: Record<LoanFrecuencia, string> = {
  semanal: 'Semanal (cada 7 días)',
  quincenal: 'Quincenal (cada 15 días)',
  mensual: 'Mensual (cada mes)',
}

export function LoanForm({
  contractors,
  bankAccounts,
  saving,
  onSubmit,
  onCancel,
  initialValues,
  editMode = false,
}: Props) {
  const [form, setForm] = useState<LoanFormValues>({ ...INITIAL, ...initialValues })

  const set = (field: keyof LoanFormValues, value: string | number) => setForm((prev) => ({ ...prev, [field]: value }))

  const installmentAmount =
    form.principal > 0 && form.installments > 0
      ? calcInstallmentAmount(form.principal, form.interest_rate, form.installments)
      : 0

  const totalToPay = installmentAmount * form.installments

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMode && !form.contractor_id) return
    if (form.principal <= 0) return
    await onSubmit({
      contractor_id: form.contractor_id,
      principal: form.principal,
      interest_rate: form.interest_rate,
      installments: form.installments,
      disbursed_date: form.disbursed_date,
      first_installment_date: form.first_installment_date || null,
      frecuencia: form.frecuencia,
      disbursement_account_id: form.disbursement_account_id || null,
      notes: form.notes || undefined,
    })
  }

  const inputCls =
    'w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-app-muted mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!editMode && (
        <div>
          <label className={labelCls}>Contratista *</label>
          <select
            className={inputCls}
            value={form.contractor_id}
            onChange={(e) => set('contractor_id', e.target.value)}
            required
          >
            <option value="">Seleccionar...</option>
            {contractors
              .filter((c) => c.is_active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.specialty ? ` — ${c.specialty}` : ''}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Monto del préstamo (RD$) *</label>
          <input
            type="number"
            min="1"
            step="0.01"
            className={inputCls}
            value={form.principal || ''}
            onChange={(e) => set('principal', parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Tasa de interés (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className={inputCls}
            value={form.interest_rate}
            onChange={(e) => set('interest_rate', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Número de cuotas *</label>
          <input
            type="number"
            min="1"
            className={inputCls}
            value={form.installments}
            onChange={(e) => set('installments', parseInt(e.target.value) || 1)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Frecuencia de pago *</label>
          <select className={inputCls} value={form.frecuencia} onChange={(e) => set('frecuencia', e.target.value)}>
            {(Object.keys(FRECUENCIA_LABELS) as LoanFrecuencia[]).map((f) => (
              <option key={f} value={f}>
                {FRECUENCIA_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Fecha de desembolso *</label>
          <input
            type="date"
            className={inputCls}
            value={form.disbursed_date}
            onChange={(e) => set('disbursed_date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Cuenta de desembolso</label>
          <select
            className={inputCls}
            value={form.disbursement_account_id}
            onChange={(e) => set('disbursement_account_id', e.target.value)}
          >
            <option value="">Sin especificar</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.owner_name} — {a.bank_name}
              </option>
            ))}
          </select>
          {bankAccounts.length === 0 && (
            <p className="mt-1 text-[11px] text-app-subtle">
              No hay cuentas registradas todavía. Regístralas en{' '}
              <Link to="/configuracion" className="text-blue-600 hover:underline">
                Configuración → Cuentas bancarias
              </Link>{' '}
              para que el préstamo salga de una cuenta y los cobros entren a ella.
            </p>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>Fecha de la primera cuota (opcional)</label>
        <input
          type="date"
          className={inputCls}
          value={form.first_installment_date}
          onChange={(e) => set('first_installment_date', e.target.value)}
        />
        <p className="mt-1 text-[11px] text-app-subtle">
          Las demás cuotas se programan a partir de esta fecha según la frecuencia. Si la dejas vacía, la primera cuota
          cae un período después del desembolso.
        </p>
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
        <textarea
          className={inputCls}
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Motivo del préstamo..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || (!editMode && !form.contractor_id) || form.principal <= 0}
          className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : editMode ? 'Guardar cambios' : 'Crear préstamo'}
        </button>
      </div>
    </form>
  )
}
