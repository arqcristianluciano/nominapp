import { Building2, Factory, MapPin, Pencil } from 'lucide-react'
import type { Project } from '@/types/database'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  completed: 'bg-app-chip text-app-muted',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
}

export function ProjectsTable({
  projects,
  onOpen,
  onEdit,
}: {
  projects: Project[]
  onOpen: (projectId: string) => void
  onEdit: (project: Project) => void
}) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
      <table className="w-full text-sm">
        <thead><tr className="bg-app-bg border-b border-app-border">
          <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Proyecto</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">Ubicación</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden md:table-cell">Empresa</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Estado</th>
          <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden lg:table-cell">DT %</th>
          <th className="w-10" />
        </tr></thead>
        <tbody className="divide-y divide-app-border">
          {projects.map((project) => (
            <tr key={project.id} onClick={() => onOpen(project.id)} className="hover:bg-app-hover transition-colors cursor-pointer group">
              <td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"><Building2 className="w-4 h-4" /></div><div><div className="font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 text-sm">{project.name}</div><div className="text-xs text-app-subtle mt-0.5">{project.code}</div></div></div></td>
              <td className="px-4 py-3.5 hidden sm:table-cell"><div className="flex items-center gap-1.5 text-app-muted text-sm">{project.location && <MapPin className="w-3.5 h-3.5 shrink-0 text-app-subtle" />}{project.location || '—'}</div></td>
              <td className="px-4 py-3.5 hidden md:table-cell"><div className="flex items-center gap-1.5 text-app-muted text-sm">{project.company?.name && <Factory className="w-3.5 h-3.5 shrink-0 text-app-subtle" />}{project.company?.name || '—'}</div></td>
              <td className="px-4 py-3.5"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_STYLES[project.status]}`}>{STATUS_LABELS[project.status]}</span></td>
              <td className="px-4 py-3.5 text-right text-sm text-app-muted hidden lg:table-cell">{project.dt_percent}%</td>
              <td className="px-2 py-3.5"><button onClick={(e) => { e.stopPropagation(); onEdit(project) }} className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all" title="Editar proyecto"><Pencil className="w-3.5 h-3.5" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
