import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ProjectsSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((item) => (
        <div key={item} className="animate-pulse rounded-xl border border-app-border bg-app-surface p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-app-chip" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-app-chip" />
              <div className="h-2.5 w-1/3 rounded bg-app-chip" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyProjects() {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950/60">
        <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
      <p className="mb-1 text-sm font-medium text-app-text">Sin proyectos activos</p>
      <p className="mb-4 text-xs text-app-muted">Crea tu primer proyecto para empezar</p>
      <Link
        to="/proyectos"
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
      >
        <Building2 className="h-3.5 w-3.5" />
        Ir a Proyectos
      </Link>
    </div>
  )
}
