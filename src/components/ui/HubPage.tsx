import { Link } from 'react-router-dom'
import { Building2, ArrowRight } from 'lucide-react'
import { SkeletonCards } from '@/components/ui/Skeleton'
import type { Project } from '@/types/database'

interface HubPageProps {
  title: string
  description: string
  icon: React.ElementType
  accentColor: 'blue' | 'purple' | 'red' | 'amber'
  projects: Project[]
  loading: boolean
  getUrl: (projectId: string) => string
  footerLink?: { label: string; to: string }
  featureLabel: string
}

const ACCENT: Record<string, { card: string; icon: string; arrow: string; empty: string }> = {
  blue:   { card: 'hover:border-blue-300 dark:hover:border-blue-700',    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',    arrow: 'group-hover:text-blue-500',   empty: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' },
  purple: { card: 'hover:border-purple-300 dark:hover:border-purple-700', icon: 'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400', arrow: 'group-hover:text-purple-500', empty: 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400' },
  red:    { card: 'hover:border-red-300 dark:hover:border-red-700',       icon: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',       arrow: 'group-hover:text-red-500',    empty: 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400' },
  amber:  { card: 'hover:border-amber-300 dark:hover:border-amber-700',   icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400', arrow: 'group-hover:text-amber-500',  empty: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' },
}

export function HubPage({
  title, description, icon: Icon, accentColor,
  projects, loading, getUrl, footerLink, featureLabel,
}: HubPageProps) {
  const a = ACCENT[accentColor]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-app-text">{title}</h1>
        <p className="text-sm text-app-muted mt-0.5">{description}</p>
      </div>

      {loading ? (
        <SkeletonCards count={3} />
      ) : projects.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${a.empty}`}>
            <Icon className="w-7 h-7" />
          </div>
          <p className="text-base font-semibold text-app-text mb-1">Sin proyectos activos</p>
          <p className="text-sm text-app-muted mb-5">Crea o activa un proyecto para continuar</p>
          <Link
            to="/proyectos"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            Ir a Proyectos
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={getUrl(project.id)}
                className={`bg-app-surface rounded-xl border border-app-border p-5 hover:shadow-sm transition-all group ${a.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.icon}`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-app-text text-sm truncate">{project.name}</h3>
                      <p className="text-xs text-app-muted mt-0.5 truncate">{project.location || project.code}</p>
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 text-app-subtle shrink-0 transition-colors ${a.arrow}`} />
                </div>
                <div className="mt-4 pt-3 border-t border-app-border flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${a.icon.split(' ')[1]}`} />
                  <span className="text-xs text-app-muted truncate">{featureLabel}</span>
                </div>
              </Link>
            ))}
          </div>

          {footerLink && (
            <p className="text-center text-xs text-app-muted pt-1">
              <Link to={footerLink.to} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline">
                {footerLink.label}
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}
