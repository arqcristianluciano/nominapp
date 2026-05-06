import { ExternalLink, FileX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CATEGORY_COLORS, CATEGORY_LABELS, CUBICABLE_CATEGORIES } from '@/types/mercadoBudget'
import type { MercadoBudgetLine, MercadoCategory } from '@/types/mercadoBudget'
import { formatRD } from '@/utils/currency'

const CATEGORIES: MercadoCategory[] = ['AJUSTES', 'MANO_DE_OBRA', 'EQUIPOS', 'MATERIALES']

export function InsumosLinesTable({
  lines,
  projectId,
  activeCategory,
  onCategoryChange,
  onCreateContract,
}: {
  lines: MercadoBudgetLine[]
  projectId: string
  activeCategory: MercadoCategory | 'ALL'
  onCategoryChange: (category: MercadoCategory | 'ALL') => void
  onCreateContract: (line: MercadoBudgetLine) => void
}) {
  const filtered = activeCategory === 'ALL' ? lines : lines.filter((line) => line.category === activeCategory)
  const countByCategory = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: lines.filter((line) => line.category === cat).length }), {} as Record<MercadoCategory, number>)

  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-app-border bg-app-bg overflow-x-auto">
        {(['ALL', ...CATEGORIES] as const).map((cat) => (
          <button key={cat} onClick={() => onCategoryChange(cat)} className={`px-2.5 py-1 rounded text-[10px] font-semibold whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'text-app-muted hover:bg-app-hover'}`}>
            {cat === 'ALL' ? `Todas (${lines.length})` : `${CATEGORY_LABELS[cat]} (${countByCategory[cat]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center"><FileX className="w-8 h-8 text-app-subtle mx-auto mb-2" /><p className="text-sm text-app-muted">Sin líneas en esta categoría</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-app-bg border-b border-app-border">
              <th className="px-3 py-2.5 text-left font-semibold text-app-muted uppercase text-[10px]">Categoría</th><th className="px-3 py-2.5 text-left font-semibold text-app-muted uppercase text-[10px]">Cód.</th><th className="px-3 py-2.5 text-left font-semibold text-app-muted uppercase text-[10px]">Descripción</th><th className="px-3 py-2.5 text-center font-semibold text-app-muted uppercase text-[10px]">Und</th><th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">Cant. Pres.</th><th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">P.U. Pres.</th><th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">Total Pres.</th><th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">Acordado</th><th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">Desvío</th><th className="px-3 py-2.5 text-center font-semibold text-app-muted uppercase text-[10px]">Contrato</th>
            </tr></thead>
            <tbody className="divide-y divide-app-border">
              {filtered.map((line) => {
                const isCubicable = CUBICABLE_CATEGORIES.includes(line.category)
                const hasContract = !!line.contract_id
                const agreedTotal = (line.agreed_quantity ?? 0) * (line.agreed_unit_price ?? 0)
                const deviation = hasContract ? agreedTotal - line.budgeted_total : null
                const deviationPct = hasContract && line.budgeted_total > 0 ? (deviation! / line.budgeted_total) * 100 : null
                return (
                  <tr key={line.id} className="hover:bg-app-hover">
                    <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${CATEGORY_COLORS[line.category]}`}>{CATEGORY_LABELS[line.category]}</span></td>
                    <td className="px-3 py-2 text-app-subtle font-mono">{line.code || '—'}</td>
                    <td className="px-3 py-2 text-app-text max-w-[200px] truncate" title={line.description}>{line.description}</td>
                    <td className="px-3 py-2 text-center text-app-muted">{line.unit}</td>
                    <td className="px-3 py-2 text-right text-app-muted">{line.budgeted_quantity}</td>
                    <td className="px-3 py-2 text-right text-app-muted">{formatRD(line.budgeted_unit_price)}</td>
                    <td className="px-3 py-2 text-right font-medium text-app-text">{formatRD(line.budgeted_total)}</td>
                    <td className="px-3 py-2 text-right text-app-muted">{hasContract ? <span className="font-medium text-app-text">{formatRD(agreedTotal)}</span> : '—'}</td>
                    <td className="px-3 py-2 text-right">{deviation !== null ? <span className={`font-semibold ${deviation > 0 ? 'text-red-600' : 'text-green-700'}`}>{deviation >= 0 ? '+' : ''}{deviationPct!.toFixed(1)}%</span> : '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {hasContract ? <Link to={`/proyectos/${projectId}/cubicaciones/${line.contract_id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">Ver <ExternalLink className="w-3 h-3" /></Link> : isCubicable ? <button onClick={() => onCreateContract(line)} className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-semibold hover:bg-blue-700">Crear contrato</button> : <span className="text-[10px] text-app-subtle">Referencia</span>}
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
