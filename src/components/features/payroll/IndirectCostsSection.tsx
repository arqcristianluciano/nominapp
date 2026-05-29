import { formatRD } from '@/utils/currency'
import type { IndirectCost } from '@/types/database'

export function IndirectCostsSection({
  costs,
  canEdit,
  saving,
  total,
  onToggleActive,
}: {
  costs: IndirectCost[]
  canEdit: boolean
  saving: boolean
  total: number
  onToggleActive: (costId: string, isActive: boolean) => void
}) {
  if (costs.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-medium text-app-text mb-1">Gastos indirectos</h2>
      <p className="text-xs text-app-subtle mb-3">
        Desmarca los que no se aplican en este reporte. La preferencia se mantiene para los próximos.
      </p>
      <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-app-border">
            {costs.map((cost) => (
              <tr key={cost.id} className={cost.is_active ? '' : 'opacity-50'}>
                <td className="px-4 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={cost.is_active}
                    disabled={!canEdit || saving}
                    onChange={(e) => onToggleActive(cost.id, e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                  />
                </td>
                <td className={`px-4 py-2.5 text-app-muted ${cost.is_active ? '' : 'line-through'}`}>
                  {cost.description}
                </td>
                <td className="px-4 py-2.5 text-right text-app-muted">
                  {cost.percentage ? `${cost.percentage}%` : 'Fijo'}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-app-text w-32">
                  {formatRD(cost.calculated_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 bg-purple-50 rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-medium text-purple-900">Total indirectos</span>
        <span className="text-sm font-semibold text-purple-900">{formatRD(total)}</span>
      </div>
    </section>
  )
}
