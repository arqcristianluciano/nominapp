import { useMemo, useState } from 'react'
import type { Beneficiary } from '@/services/paymentDistributionService'
import type { BankAccount } from '@/types/database'
import { getErrorMessage } from '@/utils/errors'

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'check', label: 'Cheque' },
  { value: 'deposit', label: 'Depósito' },
  { value: 'cash', label: 'Efectivo' },
] as const

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export interface DistributionFormValues {
  beneficiary: string
  beneficiary_type: 'contractor' | 'supplier'
  beneficiary_id: string
  bank_name: string | null
  bank_account: string | null
  beneficiary_doc: string | null
  /** Cuenta interna desde la que sale el pago (opcional). */
  bank_account_id: string | null
  amount: number
  payment_method: PaymentMethod
  check_number: string | null
}

interface Props {
  beneficiaries: Beneficiary[]
  sourceAccounts: BankAccount[]
  pendiente: number
  saving: boolean
  onSubmit: (values: DistributionFormValues) => Promise<void>
  onCancel: () => void
}

const inputClass = 'px-2 py-1.5 border border-app-border rounded text-xs focus:ring-1 focus:ring-blue-500'
const keyOf = (b: Pick<Beneficiary, 'type' | 'id'>) => `${b.type}:${b.id}`
const hasBank = (b: Beneficiary) => Boolean(b.bank_name || b.bank_account)

export function DistributionForm({ beneficiaries, sourceAccounts, pendiente, saving, onSubmit, onCancel }: Props) {
  const [beneficiaryKey, setBeneficiaryKey] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [checkNumber, setCheckNumber] = useState('')
  const [error, setError] = useState<string | null>(null)

  const contractors = useMemo(() => beneficiaries.filter((b) => b.type === 'contractor'), [beneficiaries])
  const suppliers = useMemo(() => beneficiaries.filter((b) => b.type === 'supplier'), [beneficiaries])
  const selected = useMemo(
    () => beneficiaries.find((b) => keyOf(b) === beneficiaryKey) ?? null,
    [beneficiaries, beneficiaryKey],
  )

  function handleBeneficiaryChange(key: string) {
    setBeneficiaryKey(key)
    const next = beneficiaries.find((b) => keyOf(b) === key)
    if (next?.payment_method) setMethod(next.payment_method)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) {
      setError('Selecciona un beneficiario.')
      return
    }
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('El monto debe ser mayor que cero.')
      return
    }
    if (numericAmount > pendiente + 0.0001) {
      setError('El monto excede lo pendiente por distribuir.')
      return
    }
    setError(null)
    try {
      await onSubmit({
        beneficiary: selected.name,
        beneficiary_type: selected.type,
        beneficiary_id: selected.id,
        bank_name: selected.bank_name,
        bank_account: selected.bank_account,
        beneficiary_doc: selected.doc,
        bank_account_id: sourceAccountId || null,
        amount: numericAmount,
        payment_method: method,
        check_number: method === 'check' ? checkNumber || null : null,
      })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const optionLabel = (b: Beneficiary) => (hasBank(b) ? b.name : `${b.name} (sin banco)`)

  return (
    <form onSubmit={handleSubmit} className="bg-app-bg rounded-xl border border-app-border p-4 mb-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-medium text-app-muted mb-1 block">Beneficiario *</label>
          <select
            value={beneficiaryKey}
            onChange={(e) => handleBeneficiaryChange(e.target.value)}
            className={`${inputClass} w-full`}
            required
          >
            <option value="">Seleccionar...</option>
            {contractors.length > 0 && (
              <optgroup label="Contratistas">
                {contractors.map((b) => (
                  <option key={keyOf(b)} value={keyOf(b)}>
                    {optionLabel(b)}
                  </option>
                ))}
              </optgroup>
            )}
            {suppliers.length > 0 && (
              <optgroup label="Proveedores">
                {suppliers.map((b) => (
                  <option key={keyOf(b)} value={keyOf(b)}>
                    {optionLabel(b)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-app-muted mb-1 block">Monto (RD$) *</label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} w-full`}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-app-muted mb-1 block">Método</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={`${inputClass} w-full`}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-app-muted mb-1 block">Cuenta de origen</label>
          <select
            value={sourceAccountId}
            onChange={(e) => setSourceAccountId(e.target.value)}
            className={`${inputClass} w-full`}
            disabled={sourceAccounts.length === 0}
          >
            <option value="">{sourceAccounts.length === 0 ? 'Sin cuentas internas' : 'Ninguna'}</option>
            {sourceAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank_name} — {a.account_number}
              </option>
            ))}
          </select>
        </div>
        {method === 'check' && (
          <div>
            <label className="text-[10px] font-medium text-app-muted mb-1 block">No. cheque</label>
            <input
              type="text"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>
        )}
      </div>

      {selected && (
        <div className="text-[11px] bg-app-surface border border-app-border rounded-lg px-3 py-2">
          {hasBank(selected) ? (
            <span className="text-app-muted">
              Datos bancarios:{' '}
              <span className="text-app-text font-medium">{selected.bank_name || 'Banco no especificado'}</span>
              {selected.bank_account ? ` — ${selected.bank_account}` : ''}
              {selected.doc ? ` · ${selected.type === 'supplier' ? 'RNC' : 'Cédula'}: ${selected.doc}` : ''}
            </span>
          ) : (
            <span className="text-amber-600">Este beneficiario no tiene datos bancarios registrados.</span>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Agregar'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  )
}
