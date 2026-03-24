import { TrendingDown, Wallet } from 'lucide-react'
import type { TransactionWithRelations } from '@/services/transactionService'
import { formatRD } from '@/utils/currency'

const DEPOSIT_CODE = '19 - DEPOSITOS'

export function ChequesEfectivoView({
  transactions,
  transitos,
  cashDisponible,
}: {
  transactions: TransactionWithRelations[]
  transitos: number
  cashDisponible: number
}) {
  const bankMovements = transactions.filter(
    (t) =>
      t.check_number ||
      t.payment_condition?.includes('Cash') ||
      t.payment_condition?.includes('Cheque') ||
      t.budget_category?.code === DEPOSIT_CODE
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-app-surface rounded-xl border border-app-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-app-text">{formatRD(transitos)}</p>
              <p className="text-xs text-app-muted">Tránsitos (cheques sin cobrar)</p>
            </div>
          </div>
        </div>
        <div className="bg-app-surface rounded-xl border border-app-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-app-text">{formatRD(cashDisponible)}</p>
              <p className="text-xs text-app-muted">Cash disponible</p>
            </div>
          </div>
        </div>
      </div>

      {bankMovements.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <p className="text-app-muted">No hay movimientos bancarios registrados</p>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">No. Cheque</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Banco</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha Canje</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Detalle</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Monto</th>
              </tr>
            </thead>
            <tbody>
              {bankMovements.map((t) => {
                const isUncashed = t.check_number && !t.cashed_date
                const isDeposit = t.budget_category?.code === DEPOSIT_CODE
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-app-border hover:bg-app-hover ${isUncashed ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-3 py-2.5 text-xs text-app-muted">{new Date(t.date).toLocaleDateString('es-DO')}</td>
                    <td className="px-3 py-2.5 text-xs text-app-muted">{t.check_number || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-app-muted">{t.bank || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-app-muted">
                      {t.cashed_date ? new Date(t.cashed_date).toLocaleDateString('es-DO') : (
                        t.check_number ? <span className="text-amber-600 font-medium">Pendiente</span> : '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-app-text">{t.description}</td>
                    <td className={`px-3 py-2.5 text-xs font-semibold text-right ${isDeposit ? 'text-green-700' : 'text-app-text'}`}>
                      {isDeposit ? '+' : ''}{formatRD(t.total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
