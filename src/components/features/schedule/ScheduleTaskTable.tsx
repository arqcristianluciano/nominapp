import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import type { ScheduleTask } from '@/services/scheduleService'

interface Props {
  tasks: ScheduleTask[]
  today: string
  onEdit: (task: ScheduleTask) => void
  onDelete: (taskId: string) => void
}

export function ScheduleTaskTable({ tasks, today, onEdit, onDelete }: Props) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-app-hover/50 text-xs text-app-muted">
          <th className="text-left px-4 py-2.5 font-medium">Tarea</th>
          <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Inicio</th>
          <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Fin</th>
          <th className="text-center px-4 py-2.5 font-medium">Avance</th>
          <th className="px-4 py-2.5" />
        </tr></thead>
        <tbody className="divide-y divide-app-border">
          {tasks.map((task) => {
            const isDelayed = task.end_date < today && task.progress < 100
            return (
              <tr key={task.id} className="hover:bg-app-hover/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                    <span className="font-medium text-app-text">{task.name}</span>
                    {isDelayed && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  </div>
                  {task.notes && <p className="text-xs text-app-muted ml-4.5 mt-0.5">{task.notes}</p>}
                </td>
                <td className="px-4 py-3 text-app-muted text-xs hidden sm:table-cell">{new Date(task.start_date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}</td>
                <td className="px-4 py-3 text-xs hidden sm:table-cell"><span className={isDelayed ? 'text-red-500 font-semibold' : 'text-app-muted'}>{new Date(task.end_date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</span></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2 justify-center"><div className="w-20 h-1.5 bg-app-chip rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${task.progress}%`, backgroundColor: task.color }} /></div><span className="text-xs text-app-muted w-8">{task.progress}%</span></div></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(task)} className="p-1.5 text-app-subtle hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(task.id)} className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
