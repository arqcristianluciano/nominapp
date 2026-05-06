import type { AttendanceFormData } from '@/services/attendanceService'
import type { Contractor } from '@/types/database'

export function AttendanceForm({
  form,
  contractors,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  form: Omit<AttendanceFormData, 'project_id'>
  contractors: Contractor[]
  saving: boolean
  onChange: (next: Omit<AttendanceFormData, 'project_id'>) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-app-text">Nuevo registro de asistencia</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><label className="text-xs text-app-muted block mb-1">Fecha</label><input type="date" value={form.date} onChange={(e) => onChange({ ...form, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Contratista *</label><select value={form.contractor_id} onChange={(e) => onChange({ ...form, contractor_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Seleccionar...</option>{contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}</select></div>
        <div><label className="text-xs text-app-muted block mb-1">Trabajadores</label><input type="number" min={1} value={form.workers_count} onChange={(e) => onChange({ ...form, workers_count: +e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Horas trabajadas</label><input type="number" min={1} max={24} step={0.5} value={form.hours_worked} onChange={(e) => onChange({ ...form, hours_worked: +e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="text-xs text-app-muted block mb-1">Actividad *</label><input value={form.activity} onChange={(e) => onChange({ ...form, activity: e.target.value })} placeholder="Ej: Vaciado columnas nivel 2" className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Notas</label><input value={form.notes ?? ''} onChange={(e) => onChange({ ...form, notes: e.target.value })} placeholder="Observaciones opcionales" className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
        <button onClick={onSave} disabled={saving || !form.contractor_id || !form.activity.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  )
}
