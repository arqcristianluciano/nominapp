import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { formatRD } from '@/utils/currency'
import { todayISO } from '@/utils/dateLocal'
import type { BankAccount, ContractorLoan, LoanInstallment } from '@/types/database'

const inputCls =
  'w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-xs font-medium text-app-muted mb-1'

export interface InstallmentTarget {
  loan: ContractorLoan
  installment: LoanInstallment
}

/** Ventana para registrar el pago de una cuota: fecha real del pago y
 *  cuenta a la que entra el dinero (genera el movimiento de cobro). */
export function InstallmentPayModal({
  target,
  bankAccounts,
  onConfirm,
  onClose,
}: {
  target: InstallmentTarget | null
  bankAccounts: BankAccount[]
  onConfirm: (fechaPago: string, cuentaCobroId?: string) => Promise<void>
  onClose: () => void
}) {
  const [fecha, setFecha] = useState('')
  const [cuentaId, setCuentaId] = useState('')
  const [saving, setSaving] = useState(false)

  // Cada cuota abre el formulario limpio: pago de hoy, sin cuenta elegida.
  useEffect(() => {
    if (target) {
      // Hoy en hora local (RD): antes, de noche proponía la fecha de mañana.
      setFecha(todayISO())
      setCuentaId('')
      setSaving(false)
    }
  }, [target])

  const handleConfirm = async () => {
    if (!fecha || saving) return
    setSaving(true)
    try {
      await onConfirm(fecha, cuentaId || undefined)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title="Registrar pago de cuota" width="max-w-sm">
      {target && (
        <div className="space-y-4">
          <div className="bg-app-bg border border-app-border rounded-lg px-4 py-3 text-sm">
            <p className="text-app-text font-semibold">
              Cuota #{target.installment.numero_cuota} — {formatRD(target.installment.monto)}
            </p>
            <p className="text-xs text-app-muted mt-0.5">{target.loan.contractor?.name ?? 'Contratista'}</p>
          </div>

          <div>
            <label className={labelCls}>Fecha del pago *</label>
            <input type="date" className={inputCls} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Cuenta a la que entra el pago</label>
            <select className={inputCls} value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
              <option value="">Sin especificar</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.owner_name} — {a.bank_name}
                </option>
              ))}
            </select>
            {bankAccounts.length === 0 ? (
              <p className="mt-1 text-[11px] text-app-subtle">
                No hay cuentas registradas. Regístralas en{' '}
                <Link to="/configuracion" className="text-blue-600 hover:underline">
                  Configuración → Cuentas bancarias
                </Link>{' '}
                para que el cobro quede anotado en una cuenta.
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-app-subtle">
                Si eliges una cuenta, el cobro queda anotado como entrada en sus movimientos.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={saving || !fecha}
              className="px-4 py-2 text-sm bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Registrando…' : 'Registrar pago'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Ventana para cambiar la fecha programada de una cuota pendiente. */
export function InstallmentDateModal({
  target,
  onConfirm,
  onClose,
}: {
  target: InstallmentTarget | null
  onConfirm: (fechaProgramada: string) => Promise<void>
  onClose: () => void
}) {
  const [fecha, setFecha] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) {
      setFecha(target.installment.fecha_pago_programada)
      setSaving(false)
    }
  }, [target])

  const handleConfirm = async () => {
    if (!fecha || saving) return
    setSaving(true)
    try {
      await onConfirm(fecha)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title="Cambiar fecha de la cuota" width="max-w-sm">
      {target && (
        <div className="space-y-4">
          <div className="bg-app-bg border border-app-border rounded-lg px-4 py-3 text-sm">
            <p className="text-app-text font-semibold">
              Cuota #{target.installment.numero_cuota} — {formatRD(target.installment.monto)}
            </p>
            <p className="text-xs text-app-muted mt-0.5">{target.loan.contractor?.name ?? 'Contratista'}</p>
          </div>

          <div>
            <label className={labelCls}>Nueva fecha programada *</label>
            <input type="date" className={inputCls} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={saving || !fecha}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar fecha'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
