import type { ScheduleTask } from '@/services/scheduleService'
import type { GanttInfo } from './scheduleGanttUtils'

function getBarStyle(task: ScheduleTask, ganttInfo: GanttInfo): { left: string; width: string } {
  const start = Math.ceil((new Date(task.start_date).getTime() - ganttInfo.minDate.getTime()) / 86400000)
  const end = Math.ceil((new Date(task.end_date).getTime() - ganttInfo.minDate.getTime()) / 86400000)
  const left = (start / ganttInfo.totalDays) * 100
  const width = Math.max(((end - start + 1) / ganttInfo.totalDays) * 100, 1)
  return { left: `${left}%`, width: `${width}%` }
}

export function ScheduleGantt({ tasks, ganttInfo, today, todayLeft }: { tasks: ScheduleTask[]; ganttInfo: GanttInfo; today: string; todayLeft: string | null }) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-app-border"><h3 className="font-semibold text-app-text text-sm">Diagrama de Gantt</h3></div>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex border-b border-app-border" style={{ marginLeft: '200px' }}>
            <div className="relative flex-1 h-7">
              {ganttInfo.months.map((month, index) => (
                <div key={index} className="absolute top-0 h-full flex items-center justify-center text-[10px] text-app-muted border-r border-app-border/50 font-medium" style={{ left: `${month.left}%`, width: `${month.width}%` }}>{month.label}</div>
              ))}
            </div>
          </div>
          {tasks.map((task) => {
            const barStyle = getBarStyle(task, ganttInfo)
            const isDelayed = task.end_date < today && task.progress < 100
            return (
              <div key={task.id} className="flex items-center border-b border-app-border/50 hover:bg-app-hover/30 transition-colors" style={{ minHeight: '40px' }}>
                <div className="w-[200px] shrink-0 px-3 py-2"><p className="text-xs font-medium text-app-text truncate">{task.name}</p><p className={`text-[10px] mt-0.5 ${isDelayed ? 'text-red-500' : 'text-app-subtle'}`}>{task.progress}% {isDelayed ? '⚠ Retraso' : ''}</p></div>
                <div className="relative flex-1 h-10 flex items-center">
                  {todayLeft && <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-10" style={{ left: todayLeft }} />}
                  <div className="absolute inset-x-0 flex items-center px-0"><div className="relative w-full h-6">
                    <div className="absolute inset-y-0 rounded-md opacity-20" style={{ ...barStyle, backgroundColor: task.color }} />
                    <div className="absolute inset-y-0 rounded-md" style={{ ...barStyle, backgroundColor: task.color, width: `calc(${barStyle.width} * ${task.progress / 100})` }} />
                    <div className="absolute inset-y-0 rounded-md border-2" style={{ ...barStyle, borderColor: task.color, backgroundColor: 'transparent' }} />
                  </div></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
