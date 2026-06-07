import { Flag } from 'lucide-react'
import type { ScheduleTask } from '@/services/scheduleService'
import { buildTaskTree, flattenTree } from '@/services/scheduleService'
import type { GanttInfo } from './scheduleGanttUtils'

function getBarStyle(start: string, end: string, ganttInfo: GanttInfo): { left: string; width: string } {
  const s = Math.ceil((new Date(start).getTime() - ganttInfo.minDate.getTime()) / 86400000)
  const e = Math.ceil((new Date(end).getTime() - ganttInfo.minDate.getTime()) / 86400000)
  const left = (s / ganttInfo.totalDays) * 100
  const width = Math.max(((e - s + 1) / ganttInfo.totalDays) * 100, 1)
  return { left: `${left}%`, width: `${width}%` }
}

export function ScheduleGantt({
  tasks,
  ganttInfo,
  today,
  todayLeft,
}: {
  tasks: ScheduleTask[]
  ganttInfo: GanttInfo
  today: string
  todayLeft: string | null
}) {
  // Build enriched tree for computed dates/progress
  const tree = buildTaskTree(tasks)
  const nodeMap = new Map(tree.map((n) => [n.id, n]))
  const flat = flattenTree(tree)

  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-app-border">
        <h3 className="font-semibold text-app-text text-sm">Diagrama de Gantt</h3>
      </div>

      {/* Desktop / tablet view */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Month headers */}
          <div className="flex border-b border-app-border" style={{ marginLeft: '200px' }}>
            <div className="relative flex-1 h-7">
              {ganttInfo.months.map((month) => (
                <div
                  key={month.label}
                  className="absolute top-0 h-full flex items-center justify-center text-[10px] text-app-muted border-r border-app-border/50 font-medium"
                  style={{ left: `${month.left}%`, width: `${month.width}%` }}
                >
                  {month.label}
                </div>
              ))}
            </div>
          </div>

          {flat.map((row) => {
            const isParent = row.hasChildren
            const node = nodeMap.get(row.id)

            const displayStart = isParent && node ? node.computedStart : row.start_date
            const displayEnd = isParent && node ? node.computedEnd : row.end_date
            const displayProgress = isParent && node ? node.computedProgress : row.progress

            const barStyle = getBarStyle(displayStart, displayEnd, ganttInfo)
            const isDelayed = displayEnd < today && displayProgress < 100

            return (
              <div
                key={row.id}
                className={`flex items-center border-b border-app-border/50 transition-colors ${
                  row.depth > 0 ? 'bg-app-bg/40 hover:bg-app-hover/20' : 'hover:bg-app-hover/30'
                }`}
                style={{ minHeight: '40px' }}
                title={`${row.name}\n${displayStart} → ${displayEnd}\nAvance: ${displayProgress}%${isDelayed ? ' – Retraso' : ''}`}
              >
                {/* Label column */}
                <div
                  className="w-[200px] shrink-0 px-3 py-2"
                  style={{ paddingLeft: row.depth > 0 ? '1.5rem' : undefined }}
                >
                  <div className="flex items-center gap-1.5">
                    {row.depth > 0 && <span className="text-app-subtle text-[10px]">↳</span>}
                    {row.is_milestone && <Flag className="w-3 h-3 text-amber-500 shrink-0" />}
                    <p className={`text-xs text-app-text truncate ${isParent ? 'font-semibold' : 'font-medium'}`}>
                      {row.name}
                    </p>
                  </div>
                  <p className={`text-[10px] mt-0.5 ${isDelayed ? 'text-red-500' : 'text-app-subtle'}`}>
                    {displayProgress}%{isDelayed ? ' ⚠ Retraso' : ''}
                  </p>
                </div>

                {/* Bar area */}
                <div className="relative flex-1 h-10 flex items-center">
                  {todayLeft && (
                    <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-10" style={{ left: todayLeft }} />
                  )}
                  <div className="absolute inset-x-0 flex items-center px-0">
                    <div className="relative w-full h-6">
                      {/* Milestone: diamond marker instead of bar */}
                      {row.is_milestone ? (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-2"
                          style={{
                            left: barStyle.left,
                            backgroundColor: row.color,
                            borderColor: row.color,
                          }}
                        />
                      ) : (
                        <>
                          <div
                            className={`absolute inset-y-0 rounded-md opacity-20 ${isParent ? 'opacity-30' : ''}`}
                            style={{ ...barStyle, backgroundColor: row.color }}
                          />
                          <div
                            className="absolute inset-y-0 rounded-md"
                            style={{
                              ...barStyle,
                              backgroundColor: row.color,
                              width: `calc(${barStyle.width} * ${displayProgress / 100})`,
                            }}
                          />
                          <div
                            className={`absolute inset-y-0 rounded-md border-2 ${isParent ? 'border-4' : ''}`}
                            style={{
                              ...barStyle,
                              borderColor: row.color,
                              backgroundColor: 'transparent',
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile view: vertical list */}
      <div className="md:hidden">
        <div className="px-3 py-2 border-b border-app-border bg-app-hover/20">
          <p className="text-[10px] text-app-muted">Vista compacta. Para el Gantt completo, abre en escritorio.</p>
        </div>
        <ul className="divide-y divide-app-border/50">
          {flat.map((row) => {
            const isParent = row.hasChildren
            const node = nodeMap.get(row.id)

            const displayStart = isParent && node ? node.computedStart : row.start_date
            const displayEnd = isParent && node ? node.computedEnd : row.end_date
            const displayProgress = isParent && node ? node.computedProgress : row.progress

            const barStyle = getBarStyle(displayStart, displayEnd, ganttInfo)
            const isDelayed = displayEnd < today && displayProgress < 100
            const start = new Date(displayStart).toLocaleDateString('es-DO', {
              day: '2-digit',
              month: 'short',
            })
            const end = new Date(displayEnd).toLocaleDateString('es-DO', {
              day: '2-digit',
              month: 'short',
            })

            return (
              <li
                key={row.id}
                className={`px-3 py-2.5 ${row.depth > 0 ? 'bg-app-bg/40' : ''}`}
                style={row.depth > 0 ? { paddingLeft: '1.5rem' } : undefined}
                title={`${row.name}\n${displayStart} → ${displayEnd}\nAvance: ${displayProgress}%`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {row.depth > 0 && <span className="text-app-subtle text-[10px]">↳</span>}
                    {row.is_milestone && <Flag className="w-3 h-3 text-amber-500 shrink-0" />}
                    <p
                      className={`text-xs text-app-text truncate flex-1 ${isParent ? 'font-semibold' : 'font-medium'}`}
                    >
                      {row.name}
                    </p>
                  </div>
                  <span className={`text-[10px] shrink-0 ${isDelayed ? 'text-red-500' : 'text-app-subtle'}`}>
                    {displayProgress}%{isDelayed ? ' ⚠' : ''}
                  </span>
                </div>
                <div className="relative w-full h-4 rounded bg-app-hover/30">
                  {todayLeft && (
                    <div className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10" style={{ left: todayLeft }} />
                  )}
                  <div
                    className="absolute inset-y-0 rounded opacity-25"
                    style={{ ...barStyle, backgroundColor: row.color }}
                  />
                  <div
                    className="absolute inset-y-0 rounded"
                    style={{
                      ...barStyle,
                      backgroundColor: row.color,
                      width: `calc(${barStyle.width} * ${displayProgress / 100})`,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 rounded border"
                    style={{ ...barStyle, borderColor: row.color, backgroundColor: 'transparent' }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-app-muted">{start}</span>
                  <span className="text-[10px] text-app-muted">{end}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
