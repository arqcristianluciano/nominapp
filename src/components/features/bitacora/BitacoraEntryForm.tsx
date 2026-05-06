import type { BitacoraFormData } from '@/services/bitacoraService'
import { WEATHER_OPTIONS } from './bitacoraConfig'

interface Props {
  form: BitacoraFormData
  saving: boolean
  editMode: boolean
  onChange: (next: BitacoraFormData) => void
  onCancel: () => void
  onSave: () => void
}

export function BitacoraEntryForm({ form, saving, editMode, onChange, onCancel, onSave }: Props) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-app-text">{editMode ? 'Editar registro' : 'Nuevo registro'}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><label className="text-xs text-app-muted block mb-1">Fecha</label><input type="date" value={form.date} onChange={(e) => onChange({ ...form, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Clima</label><select value={form.weather} onChange={(e) => onChange({ ...form, weather: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500">{WEATHER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        <div><label className="text-xs text-app-muted block mb-1">Temp. (°C)</label><input type="number" value={form.temp_c ?? ''} onChange={(e) => onChange({ ...form, temp_c: +e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Personal en obra</label><input type="number" value={form.workforce_count} onChange={(e) => onChange({ ...form, workforce_count: +e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
      </div>
      <div><label className="text-xs text-app-muted block mb-1">Resumen de actividades *</label><textarea rows={3} value={form.work_summary} onChange={(e) => onChange({ ...form, work_summary: e.target.value })} placeholder="Describa las actividades realizadas hoy..." className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className="text-xs text-app-muted block mb-1">Equipos utilizados</label><input value={form.equipment ?? ''} onChange={(e) => onChange({ ...form, equipment: e.target.value })} placeholder="Mixer, vibradora..." className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Visitas</label><input value={form.visitors ?? ''} onChange={(e) => onChange({ ...form, visitors: e.target.value })} placeholder="Inspector, cliente..." className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="text-xs text-app-muted block mb-1">Incidentes / Accidentes</label><input value={form.incidents ?? ''} onChange={(e) => onChange({ ...form, incidents: e.target.value })} placeholder="Ninguno / descripción..." className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
      </div>
      <div><label className="text-xs text-app-muted block mb-1">Observaciones adicionales</label><textarea rows={2} value={form.notes ?? ''} onChange={(e) => onChange({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
        <button onClick={onSave} disabled={saving || !form.work_summary.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  )
}
