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
    <div className="bg-app-surface rounded-xl border border-app-border p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-app-text">Resumen presupuestario</p>
        <Link to={`/proyectos/${projectId}/presupuesto`} className="text-xs text-blue-600 hover:text-blue-800">Ver detalle</Link>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-app-muted">Presupuesto</p>
          <p className="text-sm font-semibold text-app-text">{formatRD(totalBudget)}</p>
        </div>
        <div>
          <p className="text-xs text-app-muted">Invertido</p>
          <p className="text-sm font-semibold text-app-text">{formatRD(totalInvested)}</p>
        </div>
        <div>
          <p className="text-xs text-app-muted">Disponible</p>
          <p className={`text-sm font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRD(remaining)}</p>
        </div>
      </div>
      <div className="mt-3 w-full h-2 bg-app-chip rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
