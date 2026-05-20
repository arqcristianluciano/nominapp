import { Plus } from 'lucide-react'
import { useAppRoles } from '@/hooks/useAppRoles'

export function ProjectsHeader({
  total,
  active,
  paused,
  onCreate,
}: {
  total: number
  active: number
  paused: number
  onCreate: () => void
}) {
  const { canCreateProject } = useAppRoles()
  const primaryButtonClass =
    'flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-600/20 shrink-0 hover:bg-blue-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg'

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-app-text">Proyectos</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-app-muted">{total} registrados</span>
          {active > 0 && <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full">{active} activos</span>}
          {paused > 0 && <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 rounded-full">{paused} pausados</span>}
        </div>
      </div>
      {canCreateProject && (
        <button type="button" onClick={onCreate} className={primaryButtonClass}>
          <Plus className="w-4 h-4" /> Nuevo proyecto
        </button>
      )}
    </div>
  )
}
