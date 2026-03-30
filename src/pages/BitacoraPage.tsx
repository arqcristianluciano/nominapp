import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  BookOpen, ArrowLeft, Plus, Sun, Cloud, CloudRain, Thermometer,
  Users, AlertTriangle, ChevronDown, ChevronUp, Pencil, Trash2,
} from 'lucide-react'
import { bitacoraService, type BitacoraEntry, type BitacoraFormData } from '@/services/bitacoraService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const WEATHER_OPTIONS = [
  { value: 'soleado',  label: 'Soleado',  icon: Sun },
  { value: 'nublado',  label: 'Nublado',  icon: Cloud },
  { value: 'lluvia',   label: 'Lluvia',   icon: CloudRain },
  { value: 'parcial',  label: 'Parcial',  icon: Cloud },
]

const EMPTY_FORM: BitacoraFormData = {
  project_id: '',
  date: new Date().toISOString().split('T')[0],
  weather: 'soleado',
  temp_c: 30,
  work_summary: '',
  workforce_count: 0,
  equipment: '',
  visitors: '',
  incidents: '',
  notes: '',
  created_by: 'Admin',
}

export default function BitacoraPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [entries, setEntries] = useState<BitacoraEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BitacoraFormData>({ ...EMPTY_FORM, project_id: projectId! })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { load() }, [projectId])

  async function load() {
    setLoading(true)
    try { setEntries(await bitacoraService.getByProject(projectId!)) }
    finally { setLoading(false) }
  }

  function startEdit(entry: BitacoraEntry) {
    setForm({
      project_id: entry.project_id,
      date: entry.date,
      weather: entry.weather,
      temp_c: entry.temp_c,
      work_summary: entry.work_summary,
      workforce_count: entry.workforce_count,
      equipment: entry.equipment ?? '',
      visitors: entry.visitors ?? '',
      incidents: entry.incidents ?? '',
      notes: entry.notes ?? '',
      created_by: entry.created_by,
    })
    setEditId(entry.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.work_summary.trim()) return
    setSaving(true)
    try {
      if (editId) {
        await bitacoraService.update(editId, form)
      } else {
        await bitacoraService.create(form)
      }
      setShowForm(false)
      setEditId(null)
      setForm({ ...EMPTY_FORM, project_id: projectId! })
      await load()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    await bitacoraService.delete(deleteId)
    setDeleteId(null)
    await load()
  }

  function WeatherIcon({ weather }: { weather: string }) {
    const opt = WEATHER_OPTIONS.find((o) => o.value === weather)
    if (!opt) return null
    const Icon = opt.icon
    return <Icon className="w-4 h-4" />
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/proyectos/${projectId}`} className="p-1.5 rounded-lg hover:bg-app-hover text-app-muted">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">Bitácora de Obra</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM, project_id: projectId! }) }}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />Nuevo registro
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-app-text">{editId ? 'Editar registro' : 'Nuevo registro'}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs text-app-muted block mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Clima</label>
              <select value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500">
                {WEATHER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Temp. (°C)</label>
              <input type="number" value={form.temp_c ?? ''} onChange={(e) => setForm({ ...form, temp_c: +e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Personal en obra</label>
              <input type="number" value={form.workforce_count} onChange={(e) => setForm({ ...form, workforce_count: +e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-app-muted block mb-1">Resumen de actividades *</label>
            <textarea rows={3} value={form.work_summary} onChange={(e) => setForm({ ...form, work_summary: e.target.value })}
              placeholder="Describa las actividades realizadas hoy..."
              className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-app-muted block mb-1">Equipos utilizados</label>
              <input value={form.equipment ?? ''} onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                placeholder="Mixer, vibradora..." className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Visitas</label>
              <input value={form.visitors ?? ''} onChange={(e) => setForm({ ...form, visitors: e.target.value })}
                placeholder="Inspector, cliente..." className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Incidentes / Accidentes</label>
              <input value={form.incidents ?? ''} onChange={(e) => setForm({ ...form, incidents: e.target.value })}
                placeholder="Ninguno / descripción..." className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-app-muted block mb-1">Observaciones adicionales</label>
            <textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditId(null) }}
              className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.work_summary.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Cargando...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-app-muted">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No hay registros en la bitácora aún.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-app-hover transition-colors text-left"
              >
                <div className="flex items-center gap-2 text-app-muted">
                  <WeatherIcon weather={entry.weather} />
                  {entry.temp_c != null && <span className="text-xs">{entry.temp_c}°C</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-app-text">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-app-muted truncate">{entry.work_summary}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1 text-xs text-app-muted">
                    <Users className="w-3.5 h-3.5" />{entry.workforce_count}
                  </span>
                  {entry.incidents && (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                  {expandedId === entry.id ? <ChevronUp className="w-4 h-4 text-app-subtle" /> : <ChevronDown className="w-4 h-4 text-app-subtle" />}
                </div>
              </button>

              {expandedId === entry.id && (
                <div className="px-4 pb-4 border-t border-app-border/50 pt-3 space-y-2">
                  <p className="text-sm text-app-text">{entry.work_summary}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    {entry.equipment && <><span className="text-app-muted font-medium">Equipos:</span><span className="text-app-text">{entry.equipment}</span></>}
                    {entry.visitors && <><span className="text-app-muted font-medium">Visitas:</span><span className="text-app-text">{entry.visitors}</span></>}
                    {entry.incidents && <><span className="text-yellow-600 font-medium">Incidentes:</span><span className="text-app-text">{entry.incidents}</span></>}
                    {entry.notes && <><span className="text-app-muted font-medium">Notas:</span><span className="text-app-text">{entry.notes}</span></>}
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => startEdit(entry)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-app-border rounded-lg hover:bg-app-hover text-app-muted">
                      <Pencil className="w-3.5 h-3.5" />Editar
                    </button>
                    <button onClick={() => setDeleteId(entry.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar registro"
        message="¿Eliminar este registro de bitácora? Esta acción no se puede deshacer."
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
