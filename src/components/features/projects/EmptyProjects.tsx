import { Building2, Plus } from 'lucide-react'

export function EmptyProjects({ hasSearch, onNew }: { hasSearch: boolean; onNew: () => void }) {
  const primaryButtonClass =
    'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface'

  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center mx-auto mb-4"><Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" /></div>
      <p className="text-base font-semibold text-app-text mb-1">{hasSearch ? 'Sin resultados' : 'Sin proyectos aún'}</p>
      <p className="text-sm text-app-muted mb-5">{hasSearch ? 'Prueba con otro nombre, código o ubicación.' : 'Crea tu primer proyecto para empezar a gestionar obras.'}</p>
      {!hasSearch && <button type="button" onClick={onNew} className={primaryButtonClass}><Plus className="w-4 h-4" /> Nuevo proyecto</button>}
    </div>
  )
}
