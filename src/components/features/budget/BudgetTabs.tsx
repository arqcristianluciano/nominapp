import { ListOrdered, PackageSearch } from 'lucide-react'
import { Link } from 'react-router-dom'

type BudgetTab = 'presupuesto' | 'precios'

export function BudgetTabs({
  tab,
  projectId,
  priceCount,
  onChange,
}: {
  tab: BudgetTab
  projectId: string
  priceCount: number
  onChange: (tab: BudgetTab) => void
}) {
  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
      active ? 'bg-app-surface text-app-text shadow-sm' : 'text-app-muted hover:text-app-muted'
    }`

  return (
    <div className="flex gap-1 bg-app-chip rounded-lg p-1 w-fit">
      <button onClick={() => onChange('presupuesto')} className={tabClass(tab === 'presupuesto')}>
        <ListOrdered className="w-3.5 h-3.5" /> Presupuesto
      </button>
      <button onClick={() => onChange('precios')} className={tabClass(tab === 'precios')}>
        Lista de precios <span className="text-[10px] text-app-subtle">({priceCount})</span>
      </button>
      <Link
        to={`/proyectos/${projectId}/insumos`}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors text-app-muted hover:text-app-text"
      >
        <PackageSearch className="w-3.5 h-3.5" /> Insumos
      </Link>
    </div>
  )
}
