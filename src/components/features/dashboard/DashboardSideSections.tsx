import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Scissors, TrendingUp } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { DashboardActivity, PendingCorteItem } from '@/hooks/useDashboardData'

function formatTimeAgo(nowMs: number, dateStr: string, t: TFunction): string {
  const minutes = Math.floor((nowMs - new Date(dateStr).getTime()) / 60000)
  if (minutes < 60) return t('dashboard.recent_activity.time_minutes', { count: minutes })
  if (minutes < 1440) return t('dashboard.recent_activity.time_hours', { count: Math.floor(minutes / 60) })
  const days = Math.floor(minutes / 1440)
  return days === 1 ? t('dashboard.recent_activity.time_yesterday') : t('dashboard.recent_activity.time_days', { count: days })
}

export function DashboardPendingCortesSection({
  pendingCortes,
}: {
  pendingCortes: PendingCorteItem[]
}) {
  const { t } = useTranslation()
  if (pendingCortes.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-app-surface shadow-xs dark:border-amber-800/60">
      <h2 className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-app-text">
        <Scissors className="h-4 w-4 text-amber-500" />
        {t('dashboard.pending_cortes.title')}
        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {pendingCortes.length}
        </span>
      </h2>
      <div className="divide-y divide-app-border">
        {pendingCortes.slice(0, 5).map((corte) => (
          <Link
            key={corte.id}
            to={`/proyectos/${corte.contract?.project_id}/cubicaciones/${corte.contract_id}`}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-app-hover"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-app-text">
                {t('dashboard.pending_cortes.item_label', { number: corte.cut_number, contractor: corte.contract?.contractor?.name ?? '' })}
              </p>
              <p className="mt-0.5 text-[11px] text-app-muted">
                {new Date(corte.cut_date).toLocaleDateString('es-DO')}
              </p>
            </div>
            <span className="ml-2 shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-400">
              {formatRD(corte.amount - corte.retention_amount)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function DashboardRecentActivitySection({
  activities,
  nowMs,
}: {
  activities: DashboardActivity[]
  nowMs: number
}) {
  const { t } = useTranslation()
  return (
    <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xs">
      <h2 className="px-4 py-3 text-base font-semibold text-app-text">{t('dashboard.recent_activity.title')}</h2>
      {activities.length === 0 ? (
        <div className="p-8 text-center">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 text-app-subtle" />
          <p className="text-sm text-app-muted">{t('dashboard.recent_activity.empty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-app-border">
          {activities.map((activity) => (
            <div key={activity.id} className="px-4 py-3 transition-colors hover:bg-app-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-app-text">{activity.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${activity.type === 'payroll' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-app-chip text-app-muted'}`}>
                      {activity.type === 'payroll' ? t('dashboard.recent_activity.type_payroll') : t('dashboard.recent_activity.type_transaction')}
                    </span>
                    <span className="text-[11px] text-app-subtle">{formatTimeAgo(nowMs, activity.date, t)}</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-app-text">{formatRD(activity.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
