import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatRD } from '@/utils/currency'
import type { ProjectSummary } from './detailTypes'

export function ContractorProjectsSummary({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) return null

  return (
    <div>
      <h2 className="text-base font-semibold text-app-text mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-app-subtle" /> Por proyecto</h2>
      <div className="space-y-2">
        {projects.map((project) => (
          <Link key={project.id} to={`/proyectos/${project.id}`} className="flex items-center justify-between bg-app-surface rounded-xl border border-app-border px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all">
            <div>
              <p className="text-sm font-medium text-app-text">{project.name}</p>
              <p className="text-xs text-app-subtle">{project.code} · {project.periods.size} reporte{project.periods.size !== 1 ? 's' : ''}</p>
            </div>
            <span className="text-sm font-semibold text-app-muted">{formatRD(project.total)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
