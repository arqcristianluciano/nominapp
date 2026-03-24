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
      <div className="bg-app-surface rounded-xl border border-app-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-app-text">{formatRD(transitos)}</p>
            <p className="text-xs text-app-muted">Tránsitos</p>
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

      <div className={`rounded-xl border p-4 ${disponibleNeto <= 0 ? 'bg-red-50 border-red-200' : 'bg-app-surface border-app-border'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${disponibleNeto <= 0 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-lg font-semibold ${disponibleNeto <= 0 ? 'text-red-700' : 'text-app-text'}`}>
              {formatRD(disponibleNeto)}
            </p>
            <p className="text-xs text-app-muted">Disponible neto</p>
            {disponibleNeto <= 0 && (
              <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                SOLICITAR FONDOS
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-app-surface rounded-xl border border-app-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-app-text">{formatRD(totalIncurrido)}</p>
            <p className="text-xs text-app-muted">Total incurrido</p>
          </div>
        </div>
      </div>
    </div>
  )
}
