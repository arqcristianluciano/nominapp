import { AlertTriangle } from 'lucide-react'
import type { ScheduleTask } from '@/services/scheduleService'

export function ScheduleStats({ overall, totalTasks, delayedTasks }: { overall: number; totalTasks: number; delayedTasks: ScheduleTask[] }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Avance general</p>
          <p className="text-2xl font-bold text-blue-600">{overall}%</p>
          <div className="mt-2 h-1.5 bg-app-chip rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${overall}%` }} /></div>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Tareas totales</p>
          <p className="text-2xl font-bold text-app-text">{totalTasks}</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Con retraso</p>
          <p className={`text-2xl font-bold ${delayedTasks.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{delayedTasks.length}</p>
        </div>
      </div>

      {delayedTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400"><strong>Tareas retrasadas:</strong> {delayedTasks.map((task) => task.name).join(', ')}</p>
        </div>
      )}
    </>
  )
}
