import { formatRD } from '@/utils/currency'

export function CubicacionesSummaryCards({
  acordado,
  acumulado,
  pendiente,
}: {
  acordado: number
  acumulado: number
  pendiente: number
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-app-surface border border-app-border rounded-xl p-4"><p className="text-xs text-app-muted">Total acordado</p><p className="text-xl font-semibold text-app-text mt-1">{formatRD(acordado)}</p></div>
      <div className="bg-app-surface border border-app-border rounded-xl p-4"><p className="text-xs text-app-muted">Total acumulado</p><p className="text-xl font-semibold text-blue-700 mt-1">{formatRD(acumulado)}</p></div>
      <div className="bg-app-surface border border-app-border rounded-xl p-4"><p className="text-xs text-app-muted">Total pendiente</p><p className={`text-xl font-semibold mt-1 ${pendiente >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatRD(pendiente)}</p></div>
    </div>
  )
}
