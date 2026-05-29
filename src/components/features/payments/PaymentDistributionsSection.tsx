import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'
import { Plus, Download } from 'lucide-react'
import { paymentDistributionService, type Beneficiary } from '@/services/paymentDistributionService'
import { bankAccountService } from '@/services/bankAccountService'
import { DistributionForm, type DistributionFormValues } from './DistributionForm'
import { DistributionsTable } from './DistributionsTable'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { formatRD } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'
import { buildBankPaymentRows } from '@/utils/bankPaymentExport'
import { downloadCsv } from '@/utils/csv'
import type { BankAccount, PaymentDistribution } from '@/types/database'

interface Props {
  periodId: string
  grandTotal: number
}

export function PaymentDistributionsSection({ periodId, grandTotal }: Props) {
  const [distributions, setDistributions] = useState<PaymentDistribution[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [sourceAccounts, setSourceAccounts] = useState<BankAccount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<PaymentDistribution | null>(null)
  const { success: toastSuccess, error: toastError } = useToast()

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
    bankAccountService
      .getAll()
      .then((accounts) => setSourceAccounts(accounts.filter((a) => a.is_internal)))
      .catch((err) => {
        console.error('[PaymentDistributionsSection] cargar cuentas internas fallo', err)
        Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
      })
  }, [load, periodId, toastError])

  const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0)
  const pendiente = grandTotal - totalDistributed

  const sourceAccountMap = useMemo(
    () => new Map(sourceAccounts.map((a) => [a.id, `${a.bank_name} — ${a.account_number}`])),
    [sourceAccounts],
  )
  const resolveSourceAccount = useCallback((id: string) => sourceAccountMap.get(id), [sourceAccountMap])

  async function handleAdd(values: DistributionFormValues) {
    setSaving(true)
    try {
      await paymentDistributionService.create(
        {
          payroll_period_id: periodId,
          bank_account_id: values.bank_account_id,
          beneficiary: values.beneficiary,
          beneficiary_type: values.beneficiary_type,
          beneficiary_id: values.beneficiary_id,
          bank_name: values.bank_name,
          bank_account: values.bank_account,
          beneficiary_doc: values.beneficiary_doc,
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
    try {
      await paymentDistributionService.updateStatus(id, 'completed')
      toastSuccess('Pago marcado como completado.')
      await load()
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
      toastError(`No se pudo completar el pago: ${getErrorMessage(err)}`)
    }
  }

  async function handleDelete(distribution: PaymentDistribution) {
    try {
      await paymentDistributionService.delete(distribution.id)
      toastSuccess('Pago eliminado.')
      await load()
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
      toastError(`No se pudo eliminar el pago: ${getErrorMessage(err)}`)
    }
  }

  function handleExport() {
    const rows = buildBankPaymentRows(distributions, resolveSourceAccount)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`pagos-nomina-${stamp}.csv`, rows)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <h2 className="text-lg font-medium text-app-text">Distribución de pagos</h2>
          {pendiente > 0.01 && <p className="text-xs text-amber-600 mt-0.5">Falta distribuir: {formatRD(pendiente)}</p>}
          {pendiente <= 0 && distributions.length > 0 && (
            <p className="text-xs text-green-600 mt-0.5">Total distribuido completo</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {distributions.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover"
              title="Exportar pagos a CSV"
            >
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover"
          >
            <Plus className="w-4 h-4" /> Agregar pago
          </button>
        </div>
      </div>

      {showForm && (
        <DistributionForm
          beneficiaries={beneficiaries}
          sourceAccounts={sourceAccounts}
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
        <DistributionsTable
          distributions={distributions}
          totalDistributed={totalDistributed}
          resolveSourceAccount={resolveSourceAccount}
          onComplete={handleComplete}
          onDelete={setToDelete}
        />
      )}

      <ConfirmModal
        open={toDelete !== null}
        title="Eliminar pago"
        message={
          toDelete
            ? `¿Eliminar el pago a ${toDelete.beneficiary || 'este beneficiario'} por ${formatRD(toDelete.amount)}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (toDelete) handleDelete(toDelete)
        }}
        onCancel={() => setToDelete(null)}
      />
    </section>
  )
}
