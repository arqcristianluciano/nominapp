import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'
import { Plus, Trash2, CheckCircle } from 'lucide-react'
import { paymentDistributionService, type DistributionWithAccount } from '@/services/paymentDistributionService'
import { contractorService } from '@/services/contractorService'
import { supplierService } from '@/services/supplierService'
import { useToast } from '@/components/ui/Toast'
import { formatRD } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'check', label: 'Cheque' },
  { value: 'deposit', label: 'Depósito' },
  { value: 'cash', label: 'Efectivo' },
]

const OTHER_BENEFICIARY = '__OTHER__'

interface BeneficiaryOption {
  key: string
  name: string
  bankName: string | null
  account: string | null
  doc: string | null
}

// Construye la línea de datos bancarios que se arrastra del beneficiario.
function formatBankInfo(b: Pick<BeneficiaryOption, 'bankName' | 'account' | 'doc'>): string | null {
  const parts: string[] = []
  if (b.bankName) parts.push(b.bankName)
  if (b.account) parts.push(`Cta. ${b.account}`)
  if (b.doc) parts.push(b.doc)
  return parts.length ? parts.join(' · ') : null
}

interface Props {
  periodId: string
  grandTotal: number
}

export function PaymentDistributionsSection({ periodId, grandTotal }: Props) {
  const [distributions, setDistributions] = useState<DistributionWithAccount[]>([])
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { error: toastError } = useToast()

  const [beneficiaryKey, setBeneficiaryKey] = useState('')
  const [otherName, setOtherName] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('transfer')
  const [checkNumber, setCheckNumber] = useState('')

  const load = useCallback(async () => {
    const data = await paymentDistributionService.getByPeriod(periodId).catch((err) => {
      console.error('[PaymentDistributionsSection] cargar distribuciones fallo', err)
      Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
      toastError(`No se pudieron cargar las distribuciones de pago: ${getErrorMessage(err)}`)
      return [] as DistributionWithAccount[]
    })
    setDistributions(data)
  }, [periodId, toastError])

  useEffect(() => {
    load()
    Promise.all([contractorService.getAll(), supplierService.getAll()])
      .then(([contractors, suppliers]) => {
        const list: BeneficiaryOption[] = []
        for (const c of contractors) {
          if (!c.is_active) continue
          list.push({
            key: `contractor:${c.id}`,
            name: c.name,
            bankName: c.bank_name,
            account: c.bank_account,
            doc: c.cedula,
          })
        }
        for (const s of suppliers) {
          if (!s.is_active) continue
          list.push({
            key: `supplier:${s.id}`,
            name: s.name,
            bankName: s.bank_name,
            account: s.bank_account,
            doc: s.rnc,
          })
        }
        list.sort((a, b) => a.name.localeCompare(b.name))
        setBeneficiaries(list)
      })
      .catch((err) => {
        console.error('[PaymentDistributionsSection] cargar beneficiarios fallo', err)
        Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
        toastError(`No se pudieron cargar los beneficiarios: ${getErrorMessage(err)}`)
      })
  }, [load, periodId, toastError])

  const selectedBeneficiary = useMemo(
    () => beneficiaries.find((b) => b.key === beneficiaryKey) ?? null,
    [beneficiaries, beneficiaryKey],
  )
  const isOther = beneficiaryKey === OTHER_BENEFICIARY
  const bankInfo = selectedBeneficiary ? formatBankInfo(selectedBeneficiary) : null

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const beneficiaryName = isOther ? otherName.trim() : (selectedBeneficiary?.name ?? '')
    if (!beneficiaryName) {
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
    setSaving(true)
    try {
      await paymentDistributionService.create(
        {
          payroll_period_id: periodId,
          bank_account_id: null,
          beneficiary: beneficiaryName,
          amount: numericAmount,
          payment_method: method as 'transfer' | 'check' | 'deposit' | 'cash',
          check_number: checkNumber || null,
          status: 'pending',
          instructions: bankInfo,
          completed_at: null,
        },
        grandTotal,
      )
      setBeneficiaryKey('')
      setOtherName('')
      setAmount('')
      setMethod('transfer')
      setCheckNumber('')
      setShowForm(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar el pago.')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete(id: string) {
    await paymentDistributionService.updateStatus(id, 'completed')
    await load()
  }

  async function handleDelete(id: string) {
    await paymentDistributionService.delete(id)
    await load()
  }

  const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0)
  const pendiente = grandTotal - totalDistributed

  const inputClass = 'px-2 py-1.5 border border-app-border rounded text-xs focus:ring-1 focus:ring-blue-500'

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-medium text-app-text">Distribución de pagos</h2>
          {pendiente > 0.01 && <p className="text-xs text-amber-600 mt-0.5">Falta distribuir: {formatRD(pendiente)}</p>}
          {pendiente <= 0 && distributions.length > 0 && (
            <p className="text-xs text-green-600 mt-0.5">Total distribuido completo</p>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover"
        >
          <Plus className="w-4 h-4" /> Agregar pago
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-app-bg rounded-xl border border-app-border p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-medium text-app-muted mb-1 block">Beneficiario *</label>
              <select
                value={beneficiaryKey}
                onChange={(e) => setBeneficiaryKey(e.target.value)}
                className={`${inputClass} w-full`}
                required
              >
                <option value="">Seleccionar...</option>
                {beneficiaries.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.name}
                  </option>
                ))}
                <option value={OTHER_BENEFICIARY}>Otro (escribir nombre)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-app-muted mb-1 block">Datos bancarios</label>
              {isOther ? (
                <input
                  type="text"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  className={`${inputClass} w-full`}
                  placeholder="Nombre del beneficiario..."
                />
              ) : (
                <div className={`${inputClass} w-full text-app-muted bg-app-bg truncate`} title={bankInfo ?? undefined}>
                  {bankInfo ?? (selectedBeneficiary ? 'Sin datos bancarios' : '—')}
                </div>
              )}
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
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputClass} w-full`}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {method === 'check' && (
            <div className="w-48">
              <label className="text-[10px] font-medium text-app-muted mb-1 block">No. cheque</label>
              <input
                type="text"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                className={`${inputClass} w-full`}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
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
      )}

      {distributions.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-6 text-center text-sm text-app-subtle">
          No hay pagos distribuidos aún
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Beneficiario</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">
                  Datos bancarios
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Método</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Monto</th>
                <th className="px-4 py-2 text-center text-[10px] font-semibold text-app-muted uppercase">Estado</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {distributions.map((d) => (
                <tr key={d.id} className="hover:bg-app-hover">
                  <td className="px-4 py-2.5 text-xs text-app-text">{d.beneficiary || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-app-muted">
                    {d.bank_account ? (
                      <>
                        {d.bank_account.bank_name}
                        <span className="text-app-subtle ml-1 text-[10px]">{d.bank_account.account_number}</span>
                      </>
                    ) : (
                      d.instructions || '—'
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-app-muted capitalize">
                    {d.payment_method}
                    {d.check_number ? ` #${d.check_number}` : ''}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-app-text text-right">{formatRD(d.amount)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {d.status === 'completed' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                        Completado
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      {d.status !== 'completed' && (
                        <button
                          onClick={() => handleComplete(d.id)}
                          title="Marcar completado"
                          className="p-1 text-app-subtle hover:text-green-500"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(d.id)} className="p-1 text-app-subtle hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-app-bg border-t border-app-border">
                <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-app-muted">
                  Total distribuido
                </td>
                <td className="px-4 py-2 text-xs font-bold text-app-text text-right">{formatRD(totalDistributed)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}
