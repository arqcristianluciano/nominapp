import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Project } from '@/types/database'
import type { ProjectProgress } from '@/hooks/useDashboardData'

interface Props {
  project: Project
  progress?: ProjectProgress
}

function progressColor(percent: number) {
  if (percent >= 80) return 'bg-emerald-500'
  if (percent >= 40) return 'bg-blue-500'
  return 'bg-amber-500'
}

export function ProjectCard({ project, progress }: Props) {
  const { t } = useTranslation()
  const percent = progress?.avg_completion ?? null

  return (
    <Link
      to={`/proyectos/${project.id}`}
      className="flex flex-col rounded-xl border border-app-border bg-app-surface p-4 transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-700"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-app-text">{project.name}</h3>
            <p className="truncate text-xs text-app-muted">{project.location || project.code}</p>
          </div>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          {percent !== null ? (
            <span className="text-sm font-bold text-app-text">{Math.round(percent)}%</span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{t('dashboard.projects.active_badge')}</span>
          )}
          {progress && (
            <p className="mt-0.5 text-[11px] text-app-subtle">
              {progress.contractor_count} {progress.contractor_count === 1 ? t('dashboard.projects.contract_one') : t('dashboard.projects.contract_other')}
            </p>
          )}
        </div>
      </div>

      {percent !== null && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-app-chip">
            <div className={`h-full rounded-full ${progressColor(percent)}`} style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-app-subtle">{t('dashboard.projects.progress_label')}</span>
            <span className="text-[11px] font-semibold text-app-muted">{Math.round(percent)}%</span>
          </div>
        </div>
      )}
    </Link>
  )
}
