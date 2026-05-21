import { Link } from 'react-router-dom'
import { formatRD } from '@/utils/currency'

interface Props {
  projectId: string
  totalBudget: number
  totalInvested: number
}

export function ProjectBudgetSummary({ projectId, totalBudget, totalInvested }: Props) {
  if (totalBudget <= 0) return null

  const remaining = totalBudget - totalInvested
  const progress = Math.min((totalInvested / totalBudget) * 100, 100)
  const progressColor = totalInvested / totalBudget > 0.9 ? 'bg-red-500' : totalInvested / totalBudget > 0.7 ? 'bg-amber-500' : 'bg-green-500'

  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-sm font-medium text-app-text truncate">Resumen presupuestario</p>
        <Link to={`/proyectos/${projectId}/presupuesto`} className="text-xs text-blue-600 hover:text-blue-800 shrink-0 inline-flex items-center min-h-[44px] sm:min-h-0">Ver detalle</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-left sm:text-center">
        <div className="flex sm:block items-baseline justify-between gap-2 min-w-0">
          <p className="text-xs text-app-muted shrink-0">Presupuesto</p>
          <p className="text-sm font-semibold text-app-text break-all text-right sm:text-center">{formatRD(totalBudget)}</p>
        </div>
        <div className="flex sm:block items-baseline justify-between gap-2 min-w-0">
          <p className="text-xs text-app-muted shrink-0">Invertido</p>
          <p className="text-sm font-semibold text-app-text break-all text-right sm:text-center">{formatRD(totalInvested)}</p>
        </div>
        <div className="flex sm:block items-baseline justify-between gap-2 min-w-0">
          <p className="text-xs text-app-muted shrink-0">Disponible</p>
          <p className={`text-sm font-semibold break-all text-right sm:text-center ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRD(remaining)}</p>
        </div>
      </div>
      <div className="mt-3 w-full h-2 bg-app-chip rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-app-muted sm:hidden">
        <span>Avance</span>
        <span className="font-medium text-app-text">{progress.toFixed(0)}%</span>
      </div>
    </div>
  )
}
