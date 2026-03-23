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
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No hay cuentas por pagar pendientes</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Factura No.</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Proveedor</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Pendiente</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Acreedor</th>
              </tr>
            </thead>
            <tbody>
              {cxpItems.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-xs text-gray-600">{new Date(item.date).toLocaleDateString('es-DO')}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{item.invoiceNumber || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-900 font-medium">{item.supplierName}</td>
                  <td className="px-3 py-2.5 text-xs text-red-700 font-semibold text-right">{formatRD(item.pending)}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{item.paymentCondition}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-gray-700 text-right">Total CxP:</td>
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
