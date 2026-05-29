import { useCallback, useEffect, useState } from 'react'
import * as Sentry from '@sentry/react'
import { Plus, Trash2, CheckCircle } from 'lucide-react'
import { paymentDistributionService, type Beneficiary } from '@/services/paymentDistributionService'
import { DistributionForm, type DistributionFormValues } from './DistributionForm'
import { useToast } from '@/components/ui/Toast'
import { formatRD } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'
import type { PaymentDistribution } from '@/types/database'

const METHOD_LABELS: Record<PaymentDistribution['payment_method'], string> = {
  transfer: 'Transferencia',
  check: 'Cheque',
  deposit: 'Depósito',
  cash: 'Efectivo',
}

interface Props {
  periodId: string
  grandTotal: number
}

export function PaymentDistributionsSection({ periodId, grandTotal }: Props) {
  const [distributions, setDistributions] = useState<PaymentDistribution[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { error: toastError } = useToast()

  const load = useCallback(async () => {
    const data = await paymentDistributionService.getByPeriod(periodId).catch((err) => {
      console.error('[PaymentDistributionsSection] cargar distribuciones fallo', err)
      Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
      toastError(`No se pudieron cargar las distribuciones de pago: ${getErrorMessage(err)}`)
      return [] as PaymentDistribution[]
    })
    setDistributions(data)
  }, [periodId, toastError])

  useEffect(() => {
    load()
    paymentDistributionService
      .getBeneficiaries()
      .then(setBeneficiaries)
      .catch((err) => {
        console.error('[PaymentDistributionsSection] cargar beneficiarios fallo', err)
        Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
        toastError(`No se pudieron cargar los beneficiarios: ${getErrorMessage(err)}`)
      })
  }, [load, periodId, toastError])

  const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0)
  const pendiente = grandTotal - totalDistributed

  async function handleAdd(values: DistributionFormValues) {
    setSaving(true)
    try {
      await paymentDistributionService.create(
        {
          payroll_period_id: periodId,
          bank_account_id: null,
          beneficiary: values.beneficiary,
          beneficiary_type: values.beneficiary_type,
          beneficiary_id: values.beneficiary_id,
          bank_name: values.bank_name,
          bank_account: values.bank_account,
          amount: values.amount,
          payment_method: values.payment_method,
          check_number: values.check_number,
          status: 'pending',
          instructions: null,
          completed_at: null,
        },
        grandTotal,
      )
      setShowForm(false)
      await load()
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
        <DistributionForm
          beneficiaries={beneficiaries}
          pendiente={pendiente}
          saving={saving}
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
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
                  Banco / Cuenta
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
                    {d.bank_name || '—'}
                    {d.bank_account ? <span className="text-app-subtle ml-1 text-[10px]">{d.bank_account}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-app-muted">
                    {METHOD_LABELS[d.payment_method] ?? d.payment_method}
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
