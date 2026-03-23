import { TrendingDown, Wallet, AlertTriangle, BarChart3 } from 'lucide-react'
import { formatRD } from '@/utils/currency'

export function FinancialIndicators({
  transitos,
  cashDisponible,
  disponibleNeto,
  totalIncurrido,
}: {
  transitos: number
  cashDisponible: number
  disponibleNeto: number
  totalIncurrido: number
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{formatRD(transitos)}</p>
            <p className="text-xs text-gray-500">Tránsitos</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{formatRD(cashDisponible)}</p>
            <p className="text-xs text-gray-500">Cash disponible</p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${disponibleNeto <= 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${disponibleNeto <= 0 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-lg font-semibold ${disponibleNeto <= 0 ? 'text-red-700' : 'text-gray-900'}`}>
              {formatRD(disponibleNeto)}
            </p>
            <p className="text-xs text-gray-500">Disponible neto</p>
            {disponibleNeto <= 0 && (
              <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                SOLICITAR FONDOS
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{formatRD(totalIncurrido)}</p>
            <p className="text-xs text-gray-500">Total incurrido</p>
          </div>
        </div>
      </div>
    </div>
  )
}
