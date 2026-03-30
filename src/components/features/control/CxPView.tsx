import type { TransactionWithRelations } from '@/services/transactionService'
import { calcCxPDetails } from '@/utils/financialCalculations'
import { formatRD } from '@/utils/currency'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function agingBucket(days: number): { label: string; cls: string } {
  if (days <= 30) return { label: '0-30d', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' }
  if (days <= 60) return { label: '31-60d', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' }
  return { label: '+60d', cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' }
}

export function CxPView({ transactions }: { transactions: TransactionWithRelations[] }) {
  const cxpItems = calcCxPDetails(transactions)
  const totalCxP = cxpItems.reduce((sum, item) => sum + item.pending, 0)

  const buckets = { '0-30d': 0, '31-60d': 0, '+60d': 0 }
  cxpItems.forEach((item) => {
    const days = daysSince(item.date)
    const { label } = agingBucket(days)
    buckets[label as keyof typeof buckets] += item.pending
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-xs text-red-600 dark:text-red-400">Total CxP</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-0.5">{formatRD(totalCxP)}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Corriente (0-30d)</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{formatRD(buckets['0-30d'])}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-xs text-amber-600 dark:text-amber-400">Por vencer (31-60d)</p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-0.5">{formatRD(buckets['31-60d'])}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-xs text-red-600 dark:text-red-400">Vencido (+60d)</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-0.5">{formatRD(buckets['+60d'])}</p>
        </div>
      </div>

      {cxpItems.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <p className="text-app-muted">No hay cuentas por pagar pendientes</p>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Fecha</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Días</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Antigüedad</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Factura No.</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Proveedor</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Pendiente</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Condición</th>
              </tr>
            </thead>
            <tbody>
              {cxpItems
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((item, idx) => {
                  const days = daysSince(item.date)
                  const bucket = agingBucket(days)
                  return (
                    <tr key={idx} className="border-b border-app-border hover:bg-app-hover">
                      <td className="px-3 py-2.5 text-xs text-app-muted">{new Date(item.date).toLocaleDateString('es-DO')}</td>
                      <td className="px-3 py-2.5 text-xs text-app-muted">{days}d</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${bucket.cls}`}>{bucket.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-app-muted">{item.invoiceNumber || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-app-text font-medium">{item.supplierName}</td>
                      <td className="px-3 py-2.5 text-xs text-red-700 dark:text-red-400 font-semibold text-right">{formatRD(item.pending)}</td>
                      <td className="px-3 py-2.5 text-xs text-app-muted">{item.paymentCondition}</td>
                    </tr>
                  )
                })}
            </tbody>
            <tfoot>
              <tr className="bg-app-bg border-t border-app-border">
                <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-app-muted text-right">Total CxP:</td>
                <td className="px-3 py-2 text-xs font-bold text-red-700 dark:text-red-400 text-right">{formatRD(totalCxP)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
