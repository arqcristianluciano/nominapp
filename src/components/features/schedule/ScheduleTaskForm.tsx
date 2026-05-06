import type { ScheduleTaskFormData } from '@/services/scheduleService'
import { SCHEDULE_COLORS } from './scheduleConfig'

interface Props {
  form: Omit<ScheduleTaskFormData, 'project_id'>
  editMode: boolean
  saving: boolean
  onChange: (next: Omit<ScheduleTaskFormData, 'project_id'>) => void
  onCancel: () => void
  onSave: () => void
}

export function ScheduleTaskForm({ form, editMode, saving, onChange, onCancel, onSave }: Props) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-app-text">{editMode ? 'Editar tarea' : 'Nueva tarea'}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Nombre de la tarea *</label>
          <input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="Ej: Estructura nivel 2" className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Inicio</label>
          <input type="date" value={form.start_date} onChange={(e) => onChange({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Fin *</label>
          <input type="date" value={form.end_date} onChange={(e) => onChange({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Avance (%)</label>
          <input type="number" min={0} max={100} value={form.progress} onChange={(e) => onChange({ ...form, progress: Math.min(100, Math.max(0, +e.target.value)) })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-app-muted block mb-1">Color</label>
          <div className="flex gap-1.5 flex-wrap">
            {SCHEDULE_COLORS.map((color) => (
              <button key={color} onClick={() => onChange({ ...form, color })} className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === color ? 'border-app-text scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-app-muted block mb-1">Notas</label>
          <input value={form.notes ?? ''} onChange={(e) => onChange({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
        <button onClick={onSave} disabled={saving || !form.name.trim() || !form.end_date} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
