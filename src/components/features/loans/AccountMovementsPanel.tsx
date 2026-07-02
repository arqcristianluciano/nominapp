import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Building2, Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { isEditableMovement } from '@/services/accountMovementService'
import { useAccountMovements, type ManualMovementInput } from '@/hooks/useAccountMovements'
import { useAppRoles } from '@/hooks/useAppRoles'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { formatRD } from '@/utils/currency'
import { todayISO } from '@/utils/dateLocal'
import { getErrorMessage } from '@/utils/errors'
import { exportToExcel } from '@/utils/excelExport'
import type { AccountMovement, AccountMovementTipo, BankAccount } from '@/types/database'

// ─── Helpers de presentación ────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

const ORIGEN_LABEL: Record<string, string> = {
  loan_disbursement: 'Desembolso de préstamo',
  loan_repayment: 'Cobro de cuota',
  manual: 'Movimiento manual',
  initial_balance: 'Saldo inicial',
}

function origenLabel(origen: string): string {
  return ORIGEN_LABEL[origen] ?? origen
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function AccountSelector({
  accounts,
  selectedId,
  onChange,
}: {
  accounts: BankAccount[]
  selectedId: string | null
  onChange: (id: string) => void
}) {
  if (accounts.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((acc) => (
        <button
          key={acc.id}
          onClick={() => onChange(acc.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            selectedId === acc.id
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-app-surface text-app-muted border-app-border hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[180px]">
            {acc.owner_name} — {acc.bank_name}
          </span>
        </button>
      ))}
    </div>
  )
}

function BalanceCard({
  label,
  amount,
  variant,
}: {
  label: string
  amount: number
  variant: 'credito' | 'debito' | 'saldo'
}) {
  const colorClass =
    variant === 'credito'
      ? 'text-emerald-600 dark:text-emerald-400'
      : variant === 'debito'
        ? 'text-red-500 dark:text-red-400'
        : amount >= 0
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-red-500 dark:text-red-400'

  return (
    <div className="bg-app-bg rounded-xl border border-app-border p-4 flex flex-col gap-1">
      <p className="text-xs text-app-subtle uppercase font-semibold">{label}</p>
      <p className={`text-lg font-bold ${colorClass}`}>{formatRD(amount)}</p>
    </div>
  )
}

/** Callbacks para corregir/borrar movimientos anotados a mano. */
interface MovementActionHandlers {
  onEdit?: (mov: AccountMovement) => void
  onDelete?: (mov: AccountMovement) => void
}

function MovementActionButtons({ mov, onEdit, onDelete }: { mov: AccountMovement } & MovementActionHandlers) {
  if (!isEditableMovement(mov) || (!onEdit && !onDelete)) return null
  return (
    <div className="inline-flex items-center gap-1">
      {onEdit && (
        <button
          onClick={() => onEdit(mov)}
          title="Corregir movimiento"
          className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={() => onDelete(mov)}
          title="Borrar movimiento"
          className="p-1.5 rounded-lg text-app-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function MovimientoRow({ mov, onEdit, onDelete }: { mov: AccountMovement } & MovementActionHandlers) {
  const isCredito = mov.tipo === 'credito'
  const showActions = !!(onEdit || onDelete)
  return (
    <tr className="hover:bg-app-hover transition-colors">
      <td className="px-4 py-3 text-xs text-app-muted">{formatDate(mov.fecha)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isCredito ? (
            <ArrowDownCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <ArrowUpCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <div>
            <p className="text-xs font-medium text-app-text">{mov.concepto}</p>
            <p className="text-[11px] text-app-subtle">{origenLabel(mov.origen)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`text-sm font-semibold ${isCredito ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
        >
          {isCredito ? '+' : '−'}
          {formatRD(mov.monto)}
        </span>
      </td>
      {showActions && (
        <td className="px-2 py-3 text-center">
          <MovementActionButtons mov={mov} onEdit={onEdit} onDelete={onDelete} />
        </td>
      )}
    </tr>
  )
}

function MovimientoCard({ mov, onEdit, onDelete }: { mov: AccountMovement } & MovementActionHandlers) {
  const isCredito = mov.tipo === 'credito'
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-app-hover transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        {isCredito ? (
          <ArrowDownCircle className="w-5 h-5 text-emerald-500 shrink-0" />
        ) : (
          <ArrowUpCircle className="w-5 h-5 text-red-400 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-app-text truncate">{mov.concepto}</p>
          <p className="text-[11px] text-app-subtle">
            {formatDate(mov.fecha)} · {origenLabel(mov.origen)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span
          className={`text-sm font-bold ${isCredito ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
        >
          {isCredito ? '+' : '−'}
          {formatRD(mov.monto)}
        </span>
        <MovementActionButtons mov={mov} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}

function ManualMovementForm({
  initial,
  saving,
  onSubmit,
  onCancel,
}: {
  /** Si se pasa, el formulario corrige ese movimiento en vez de crear uno nuevo. */
  initial?: AccountMovement
  saving: boolean
  onSubmit: (input: ManualMovementInput) => Promise<void>
  onCancel: () => void
}) {
  const [tipo, setTipo] = useState<AccountMovementTipo>(initial?.tipo ?? 'credito')
  const [monto, setMonto] = useState(initial ? String(initial.monto) : '')
  const [fecha, setFecha] = useState(initial?.fecha ?? todayISO())
  const [concepto, setConcepto] = useState(initial?.concepto ?? '')

  const montoParsed = parseFloat(monto)
  const valid = !Number.isNaN(montoParsed) && montoParsed > 0 && concepto.trim().length > 0 && fecha.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    await onSubmit({ tipo, monto: montoParsed, fecha, concepto: concepto.trim() })
  }

  const inputCls =
    'w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-app-muted mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Tipo de movimiento *</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo('credito')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              tipo === 'credito'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-app-surface text-app-muted border-app-border hover:border-emerald-400'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" /> Entrada (depósito)
          </button>
          <button
            type="button"
            onClick={() => setTipo('debito')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              tipo === 'debito'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-app-surface text-app-muted border-app-border hover:border-red-400'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" /> Salida (retiro)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Monto (RD$) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={inputCls}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Fecha *</label>
          <input type="date" className={inputCls} value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className={labelCls}>Concepto *</label>
        <input
          type="text"
          className={inputCls}
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Ej: Depósito para fondo de préstamos"
          required
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
          disabled={saving || !valid}
          className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Registrar movimiento'}
        </button>
      </div>
    </form>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function AccountMovementsPanel() {
  const {
    accounts,
    selectedAccountId,
    movements,
    balance,
    loading,
    loadingMovements,
    error,
    setSelectedAccountId,
    addManualMovement,
    updateManualMovement,
    deleteManualMovement,
  } = useAccountMovements()
  const { canWriteBankAccounts } = useAppRoles()
  const { success, error: toastError } = useToast()
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [savingMovement, setSavingMovement] = useState(false)
  const [editTarget, setEditTarget] = useState<AccountMovement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountMovement | null>(null)

  const handleAddMovement = async (input: ManualMovementInput) => {
    setSavingMovement(true)
    try {
      await addManualMovement(input)
      setShowMovementForm(false)
      success(input.tipo === 'credito' ? 'Entrada registrada en la cuenta' : 'Salida registrada en la cuenta')
    } catch (err) {
      toastError(`No se pudo registrar el movimiento: ${getErrorMessage(err)}`)
    } finally {
      setSavingMovement(false)
    }
  }

  const handleEditMovement = async (input: ManualMovementInput) => {
    if (!editTarget) return
    setSavingMovement(true)
    try {
      await updateManualMovement(editTarget.id, input)
      setEditTarget(null)
      success('Movimiento corregido')
    } catch (err) {
      toastError(`No se pudo corregir el movimiento: ${getErrorMessage(err)}`)
    } finally {
      setSavingMovement(false)
    }
  }

  const handleDeleteMovement = async () => {
    if (!deleteTarget) return
    try {
      await deleteManualMovement(deleteTarget.id)
      success('Movimiento borrado')
    } catch (err) {
      toastError(`No se pudo borrar el movimiento: ${getErrorMessage(err)}`)
    }
  }

  const handleExport = async () => {
    const account = accounts.find((a) => a.id === selectedAccountId)
    if (!account || movements.length === 0) return
    try {
      const rows = movements.map((mov) => ({
        Fecha: formatDate(mov.fecha),
        Tipo: mov.tipo === 'credito' ? 'Entrada' : 'Salida',
        Concepto: mov.concepto,
        Origen: origenLabel(mov.origen),
        'Entrada (RD$)': mov.tipo === 'credito' ? mov.monto : null,
        'Salida (RD$)': mov.tipo === 'debito' ? mov.monto : null,
      }))
      if (balance) {
        rows.push({
          Fecha: '',
          Tipo: 'TOTALES',
          Concepto: `Saldo: ${formatRD(balance.saldo)}`,
          Origen: '',
          'Entrada (RD$)': balance.totalCreditos,
          'Salida (RD$)': balance.totalDebitos,
        })
      }
      await exportToExcel(`movimientos-${account.bank_name}-${account.account_number}`, [{ name: 'Movimientos', rows }])
      success('Movimientos exportados a Excel')
    } catch (err) {
      toastError(`No se pudo exportar: ${getErrorMessage(err)}`)
    }
  }

  const onEditMovement = canWriteBankAccounts ? (mov: AccountMovement) => setEditTarget(mov) : undefined
  const onDeleteMovement = canWriteBankAccounts ? (mov: AccountMovement) => setDeleteTarget(mov) : undefined

  if (loading) return <SkeletonTable rows={4} cols={3} />

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
        <Building2 className="w-8 h-8 text-app-subtle mx-auto mb-2" />
        <p className="text-sm text-app-muted">No hay cuentas bancarias registradas.</p>
        <p className="text-xs text-app-subtle mt-1">Ve a Configuración → Cuentas bancarias para agregar una.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector de cuenta + registrar movimiento manual + exportar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AccountSelector accounts={accounts} selectedId={selectedAccountId} onChange={setSelectedAccountId} />
        <div className="flex items-center gap-2 shrink-0">
          {selectedAccountId && movements.length > 0 && (
            <button
              onClick={() => void handleExport()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
            >
              <Download className="w-3.5 h-3.5" /> Exportar a Excel
            </button>
          )}
          {canWriteBankAccounts && selectedAccountId && (
            <button
              onClick={() => setShowMovementForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar movimiento
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      {balance && (
        <div className="grid grid-cols-3 gap-3">
          <BalanceCard label="Entradas" amount={balance.totalCreditos} variant="credito" />
          <BalanceCard label="Salidas" amount={balance.totalDebitos} variant="debito" />
          <BalanceCard label="Saldo neto" amount={balance.saldo} variant="saldo" />
        </div>
      )}

      {/* Tabla de movimientos */}
      {loadingMovements ? (
        <SkeletonTable rows={3} cols={3} />
      ) : movements.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <p className="text-sm text-app-muted">Esta cuenta aún no tiene movimientos registrados.</p>
          <p className="text-xs text-app-subtle mt-1">
            Los movimientos se generan automáticamente al desembolsar un préstamo o al marcar una cuota como cobrada.
            También puedes anotar el dinero que ya tiene la cuenta con el botón "Registrar movimiento".
          </p>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          {/* Tabla en pantallas medianas/grandes */}
          <table className="w-full hidden sm:table">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-app-subtle uppercase">Fecha</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-app-subtle uppercase">Concepto</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-app-subtle uppercase">Monto</th>
                {canWriteBankAccounts && <th className="w-20" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {movements.map((mov) => (
                <MovimientoRow key={mov.id} mov={mov} onEdit={onEditMovement} onDelete={onDeleteMovement} />
              ))}
            </tbody>
          </table>
          {/* Cards en móvil */}
          <div className="sm:hidden divide-y divide-app-border">
            {movements.map((mov) => (
              <MovimientoCard key={mov.id} mov={mov} onEdit={onEditMovement} onDelete={onDeleteMovement} />
            ))}
          </div>
        </div>
      )}

      {/* Modal: registrar movimiento manual */}
      <Modal open={showMovementForm} onClose={() => setShowMovementForm(false)} title="Registrar movimiento manual">
        <ManualMovementForm
          saving={savingMovement}
          onSubmit={handleAddMovement}
          onCancel={() => setShowMovementForm(false)}
        />
      </Modal>

      {/* Modal: corregir movimiento manual */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Corregir movimiento">
        {editTarget && (
          <ManualMovementForm
            key={editTarget.id}
            initial={editTarget}
            saving={savingMovement}
            onSubmit={handleEditMovement}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Modal: confirmar borrado de movimiento */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Borrar movimiento"
        message={
          deleteTarget
            ? `¿Borrar "${deleteTarget.concepto}" (${deleteTarget.tipo === 'credito' ? 'entrada' : 'salida'} de ${formatRD(deleteTarget.monto)})? El saldo de la cuenta se recalculará sin él.`
            : ''
        }
        confirmLabel="Borrar"
        onConfirm={() => void handleDeleteMovement()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
