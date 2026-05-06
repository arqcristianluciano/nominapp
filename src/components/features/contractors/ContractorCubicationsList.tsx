import { Layers } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { Cubication, ProjectLite } from './detailTypes'

export function ContractorCubicationsList({
  cubications,
  projectMap,
}: {
  cubications: Cubication[]
  projectMap: Record<string, ProjectLite>
}) {
  if (cubications.length === 0) return null

  return (
    <div>
      <h2 className="text-base font-semibold text-app-text mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-app-subtle" /> Contratos de cubicación</h2>
      <div className="space-y-2">
        {cubications.map((cubication) => {
          const project = projectMap[cubication.project_id]
          const pct = Math.round(cubication.completion_percent)
          return (
            <div key={cubication.id} className="bg-app-surface rounded-xl border border-app-border px-4 py-3">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0"><p className="text-sm font-medium text-app-text truncate">{cubication.specialty}</p>{project && <p className="text-xs text-app-subtle">{project.name}</p>}</div>
                <div className="text-right shrink-0"><p className="text-sm font-semibold text-app-muted">{formatRD(cubication.total_advanced)}</p><p className="text-xs text-app-subtle">de {formatRD(cubication.adjusted_budget || 0)}</p></div>
              </div>
              <div className="h-1.5 bg-app-chip rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} /></div>
              <p className="text-[10px] text-app-subtle mt-1">{pct}% completado · Pendiente {formatRD(cubication.remaining)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
