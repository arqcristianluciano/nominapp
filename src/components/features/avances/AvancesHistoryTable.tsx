import type { PartidaProgress } from '@/services/partidaProgressService'
import type { BudgetCategory, BudgetItem } from '@/types/database'

interface AvancesHistoryTableProps {
  progresses: PartidaProgress[]
  catById: Map<string, BudgetCategory>
  itemById: Map<string, BudgetItem>
}

export function AvancesHistoryTable({
  progresses,
  catById,
  itemById,
}: AvancesHistoryTableProps) {
  if (progresses.length === 0) {
    return (
      <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
        <p className="text-base font-semibold text-app-text mb-1">Sin avances registrados</p>
        <p className="text-sm text-app-muted">
          Captura avances por partida para alimentar la cubicación mensual.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-app-chip text-app-muted text-xs">
          <tr>
            <th className="px-3 py-2 text-left">Fecha</th>
            <th className="px-3 py-2 text-left">Capítulo</th>
            <th className="px-3 py-2 text-left">Partida</th>
            <th className="px-3 py-2 text-right">Cantidad</th>
            <th className="px-3 py-2 text-right">%</th>
            <th className="px-3 py-2 text-left">Responsable</th>
            <th className="px-3 py-2 text-left">Notas</th>
          </tr>
        </thead>
        <tbody>
          {progresses.map((p) => {
            const cat = p.budget_category_id ? catById.get(p.budget_category_id) : null
            const it = p.budget_item_id ? itemById.get(p.budget_item_id) : null
            return (
              <tr key={p.id} className="border-t border-app-border">
                <td className="px-3 py-2 font-mono text-xs">{p.cut_date}</td>
                <td className="px-3 py-2">
                  {cat ? (
                    <>
                      {cat.code} {cat.name}
                    </>
                  ) : (
                    <span className="text-app-subtle">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {it ? (
                    <>
                      {it.code ? `[${it.code}] ` : ''}
                      {it.description}
                    </>
                  ) : (
                    <span className="text-app-subtle">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{p.executed_quantity ?? '—'}</td>
                <td className="px-3 py-2 text-right">{p.executed_percent ?? '—'}</td>
                <td className="px-3 py-2 text-app-muted">{p.responsible ?? '—'}</td>
                <td className="px-3 py-2 text-app-muted">{p.notes ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
