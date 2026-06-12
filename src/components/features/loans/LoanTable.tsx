import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, CheckCircle, ChevronDown, ChevronUp, FileText, Pencil, Receipt, XCircle } from 'lucide-react'
import { downloadInstallmentReceipt, downloadLoanStatement } from '@/services/loanPdfService'
import { calcLoanProgress, countOverdueInstallments, isInstallmentOverdue } from '@/services/loanService'
import type { BankAccount, ContractorLoan, LoanInstallment } from '@/types/database'
import { formatRD } from '@/utils/currency'
import { mul, round2 } from '@/utils/money'
import { InstallmentDateModal, InstallmentPayModal, type InstallmentTarget } from './InstallmentModals'

interface LoanTableProps {
  title: string
  loans: ContractorLoan[]
  paidMap: Record<string, number>
  installmentsMap: Record<string, LoanInstallment[]>
  bankAccounts?: BankAccount[]
  onMarkPaid?: (id: string) => void
  onCancel?: (id: string) => void
  onEdit?: (loan: ContractorLoan) => void
  onPayInstallment?: (
    loan: ContractorLoan,
    installment: LoanInstallment,
    fechaPago: string,
    cuentaCobroId?: string,
  ) => Promise<void>
  onUpdateInstallmentDate?: (installment: LoanInstallment, fechaProgramada: string) => Promise<void>
  showActions?: boolean
}

/** Callbacks que abren las ventanas de pago/fecha de una cuota concreta. */
interface InstallmentActionHandlers {
  onRequestPay?: (loan: ContractorLoan, installment: LoanInstallment) => void
  onRequestDate?: (loan: ContractorLoan, installment: LoanInstallment) => void
}

const STATUS_LABEL: Record<string, string> = { active: 'Activo', paid: 'Pagado', cancelled: 'Cancelado' }
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  cancelled: 'bg-app-chip text-app-muted',
}

const FRECUENCIA_LABEL: Record<string, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

/** Tabla de cronograma usando cuotas reales de la BD si existen,
 *  o calculadas en cliente como respaldo (para préstamos viejos sin cronograma). */
