import { FileSpreadsheet } from 'lucide-react'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/mercadoBudget'
import type { MercadoBudget, MercadoCategory, MercadoBudgetLine } from '@/types/mercadoBudget'
import { formatRD } from '@/utils/currency'

const CATEGORIES: MercadoCategory[] = ['AJUSTES', 'MANO_DE_OBRA', 'EQUIPOS', 'MATERIALES']

export function InsumosSummary({
  budget,
  lines,
  countByCategory,
}: {
  budget: MercadoBudget
  lines: MercadoBudgetLine[]
  countByCategory: Record<MercadoCategory, number>
}) {
  const grandTotal = (budget.total_ajustes ?? 0) + (budget.total_equipos ?? 0) + (budget.total_mano_obra ?? 0) + (budget.total_materiales ?? 0)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => {
          const total = cat === 'AJUSTES' ? budget.total_ajustes : cat === 'EQUIPOS' ? budget.total_equipos : cat === 'MANO_DE_OBRA' ? budget.total_mano_obra : budget.total_materiales
          const contracted = lines.filter((line) => line.category === cat && line.contract_id).length
          return (
            <div key={cat} className="bg-app-surface border border-app-border rounded-xl p-4">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mb-1 ${CATEGORY_COLORS[cat]}`}>{CATEGORY_LABELS[cat]}</span>
              <p className="text-lg font-semibold text-app-text">{formatRD(total)}</p>
              <p className="text-[11px] text-app-muted mt-0.5">{countByCategory[cat]} líneas · {contracted} cubicadas</p>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 text-xs text-app-muted">
        <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
        <span>{budget.file_name}</span><span>·</span>
        <span>Total presupuestado: <strong className="text-app-text">{formatRD(grandTotal)}</strong></span><span>·</span>
        <span>Importado {new Date(budget.imported_at).toLocaleDateString('es-DO')}</span>
      </div>
    </>
  )
}
