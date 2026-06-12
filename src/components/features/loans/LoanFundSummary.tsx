import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Banknote, HandCoins, TrendingUp, Wallet } from 'lucide-react'
import { accountMovementService } from '@/services/accountMovementService'
import { calcInterestEarned, calcLoanProgress, countOverdueInstallments } from '@/services/loanService'
import { formatRD } from '@/utils/currency'
import { round2 } from '@/utils/money'
import type { BankAccount, ContractorLoan, LoanInstallment } from '@/types/database'

interface Props {
  loans: ContractorLoan[]
  paidMap: Record<string, number>
  installmentsMap: Record<string, LoanInstallment[]>
  bankAccounts: BankAccount[]
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'blue' | 'amber' | 'emerald' | 'red'
}) {
  const toneClass = {
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
  }[tone]

  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className={toneClass}>{icon}</span>
        <p className="text-xs text-app-subtle uppercase font-semibold">{label}</p>
      </div>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}

/** Foto rápida del fondo de préstamos: dinero disponible en las cuentas
 *  internas, dinero prestado pendiente de cobro, total cobrado y cuotas
 *  vencidas. */
export function LoanFundSummary({ loans, paidMap, installmentsMap, bankAccounts }: Props) {
  const internalAccountIds = useMemo(() => bankAccounts.filter((a) => a.is_internal).map((a) => a.id), [bankAccounts])
  const [disponible, setDisponible] = useState<number | null>(null)

  // Saldo total de las cuentas internas; se recalcula cuando cambian los
  // préstamos porque crear/cobrar genera movimientos en las cuentas.
  useEffect(() => {
    if (internalAccountIds.length === 0) return
    let cancelled = false
    accountMovementService
      .getByAccounts(internalAccountIds)
      .then((map) => {
        if (cancelled) return
        const total = internalAccountIds.reduce(
          (sum, id) => sum + accountMovementService.calcSaldo(map[id] ?? []).saldo,
          0,
        )
        setDisponible(round2(total))
      })
      .catch(() => {
        // Tarjeta informativa: si falla la carga se muestra "—".
        if (!cancelled) setDisponible(null)
      })
    return () => {
      cancelled = true
    }
  }, [internalAccountIds, loans])

  // Sin cuentas internas no hay saldo que mostrar (se ignora cualquier valor previo).
  const disponibleShown = internalAccountIds.length === 0 ? null : disponible

  const { enLaCalle, totalCobrado, intereses, cuotasVencidas } = useMemo(() => {
    let calle = 0
    let cobrado = 0
    let ganado = 0
    let vencidas = 0
    for (const loan of loans) {
      const installments = installmentsMap[loan.id] ?? []
      const { effectivePaid, balance } = calcLoanProgress(loan, paidMap[loan.id] ?? 0, installments)
      cobrado += effectivePaid
      ganado += calcInterestEarned(loan, effectivePaid)
      if (loan.status === 'active') {
        calle += balance
        vencidas += countOverdueInstallments(installments)
      }
    }
    return {
      enLaCalle: round2(calle),
      totalCobrado: round2(cobrado),
      intereses: round2(ganado),
      cuotasVencidas: vencidas,
    }
  }, [loans, paidMap, installmentsMap])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <SummaryCard
        icon={<Wallet className="w-4 h-4" />}
        label="Disponible en cuentas"
        value={disponibleShown !== null ? formatRD(disponibleShown) : '—'}
        tone="blue"
      />
      <SummaryCard
        icon={<HandCoins className="w-4 h-4" />}
        label="En la calle"
        value={formatRD(enLaCalle)}
        tone="amber"
      />
      <SummaryCard
        icon={<Banknote className="w-4 h-4" />}
        label="Total cobrado"
        value={formatRD(totalCobrado)}
        tone="emerald"
      />
      <SummaryCard
        icon={<TrendingUp className="w-4 h-4" />}
        label="Intereses ganados"
        value={formatRD(intereses)}
        tone="emerald"
      />
      <SummaryCard
        icon={<AlertTriangle className="w-4 h-4" />}
        label="Cuotas vencidas"
        value={String(cuotasVencidas)}
        tone={cuotasVencidas > 0 ? 'red' : 'emerald'}
      />
    </div>
  )
}