function InstallmentSchedule({
  loan,
  paid,
  installments,
  bankAccounts = [],
  onRequestPay,
  onRequestDate,
}: {
  loan: ContractorLoan
  paid: number
  installments: LoanInstallment[]
  bankAccounts?: BankAccount[]
} & InstallmentActionHandlers) {
  const totalOwed = round2(mul(loan.installment_amount, loan.installments))
  // Las cuotas solo se pueden cobrar o reprogramar en préstamos activos.
  const canAct = loan.status === 'active' && !!(onRequestPay || onRequestDate)
  // La columna de acciones también aparece si hay cuotas pagadas (recibo PDF).
  const hasPaidInstallments = installments.some((i) => i.estado === 'pagada')
  const showActionsCol = canAct || hasPaidInstallments

  if (installments.length === 0) {
    // Fallback para préstamos anteriores a la migración (sin cronograma en BD)
    const paidInstallments = Math.min(loan.installments, Math.floor(paid / loan.installment_amount))
    return (
      <div className="px-4 pb-4">
        <p className="text-xs text-app-muted mb-2 italic">Cronograma estimado (préstamo sin fechas registradas)</p>
        <div className="rounded-lg border border-app-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-center px-3 py-2 font-semibold text-app-subtle uppercase">Cuota</th>
                <th className="text-right px-3 py-2 font-semibold text-app-subtle uppercase">Monto</th>
                <th className="text-center px-3 py-2 font-semibold text-app-subtle uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {Array.from({ length: loan.installments }, (_, idx) => {
                const num = idx + 1
                const isPaid = num <= paidInstallments
                return (
                  <tr key={num} className={isPaid ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'hover:bg-app-hover'}>
                    <td className="text-center px-3 py-1.5 text-app-muted font-mono">#{num}</td>
                    <td className="text-right px-3 py-1.5 font-medium text-app-text">
                      {formatRD(loan.installment_amount)}
                    </td>
                    <td className="text-center px-3 py-1.5">
                      {isPaid ? (
                        <span className="text-emerald-600 font-semibold">Pagado</span>
                      ) : (
                        <span className="text-app-subtle">Pendiente</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-app-bg border-t border-app-border">
                <td className="px-3 py-2 text-app-muted font-semibold text-right" colSpan={2}>
                  Total:
                </td>
                <td className="px-3 py-2 font-bold text-app-text text-right">{formatRD(totalOwed)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  // Cronograma real desde BD
  return (
    <div className="px-4 pb-4">
      <div className="rounded-lg border border-app-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-app-bg border-b border-app-border">
              <th className="text-center px-3 py-2 font-semibold text-app-subtle uppercase">Cuota</th>
              <th className="text-left px-3 py-2 font-semibold text-app-subtle uppercase hidden sm:table-cell">
                Fecha programada
              </th>
              <th className="text-left px-3 py-2 font-semibold text-app-subtle uppercase hidden sm:table-cell">
                Fecha de pago
              </th>
              <th className="text-right px-3 py-2 font-semibold text-app-subtle uppercase">Monto</th>
              <th className="text-center px-3 py-2 font-semibold text-app-subtle uppercase">Estado</th>
              {showActionsCol && (
                <th className="text-center px-3 py-2 font-semibold text-app-subtle uppercase">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {installments.map((inst) => {
              // Solo en préstamos activos: en uno cancelado las cuotas pendientes
              // ya no se cobran, así que no tiene sentido marcarlas vencidas.
              const overdue = loan.status === 'active' && isInstallmentOverdue(inst)
              return (
                <tr
                  key={inst.id}
                  className={
                    inst.estado === 'pagada'
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                      : overdue
                        ? 'bg-red-50/60 dark:bg-red-950/15 hover:bg-red-50 dark:hover:bg-red-950/25'
                        : 'hover:bg-app-hover'
                  }
                >
                  <td className="text-center px-3 py-1.5 text-app-muted font-mono">#{inst.numero_cuota}</td>
                  <td className="text-left px-3 py-1.5 text-app-muted hidden sm:table-cell">
                    {formatDate(inst.fecha_pago_programada)}
                  </td>
                  <td className="text-left px-3 py-1.5 text-app-muted hidden sm:table-cell">
                    {inst.fecha_pago_real ? formatDate(inst.fecha_pago_real) : '—'}
                  </td>
                  <td className="text-right px-3 py-1.5 font-medium text-app-text">{formatRD(inst.monto)}</td>
                  <td className="text-center px-3 py-1.5">
                    {inst.estado === 'pagada' ? (
                      <span className="text-emerald-600 font-semibold">Pagada</span>
                    ) : overdue ? (
                      <span className="text-red-600 dark:text-red-400 font-semibold">Vencida</span>
                    ) : (
                      <span className="text-app-subtle">Pendiente</span>
                    )}
                  </td>
                  {showActionsCol && (
                    <td className="text-center px-3 py-1.5">
                      {inst.estado === 'pagada' ? (
                        <button
                          onClick={() =>
                            downloadInstallmentReceipt({
                              loan,
                              installment: inst,
                              installments,
                              paidFromDeductions: paid,
                              bankAccounts,
                            })
                          }
                          title="Descargar recibo de pago (PDF)"
                          className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        canAct && (
                          <div className="inline-flex items-center gap-1">
                            {onRequestDate && (
                              <button
                                onClick={() => onRequestDate(loan, inst)}
                                title="Cambiar fecha programada"
                                className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onRequestPay && (
                              <button
                                onClick={() => onRequestPay(loan, inst)}
                                title="Registrar pago de esta cuota"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-app-bg border-t border-app-border">
              <td className="px-3 py-2 text-app-muted font-semibold text-right" colSpan={showActionsCol ? 5 : 4}>
                Total:
              </td>
              <td className="px-3 py-2 font-bold text-app-text text-right">{formatRD(totalOwed)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function LoanRow({
  loan,
  paid,
  installments,
  bankAccounts,
  onMarkPaid,
  onCancel,
  onEdit,
  onRequestPay,
  onRequestDate,
  showActions,
}: {
  loan: ContractorLoan
  paid: number
  installments: LoanInstallment[]
  bankAccounts?: BankAccount[]
  onMarkPaid?: (id: string) => void
  onCancel?: (id: string) => void
  onEdit?: (loan: ContractorLoan) => void
  showActions?: boolean
} & InstallmentActionHandlers) {
  const [showSchedule, setShowSchedule] = useState(false)
  const { effectivePaid, balance } = calcLoanProgress(loan, paid, installments)
  const overdueCount = loan.status === 'active' ? countOverdueInstallments(installments) : 0

  return (
    <>
      <tr className="hover:bg-app-hover transition-colors group">
        <td className="px-4 py-3.5">
          <div>
            <Link
              to={`/contratistas/${loan.contractor_id}`}
              className="font-semibold text-app-text hover:text-blue-600 transition-colors text-sm"
            >
              {loan.contractor?.name ?? '—'}
            </Link>
            {loan.notes && <p className="text-[11px] text-app-subtle mt-0.5">{loan.notes}</p>}
            {loan.frecuencia && (
              <p className="text-[11px] text-app-subtle mt-0.5">
                {FRECUENCIA_LABEL[loan.frecuencia] ?? loan.frecuencia}
              </p>
            )}
          </div>
        </td>
        <td className="px-4 py-3.5 text-right text-sm text-app-muted hidden sm:table-cell">
          {formatRD(loan.principal)}
        </td>
        <td className="px-4 py-3.5 text-right text-sm text-app-muted hidden md:table-cell">{loan.interest_rate}%</td>
        <td className="px-4 py-3.5 text-right text-sm font-semibold text-app-text">
          {formatRD(loan.installment_amount)}
        </td>
        <td className="px-4 py-3.5 text-right text-sm text-emerald-600 dark:text-emerald-400 hidden sm:table-cell">
          {formatRD(effectivePaid)}
        </td>
        <td className="px-4 py-3.5 text-right text-sm font-bold text-app-text">{formatRD(balance)}</td>
        <td className="px-4 py-3.5 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_COLOR[loan.status]}`}>
              {STATUS_LABEL[loan.status]}
            </span>
            {overdueCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {overdueCount} {overdueCount === 1 ? 'cuota vencida' : 'cuotas vencidas'}
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-3.5">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setShowSchedule((v) => !v)}
              title="Ver cronograma"
              className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => downloadLoanStatement({ loan, installments, paidFromDeductions: paid })}
              title="Descargar estado de cuenta (PDF)"
              className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              <FileText className="w-4 h-4" />
            </button>
            {showActions && (
              <>
                <button
                  onClick={() => onEdit?.(loan)}
                  title="Editar préstamo"
                  className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMarkPaid?.(loan.id)}
                  title="Marcar pagado"
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onCancel?.(loan.id)}
                  title="Cancelar"
                  className="p-1.5 rounded-lg text-app-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {showSchedule && (
        <tr>
          <td colSpan={8} className="bg-app-bg">
            <InstallmentSchedule
              loan={loan}
              paid={paid}
              installments={installments}
              bankAccounts={bankAccounts}
              onRequestPay={onRequestPay}
              onRequestDate={onRequestDate}
            />
          </td>
        </tr>
      )}
    </>
  )
}

function LoanCard({
  loan,
  paid,
  installments,
  bankAccounts,
  onMarkPaid,
  onCancel,
  onEdit,
  onRequestPay,
  onRequestDate,
  showActions,
}: {
  loan: ContractorLoan
  paid: number
  installments: LoanInstallment[]
  bankAccounts?: BankAccount[]
  onMarkPaid?: (id: string) => void
  onCancel?: (id: string) => void
  onEdit?: (loan: ContractorLoan) => void
  showActions?: boolean
} & InstallmentActionHandlers) {
  const [showSchedule, setShowSchedule] = useState(false)
  const { effectivePaid, balance } = calcLoanProgress(loan, paid, installments)
  const overdueCount = loan.status === 'active' ? countOverdueInstallments(installments) : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <Link
            to={`/contratistas/${loan.contractor_id}`}
            className="font-semibold text-app-text hover:text-blue-600 transition-colors text-sm truncate block"
          >
            {loan.contractor?.name ?? '—'}
          </Link>
          {loan.notes && <p className="text-[11px] text-app-subtle mt-0.5">{loan.notes}</p>}
          {loan.frecuencia && (
            <p className="text-[11px] text-app-subtle mt-0.5">{FRECUENCIA_LABEL[loan.frecuencia] ?? loan.frecuencia}</p>
          )}
          <p className="text-xs text-app-muted mt-1">
            Cuota: <span className="font-semibold text-app-text">{formatRD(loan.installment_amount)}</span>
          </p>
          <p className="text-xs text-app-muted mt-0.5">
            Saldo: <span className="font-bold text-app-text">{formatRD(balance)}</span>
          </p>
          <p className="text-xs text-app-muted mt-0.5">
            Pagado: <span className="text-emerald-600 dark:text-emerald-400">{formatRD(effectivePaid)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_COLOR[loan.status]}`}>
            {STATUS_LABEL[loan.status]}
          </span>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {overdueCount} {overdueCount === 1 ? 'cuota vencida' : 'cuotas vencidas'}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSchedule((v) => !v)}
              title="Ver cronograma"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => downloadLoanStatement({ loan, installments, paidFromDeductions: paid })}
              title="Descargar estado de cuenta (PDF)"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              <FileText className="w-4 h-4" />
            </button>
            {showActions && (
              <>
                <button
                  onClick={() => onEdit?.(loan)}
                  title="Editar préstamo"
                  className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMarkPaid?.(loan.id)}
                  title="Marcar pagado"
                  className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onCancel?.(loan.id)}
                  title="Cancelar"
                  className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-app-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {showSchedule && (
        <div className="bg-app-bg">
          <InstallmentSchedule
            loan={loan}
            paid={paid}
            installments={installments}
            bankAccounts={bankAccounts}
            onRequestPay={onRequestPay}
            onRequestDate={onRequestDate}
          />
        </div>
      )}
    </div>
  )
}

export function LoanTable({
  title,
  loans,
  paidMap,
  installmentsMap,
  bankAccounts = [],
  onMarkPaid,
  onCancel,
  onEdit,
  onPayInstallment,
  onUpdateInstallmentDate,
  showActions,
}: LoanTableProps) {
  // Cuota seleccionada para registrar pago / cambiar fecha (abre la ventana).
  const [payTarget, setPayTarget] = useState<InstallmentTarget | null>(null)
  const [dateTarget, setDateTarget] = useState<InstallmentTarget | null>(null)

  const onRequestPay = onPayInstallment
    ? (loan: ContractorLoan, installment: LoanInstallment) => setPayTarget({ loan, installment })
    : undefined
  const onRequestDate = onUpdateInstallmentDate
    ? (loan: ContractorLoan, installment: LoanInstallment) => setDateTarget({ loan, installment })
    : undefined

  if (loans.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold text-app-text mb-3">{title}</h2>
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <Banknote className="w-8 h-8 text-app-subtle mx-auto mb-2" />
          <p className="text-sm text-app-muted">No hay préstamos registrados</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-app-text mb-3">{title}</h2>
      <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
        <table className="w-full text-sm hidden sm:table">
          <thead>
            <tr className="bg-app-bg border-b border-app-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">
                Contratista
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">
                Capital
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden md:table-cell">
                Tasa
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">
                Cuota
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">
                Pagado
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">
                Saldo
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">
                Estado
              </th>
              <th className="w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {loans.map((loan) => (
              <LoanRow
                key={loan.id}
                loan={loan}
                paid={paidMap[loan.id] ?? 0}
                installments={installmentsMap[loan.id] ?? []}
                bankAccounts={bankAccounts}
                onMarkPaid={onMarkPaid}
                onCancel={onCancel}
                onEdit={onEdit}
                onRequestPay={onRequestPay}
                onRequestDate={onRequestDate}
                showActions={showActions}
              />
            ))}
          </tbody>
        </table>
        <div className="sm:hidden divide-y divide-app-border">
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              paid={paidMap[loan.id] ?? 0}
              installments={installmentsMap[loan.id] ?? []}
              bankAccounts={bankAccounts}
              onMarkPaid={onMarkPaid}
              onCancel={onCancel}
              onEdit={onEdit}
              onRequestPay={onRequestPay}
              onRequestDate={onRequestDate}
              showActions={showActions}
            />
          ))}
        </div>
      </div>

      {onPayInstallment && (
        <InstallmentPayModal
          target={payTarget}
          bankAccounts={bankAccounts}
          onConfirm={async (fechaPago, cuentaCobroId) => {
            if (payTarget) await onPayInstallment(payTarget.loan, payTarget.installment, fechaPago, cuentaCobroId)
          }}
          onClose={() => setPayTarget(null)}
        />
      )}
      {onUpdateInstallmentDate && (
        <InstallmentDateModal
          target={dateTarget}
          onConfirm={async (fechaProgramada) => {
            if (dateTarget) await onUpdateInstallmentDate(dateTarget.installment, fechaProgramada)
          }}
          onClose={() => setDateTarget(null)}
        />
      )}
    </section>
  )
}
