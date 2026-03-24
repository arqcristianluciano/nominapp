import { Filter } from 'lucide-react'
import type { Project } from '@/types/database'

const selectClass =
  'w-full max-w-md px-3 py-2.5 border border-app-border rounded-lg text-sm bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500'

type Props = {
  value: string
  onChange: (value: string) => void
  activeProjects: Project[]
}

export function CxPProjectFilterBar({ value, onChange, activeProjects }: Props) {
  return (
    <div className="bg-app-surface border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shrink-0">
          <Filter className="w-5 h-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-app-text">Filtrar por proyecto</p>
          <p className="text-xs text-app-muted mt-1 mb-3">
            Elige una obra para ver solo sus cuentas por pagar, o «Todos los proyectos» para el consolidado.
          </p>
          <label className="block max-w-md">
            <span className="sr-only">Proyecto</span>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={selectClass}
              aria-label="Filtrar cuentas por pagar por proyecto"
            >
              <option value="all">Todos los proyectos</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}
