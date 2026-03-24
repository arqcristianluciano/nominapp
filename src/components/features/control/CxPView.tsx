import type { TransactionWithRelations } from '@/services/transactionService'
import { calcCxPDetails } from '@/utils/financialCalculations'
import { formatRD } from '@/utils/currency'

export function CxPView({ transactions }: { transactions: TransactionWithRelations[] }) {
  const cxpItems = calcCxPDetails(transactions)
  const totalCxP = cxpItems.reduce((sum, item) => sum + item.pending, 0)

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-xs text-red-600">Total cuentas por pagar</p>
        <p className="text-2xl font-bold text-red-700">{formatRD(totalCxP)}</p>
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
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Factura No.</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Proveedor</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Pendiente</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Acreedor</th>
              </tr>
            </thead>
            <tbody>
              {cxpItems.map((item, idx) => (
                <tr key={idx} className="border-b border-app-border hover:bg-app-hover">
                  <td className="px-3 py-2.5 text-xs text-app-muted">{new Date(item.date).toLocaleDateString('es-DO')}</td>
                  <td className="px-3 py-2.5 text-xs text-app-muted">{item.invoiceNumber || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-app-text font-medium">{item.supplierName}</td>
                  <td className="px-3 py-2.5 text-xs text-red-700 font-semibold text-right">{formatRD(item.pending)}</td>
                  <td className="px-3 py-2.5 text-xs text-app-muted">{item.paymentCondition}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-app-bg border-t border-app-border">
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-app-muted text-right">Total CxP:</td>
                <td className="px-3 py-2 text-xs font-bold text-red-700 text-right">{formatRD(totalCxP)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
