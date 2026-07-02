import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'
import { Plus, Download } from 'lucide-react'
import { paymentDistributionService, type Beneficiary } from '@/services/paymentDistributionService'
import { payrollService } from '@/services/payrollService'
import { bankAccountService } from '@/services/bankAccountService'
import { round2 } from '@/utils/money'
import { DistributionForm, type DistributionFormValues } from './DistributionForm'
import { DistributionsTable } from './DistributionsTable'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatRD } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'
import { buildBankPaymentSheet, BANK_PAYMENT_HEADERS } from '@/utils/bankPaymentExport'
import { exportToExcel } from '@/utils/excelExport'
import type { BankAccount, PaymentDistribution } from '@/types/database'

interface Props {
  periodId: string
  grandTotal: number
}

export function PaymentDistributionsSection({ periodId, grandTotal }: Props) {
  const [distributions, setDistributions] = useState<PaymentDistribution[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [sourceAccounts, setSourceAccounts] = useState<BankAccount[]>([])
  // Deducciones que se retienen del pago (préstamos + retención de garantía):
  // reducen el tope que se puede repartir para no pagar de más al beneficiario.
  const [deductions, setDeductions] = useState<{ loanDeductions: number; retention: number; total: number }>({
    loanDeductions: 0,
    retention: 0,
    total: 0,
  })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<PaymentDistribution | null>(null)
  const [consolidatePrompt, setConsolidatePrompt] = useState<{
    values: DistributionFormValues
    existing: PaymentDistribution
  } | null>(null)
  const { success: toastSuccess, error: toastError } = useToast()

  const load = useCallback(async () => {
    const [data, ded] = await Promise.all([
      paymentDistributionService.getByPeriod(periodId).catch((err) => {
        console.error('[PaymentDistributionsSection] cargar distribuciones fallo', err)
        Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
        toastError(`No se pudieron cargar las distribuciones de pago: ${getErrorMessage(err)}`)
        return [] as PaymentDistribution[]
      }),
      payrollService.getPayrollDeductions(periodId).catch((err) => {
        console.error('[PaymentDistributionsSection] cargar deducciones fallo', err)
        Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
        return { loanDeductions: 0, retention: 0, total: 0 }
      }),
    ])
    setDistributions(data)
    setDeductions(ded)
  }, [periodId, toastError])

  useEffect(() => {
    // grandTotal en las dependencias: al vincular/desvincular cortes o cambiar
    // el total, se recargan las deducciones para recalcular el neto a repartir.
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
  }, [load, periodId, grandTotal, toastError])

  // El neto a repartir es el total del reporte menos lo que se retiene
  // (préstamos + retención de garantía): nunca se debe poder pagar de más.
  const netToPay = round2(Math.max(0, grandTotal - deductions.total))
  // A7: exclude cancelled distributions so "falta distribuir" is accurate
  const totalDistributed = distributions.filter((d) => d.status !== 'cancelled').reduce((sum, d) => sum + d.amount, 0)
  const pendiente = round2(netToPay - totalDistributed)

  const sourceAccountMap = useMemo(
    () => new Map(sourceAccounts.map((a) => [a.id, `${a.bank_name} — ${a.account_number}`])),
    [sourceAccounts],
  )
  const resolveSourceAccount = useCallback((id: string) => sourceAccountMap.get(id), [sourceAccountMap])

  async function createDistribution(values: DistributionFormValues) {
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
        netToPay,
      )
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd(values: DistributionFormValues) {
    // Si ya hay un pago pendiente para el mismo beneficiario en este reporte,
    // avisamos y ofrecemos sumarlo al existente en vez de crear otro aparte.
    // A9: require beneficiary_id !== null to avoid merging unrelated null-id rows
    const existing = distributions.find(
      (d) =>
        d.status === 'pending' &&
        d.beneficiary_id !== null &&
        d.beneficiary_id === values.beneficiary_id &&
        d.beneficiary_type === values.beneficiary_type,
    )
    if (existing) {
      setConsolidatePrompt({ values, existing })
      return
    }
    await createDistribution(values)
  }

  async function handleConsolidate() {
    if (!consolidatePrompt) return
    const { values, existing } = consolidatePrompt
    setSaving(true)
    try {
      // A8: pass el neto para que addAmount respete el tope (ya sin lo retenido)
      await paymentDistributionService.addAmount(existing.id, values.amount, netToPay)
      toastSuccess(`Pago sumado al de ${existing.beneficiary || 'el beneficiario'}.`)
      setConsolidatePrompt(null)
      setShowForm(false)
      await load()
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
      toastError(`No se pudo consolidar el pago: ${getErrorMessage(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSeparate() {
    if (!consolidatePrompt) return
    const { values } = consolidatePrompt
    setSaving(true)
    try {
      await createDistribution(values)
      setConsolidatePrompt(null)
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
      toastError(`No se pudo agregar el pago: ${getErrorMessage(err)}`)
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

  async function handleExport() {
    try {
      const rows = buildBankPaymentSheet(distributions, resolveSourceAccount)
      const stamp = new Date().toISOString().slice(0, 10)
      await exportToExcel(`pagos-nomina-${stamp}`, [{ name: 'Pagos', rows, header: [...BANK_PAYMENT_HEADERS] }])
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'PaymentDistributionsSection' } })
      toastError(`No se pudo exportar el archivo de pagos: ${getErrorMessage(err)}`)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <h2 className="text-lg font-medium text-app-text">Distribución de pagos</h2>
          {deductions.total > 0 && (
            <p className="text-xs text-app-muted mt-0.5">
              Neto a pagar: {formatRD(netToPay)}{' '}
              <span className="text-app-subtle">
                (se retiene{deductions.loanDeductions > 0 && ` ${formatRD(deductions.loanDeductions)} de préstamos`}
                {deductions.loanDeductions > 0 && deductions.retention > 0 && ' y'}
                {deductions.retention > 0 && ` ${formatRD(deductions.retention)} de garantía`})
              </span>
            </p>
          )}
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
              title="Exportar pagos a Excel"
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

      <Modal
        open={consolidatePrompt !== null}
        onClose={() => setConsolidatePrompt(null)}
        title=""
        ariaLabel="Ya existe un pago para este beneficiario"
        width="max-w-md"
      >
        {consolidatePrompt && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-app-text">Ya existe un pago para este beneficiario</h3>
              <p className="text-sm text-app-muted mt-1 leading-relaxed">
                {consolidatePrompt.existing.beneficiary || 'Este beneficiario'} ya tiene un pago pendiente de{' '}
                <span className="font-medium text-app-text">{formatRD(consolidatePrompt.existing.amount)}</span>. Si lo
                sumas, quedará un solo pago de{' '}
                <span className="font-medium text-app-text">
                  {formatRD(consolidatePrompt.existing.amount + consolidatePrompt.values.amount)}
                </span>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConsolidate}
                disabled={saving}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Sumar al pago existente
              </button>
              <button
                onClick={handleAddSeparate}
                disabled={saving}
                className="w-full px-4 py-2 text-sm font-medium text-app-text border border-app-border rounded-lg hover:bg-app-hover transition-colors disabled:opacity-50"
              >
                Agregar como pago aparte
              </button>
              <button
                onClick={() => setConsolidatePrompt(null)}
                disabled={saving}
                className="w-full px-4 py-2 text-sm text-app-muted rounded-lg hover:bg-app-hover transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
