import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, CheckCircle, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import type { ContractorLoan } from '@/types/database'
import { formatRD } from '@/utils/currency'
import { mul, round2 } from '@/utils/money'

interface LoanTableProps {
  title: string
  loans: ContractorLoan[]
  paidMap: Record<string, number>
  onMarkPaid?: (id: string) => void
  onCancel?: (id: string) => void
  showActions?: boolean
}

const STATUS_LABEL: Record<string, string> = { active: 'Activo', paid: 'Pagado', cancelled: 'Cancelado' }
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  cancelled: 'bg-app-chip text-app-muted',
}

function AmortizationTable({ loan, paid }: { loan: ContractorLoan; paid: number }) {
  const totalOwed = round2(mul(loan.installment_amount, loan.installments))
  const paidInstallments = Math.min(loan.installments, Math.floor(paid / loan.installment_amount))

  return (
    <div className="px-4 pb-4">
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
              const installment = idx + 1
              const isPaid = installment <= paidInstallments
              return (
                <tr
                  key={installment}
                  className={isPaid ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'hover:bg-app-hover'}
                >
                  <td className="text-center px-3 py-1.5 text-app-muted font-mono">#{installment}</td>
                  <td className="text-right px-3 py-1.5 font-medium text-app-text">
                    {formatRD(loan.installment_amount)}
                  </td>
                  <td className="text-center px-3 py-1.5">
                    {isPaid ? (
                      <span className="text-emerald-600 font-semibold">✓ Pagado</span>
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

function LoanRow({
  loan,
  paid,
  onMarkPaid,
  onCancel,
  showActions,
}: {
  loan: ContractorLoan
  paid: number
  onMarkPaid?: (id: string) => void
  onCancel?: (id: string) => void
  showActions?: boolean
}) {
  const [showAmort, setShowAmort] = useState(false)
  const totalOwed = round2(mul(loan.installment_amount, loan.installments))
  const balance = Math.max(0, round2(totalOwed - paid))

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
          {formatRD(paid)}
        </td>
        <td className="px-4 py-3.5 text-right text-sm font-bold text-app-text">{formatRD(balance)}</td>
        <td className="px-4 py-3.5 text-center">
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_COLOR[loan.status]}`}>
            {STATUS_LABEL[loan.status]}
          </span>
        </td>
        <td className="px-2 py-3.5">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setShowAmort((value) => !value)}
              title="Ver amortización"
              className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              {showAmort ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showActions && (
              <>
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
      {showAmort && (
        <tr>
          <td colSpan={8} className="bg-app-bg">
            <AmortizationTable loan={loan} paid={paid} />
          </td>
        </tr>
      )}
    </>
  )
}

function LoanCard({
  loan,
  paid,
  onMarkPaid,
  onCancel,
  showActions,
}: {
  loan: ContractorLoan
  paid: number
  onMarkPaid?: (id: string) => void
  onCancel?: (id: string) => void
  showActions?: boolean
}) {
  const [showAmort, setShowAmort] = useState(false)
  const totalOwed = round2(mul(loan.installment_amount, loan.installments))
  const balance = Math.max(0, round2(totalOwed - paid))

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
          <p className="text-xs text-app-muted mt-1">
            Cuota: <span className="font-semibold text-app-text">{formatRD(loan.installment_amount)}</span>
          </p>
          <p className="text-xs text-app-muted mt-0.5">
            Saldo: <span className="font-bold text-app-text">{formatRD(balance)}</span>
          </p>
          <p className="text-xs text-app-muted mt-0.5">
            Pagado: <span className="text-emerald-600 dark:text-emerald-400">{formatRD(paid)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_COLOR[loan.status]}`}>
            {STATUS_LABEL[loan.status]}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAmort((value) => !value)}
              title="Ver amortización"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              {showAmort ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showActions && (
              <>
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
      {showAmort && (
        <div className="bg-app-bg">
          <AmortizationTable loan={loan} paid={paid} />
        </div>
      )}
    </div>
  )
}

export function LoanTable({ title, loans, paidMap, onMarkPaid, onCancel, showActions }: LoanTableProps) {
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
              <th className="w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {loans.map((loan) => (
              <LoanRow
                key={loan.id}
                loan={loan}
                paid={paidMap[loan.id] ?? 0}
                onMarkPaid={onMarkPaid}
                onCancel={onCancel}
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
              onMarkPaid={onMarkPaid}
              onCancel={onCancel}
              showActions={showActions}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
