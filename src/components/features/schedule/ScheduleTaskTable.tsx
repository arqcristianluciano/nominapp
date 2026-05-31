import { useState } from 'react'
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import type { ScheduleTask } from '@/services/scheduleService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Props {
  tasks: ScheduleTask[]
  today: string
  onEdit: (task: ScheduleTask) => void
  onDelete: (taskId: string) => void
}

function formatDateShort(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })
}

function formatDateLong(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ScheduleTaskTable({ tasks, today, onEdit, onDelete }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      {/* Desktop / tablet table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-app-hover/50 text-xs text-app-muted">
              <th className="text-left px-4 py-2.5 font-medium">Tarea</th>
              <th className="text-left px-4 py-2.5 font-medium">Inicio</th>
              <th className="text-left px-4 py-2.5 font-medium">Fin</th>
              <th className="text-center px-4 py-2.5 font-medium">Avance</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
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
                  <td className="px-4 py-3 text-app-muted text-xs">{formatDateShort(task.start_date)}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={isDelayed ? 'text-red-500 font-semibold' : 'text-app-muted'}>
                      {formatDateLong(task.end_date)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 h-1.5 bg-app-chip rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${task.progress}%`, backgroundColor: task.color }}
                        />
                      </div>
                      <span className="text-xs text-app-muted w-8">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit(task)}
                        aria-label={`Editar tarea ${task.name}`}
                        className="p-2 text-app-subtle hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(task.id)}
                        aria-label={`Eliminar tarea ${task.name}`}
                        className="p-2 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile card view */}
      <ul className="sm:hidden divide-y divide-app-border">
        {tasks.map((task) => {
          const isDelayed = task.end_date < today && task.progress < 100
          const isDone = task.progress >= 100
          return (
            <li key={task.id} className="px-3 py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: task.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm text-app-text break-words">{task.name}</span>
                      {isDelayed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 text-[10px] font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Retraso
                        </span>
                      )}
                      {!isDelayed && isDone && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[10px] font-semibold">
                          Completada
                        </span>
                      )}
                      {!isDelayed && !isDone && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 text-[10px] font-semibold">
                          En curso
                        </span>
                      )}
                    </div>
                    {task.notes && <p className="text-xs text-app-muted mt-0.5 break-words">{task.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onEdit(task)}
                    aria-label={`Editar tarea ${task.name}`}
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-app-subtle hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(task.id)}
                    aria-label={`Eliminar tarea ${task.name}`}
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-app-muted">Inicio: </span>
                  <span className="text-app-text">{formatDateShort(task.start_date)}</span>
                </div>
                <div>
                  <span className="text-app-muted">Fin: </span>
                  <span className={isDelayed ? 'text-red-500 font-semibold' : 'text-app-text'}>
                    {formatDateLong(task.end_date)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-app-chip rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${task.progress}%`, backgroundColor: task.color }}
                  />
                </div>
                <span className="text-xs text-app-muted w-9 text-right">{task.progress}%</span>
              </div>
            </li>
          )
        })}
      </ul>
      <ConfirmModal
        open={!!deleteId}
        title="Eliminar tarea"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteId) onDelete(deleteId)
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
