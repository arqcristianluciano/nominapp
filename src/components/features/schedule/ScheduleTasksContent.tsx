import { BarChart2 } from 'lucide-react'
import type { ScheduleTask } from '@/services/scheduleService'
import type { GanttInfo } from './scheduleGanttUtils'
import { ScheduleGantt } from './ScheduleGantt'
import { ScheduleTaskTable } from './ScheduleTaskTable'

interface ScheduleTasksContentProps {
  loading: boolean
  tasks: ScheduleTask[]
  ganttInfo: GanttInfo | null
  today: string
  todayLeft: string | null
  onEdit: (task: ScheduleTask) => void
  onDelete: (taskId: string) => void
  onAddSubtask: (parentTask: ScheduleTask) => void
}

function LoadingState() {
  return <div className="text-center py-8 text-app-muted text-sm">Cargando...</div>
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-app-muted">
      <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p>No hay tareas en el cronograma.</p>
    </div>
  )
}

export function ScheduleTasksContent(props: ScheduleTasksContentProps) {
  if (props.loading) return <LoadingState />
  if (props.tasks.length === 0) return <EmptyState />

  return (
    <>
      {props.ganttInfo && (
        <ScheduleGantt
          tasks={props.tasks}
          ganttInfo={props.ganttInfo}
          today={props.today}
          todayLeft={props.todayLeft}
        />
      )}
      <ScheduleTaskTable
        tasks={props.tasks}
        today={props.today}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
        onAddSubtask={props.onAddSubtask}
      />
    </>
  )
}
