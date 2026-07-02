import { AlertTriangle, Flag, GitFork, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ScheduleTask } from '@/services/scheduleService'
import { flattenTree, buildTaskTree } from '@/services/scheduleService'

interface Props {
  tasks: ScheduleTask[]
  today: string
  onEdit: (task: ScheduleTask) => void
  onDelete: (taskId: string) => void
  onAddSubtask: (parentTask: ScheduleTask) => void
}

function formatDateShort(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })
}

function formatDateLong(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function ScheduleTaskTable({ tasks, today, onEdit, onDelete, onAddSubtask }: Props) {
  // El diálogo de confirmación de borrado vive en la página (ScheduleDeleteTaskModal);
  // aquí el botón solo delega en onDelete para no pedir confirmación dos veces.

  // Build enriched tree so we can show computed dates for parent tasks
  const tree = buildTaskTree(tasks)
  const flat = flattenTree(tree)

  // Map of parent computed values by id
  const nodeMap = new Map(tree.map((n) => [n.id, n]))

  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      {/* Desktop / tablet table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-app-hover/50 text-xs text-app-muted">
              <th className="text-left px-4 py-2.5 font-medium">#</th>
              <th className="text-left px-4 py-2.5 font-medium">Tarea</th>
              <th className="text-left px-4 py-2.5 font-medium">Inicio</th>
              <th className="text-left px-4 py-2.5 font-medium">Fin</th>
              <th className="text-center px-4 py-2.5 font-medium">Avance</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {flat.map((row) => {
              const isParent = row.hasChildren
              const node = nodeMap.get(row.id)
              // Use computed dates/progress for parent tasks
              const displayStart = isParent && node ? node.computedStart : row.start_date
              const displayEnd = isParent && node ? node.computedEnd : row.end_date
              const displayProgress = isParent && node ? node.computedProgress : row.progress
              const isDelayed = displayEnd < today && displayProgress < 100

              return (
                <tr key={row.id} className={`hover:bg-app-hover/50 ${row.depth > 0 ? 'bg-app-bg/40' : ''}`}>
                  <td className="px-4 py-3 text-xs text-app-muted w-8">{row.task_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: row.depth > 0 ? '1.25rem' : undefined }}
                    >
                      {row.depth > 0 && <span className="text-app-subtle shrink-0">↳</span>}
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className={`font-medium text-app-text ${isParent ? 'font-semibold' : ''}`}>{row.name}</span>
                      {row.is_milestone && <Flag aria-label="Hito" className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      {isParent && (
                        <GitFork aria-label="Tarea con subtareas" className="w-3 h-3 text-app-subtle shrink-0" />
                      )}
                      {isDelayed && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    </div>
                    {row.notes && (
                      <p
                        className="text-xs text-app-muted mt-0.5"
                        style={{ marginLeft: row.depth > 0 ? '3.25rem' : '1.25rem' }}
                      >
                        {row.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-app-muted text-xs">{formatDateShort(displayStart)}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={isDelayed ? 'text-red-500 font-semibold' : 'text-app-muted'}>
                      {formatDateLong(displayEnd)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 h-1.5 bg-app-chip rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${displayProgress}%`, backgroundColor: row.color }}
                        />
                      </div>
                      <span className="text-xs text-app-muted w-8">{displayProgress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {/* Add subtask — only available on root tasks */}
                      {row.depth === 0 && (
                        <button
                          onClick={() => onAddSubtask(row)}
                          aria-label={`Añadir subtarea a ${row.name}`}
                          title="Añadir subtarea"
                          className="p-2 text-app-subtle hover:text-green-600 rounded hover:bg-green-50 dark:hover:bg-green-950/30"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(row)}
                        aria-label={`Editar tarea ${row.name}`}
                        className="p-2 text-app-subtle hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(row.id)}
                        aria-label={`Eliminar tarea ${row.name}`}
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
        {flat.map((row) => {
          const isParent = row.hasChildren
          const node = nodeMap.get(row.id)
          const displayEnd = isParent && node ? node.computedEnd : row.end_date
          const displayProgress = isParent && node ? node.computedProgress : row.progress
          const isDelayed = displayEnd < today && displayProgress < 100
          const isDone = displayProgress >= 100
          return (
            <li
              key={row.id}
              className={`px-3 py-3 space-y-2 ${row.depth > 0 ? 'bg-app-bg/40' : ''}`}
              style={row.depth > 0 ? { paddingLeft: '1.5rem' } : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  {row.depth > 0 && <span className="text-app-subtle shrink-0 text-xs mt-1">↳</span>}
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: row.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`font-medium text-sm text-app-text break-words ${isParent ? 'font-semibold' : ''}`}
                      >
                        {row.is_milestone && <Flag className="inline w-3.5 h-3.5 text-amber-500 mr-1" />}
                        {row.name}
                      </span>
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
                    {row.notes && <p className="text-xs text-app-muted mt-0.5 break-words">{row.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {row.depth === 0 && (
                    <button
                      onClick={() => onAddSubtask(row)}
                      aria-label={`Añadir subtarea a ${row.name}`}
                      className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-app-subtle hover:text-green-600 rounded hover:bg-green-50 dark:hover:bg-green-950/30"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(row)}
                    aria-label={`Editar tarea ${row.name}`}
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-app-subtle hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(row.id)}
                    aria-label={`Eliminar tarea ${row.name}`}
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-app-muted">Inicio: </span>
                  <span className="text-app-text">
                    {formatDateShort(isParent && node ? node.computedStart : row.start_date)}
                  </span>
                </div>
                <div>
                  <span className="text-app-muted">Fin: </span>
                  <span className={isDelayed ? 'text-red-500 font-semibold' : 'text-app-text'}>
                    {formatDateLong(displayEnd)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-app-chip rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${displayProgress}%`, backgroundColor: row.color }}
                  />
                </div>
                <span className="text-xs text-app-muted w-9 text-right">{displayProgress}%</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
