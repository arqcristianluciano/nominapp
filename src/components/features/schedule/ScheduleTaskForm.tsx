import { Flag } from 'lucide-react'
import type { ScheduleTask, ScheduleTaskFormData } from '@/services/scheduleService'
import { SCHEDULE_COLORS } from './scheduleConfig'

interface Props {
  form: Omit<ScheduleTaskFormData, 'project_id'>
  editMode: boolean
  saving: boolean
  /** All tasks in the project (for parent/predecessor selectors). */
  allTasks: ScheduleTask[]
  /** The id being edited (to exclude itself from selectors). */
  editId?: string | null
  /** When set, this is an "add subtask" flow — parent is pre-filled and locked. */
  lockedParentId?: string | null
  /** True when the task being edited already has subtasks (locks date/duration). */
  hasChildren?: boolean
  onChange: (next: Omit<ScheduleTaskFormData, 'project_id'>) => void
  onCancel: () => void
  onSave: () => void
}

export function ScheduleTaskForm({
  form,
  editMode,
  saving,
  allTasks,
  editId,
  lockedParentId,
  hasChildren,
  onChange,
  onCancel,
  onSave,
}: Props) {
  // Candidate parents: all roots (no parent) that are NOT the task being edited
  const parentCandidates = allTasks.filter((t) => t.parent_task_id === null && t.id !== editId)

  // Candidate predecessors: all tasks that are NOT the task being edited,
  // and are NOT a child of the current task (to avoid indirect cycles)
  const predecessorCandidates = allTasks.filter((t) => t.id !== editId)

  const datesLocked = hasChildren === true

  const title = lockedParentId ? 'Nueva subtarea' : editMode ? 'Editar tarea' : 'Nueva tarea'

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-3 sm:p-4 space-y-3">
      <h3 className="font-semibold text-app-text text-sm sm:text-base">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Name */}
        <div className="sm:col-span-4">
          <label className="text-xs text-app-muted block mb-1">Nombre de la tarea *</label>
          <input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Ej: Estructura nivel 2"
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Parent task selector */}
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Tarea padre (opcional)</label>
          <select
            value={form.parent_task_id ?? ''}
            disabled={!!lockedParentId}
            onChange={(e) => onChange({ ...form, parent_task_id: e.target.value || null })}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            <option value="">— Ninguna (tarea raíz) —</option>
            {parentCandidates.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.task_number ?? '?'} {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Predecessor selector */}
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Predecesora (opcional)</label>
          <select
            value={form.predecessor_id ?? ''}
            onChange={(e) => onChange({ ...form, predecessor_id: e.target.value || null })}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Sin predecesora —</option>
            {predecessorCandidates.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.task_number ?? '?'} {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Start date */}
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">
            Inicio{datesLocked && <span className="ml-1 text-amber-500">(calculado)</span>}
          </label>
          <input
            type="date"
            value={form.start_date}
            disabled={datesLocked}
            onChange={(e) => onChange({ ...form, start_date: e.target.value })}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* End date */}
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">
            Fin *{datesLocked && <span className="ml-1 text-amber-500">(calculado)</span>}
          </label>
          <input
            type="date"
            value={form.end_date}
            disabled={datesLocked}
            onChange={(e) => onChange({ ...form, end_date: e.target.value })}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* Progress */}
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">
            Avance (%){datesLocked && <span className="ml-1 text-amber-500">(calculado)</span>}
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.progress}
            disabled={datesLocked}
            onChange={(e) => onChange({ ...form, progress: Math.min(100, Math.max(0, +e.target.value)) })}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* Color */}
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Color</label>
          <div className="flex gap-2 flex-wrap">
            {SCHEDULE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onChange({ ...form, color })}
                aria-label={`Color ${color}`}
                className={`w-11 h-11 sm:w-6 sm:h-6 rounded-full border-2 transition-all ${form.color === color ? 'border-app-text scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Milestone checkbox */}
        <div className="sm:col-span-2 flex items-center gap-2 pt-1">
          <input
            id="is_milestone"
            type="checkbox"
            checked={form.is_milestone}
            onChange={(e) => onChange({ ...form, is_milestone: e.target.checked })}
            className="w-4 h-4 rounded border-app-border text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="is_milestone"
            className="flex items-center gap-1.5 text-sm text-app-text cursor-pointer select-none"
          >
            <Flag className="w-3.5 h-3.5 text-amber-500" />
            Marcar como hito
          </label>
        </div>

        {/* Notes */}
        <div className="sm:col-span-4">
          <label className="text-xs text-app-muted block mb-1">Notas</label>
          <input
            value={form.notes ?? ''}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {datesLocked && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          Las fechas y el avance de esta tarea se calculan automáticamente a partir de sus subtareas.
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          onClick={onCancel}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim() || (!datesLocked && !form.end_date)}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
