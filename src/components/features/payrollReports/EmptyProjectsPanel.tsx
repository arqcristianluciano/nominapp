import { Plus } from 'lucide-react'
import type { Project } from '@/types/database'

export function EmptyProjectsPanel({
  projects,
  onCreate,
}: {
  projects: Project[]
  onCreate: (projectId: string) => void
}) {
  if (projects.length === 0) return null

  return (
    <div>
      <p className="text-xs text-app-subtle font-medium uppercase tracking-wider mb-2">Proyectos sin reportes</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onCreate(project.id)}
            className="flex items-center justify-between bg-app-surface rounded-xl border border-dashed border-app-border px-4 py-3 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all text-left"
          >
            <div><p className="text-sm font-medium text-app-muted">{project.name}</p><p className="text-xs text-app-subtle">{project.code}</p></div>
            <Plus className="w-4 h-4 text-app-subtle" />
          </button>
        ))}
      </div>
    </div>
  )
}
