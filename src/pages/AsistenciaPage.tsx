import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { attendanceService, type AttendanceRecord, type AttendanceFormData } from '@/services/attendanceService'
import { contractorService } from '@/services/contractorService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { Contractor } from '@/types/database'

const EMPTY_FORM: Omit<AttendanceFormData, 'project_id'> = {
  date: new Date().toISOString().split('T')[0],
  contractor_id: '',
  workers_count: 1,
  hours_worked: 8,
  activity: '',
  notes: '',
}

const PAGE_SIZE = 10

export default function AsistenciaPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => { loadAll() }, [projectId])

  async function loadAll() {
    setLoading(true)
    try {
      const [recs, conts] = await Promise.all([
        attendanceService.getByProject(projectId!),
        contractorService.getAll(),
      ])
      setRecords(recs)
      setContractors(conts)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    if (!filterDate) return records
    return records.filter((r) => r.date === filterDate)
  }, [records, filterDate])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const summary = useMemo(() => attendanceService.summarizeByDate(records), [records])
  const todayStr = new Date().toISOString().split('T')[0]

  async function handleAdd() {
    if (!form.contractor_id || !form.activity.trim()) return
    setSaving(true)
    try {
      await attendanceService.create({ ...form, project_id: projectId! })
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      await loadAll()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    await attendanceService.delete(deleteId)
    setDeleteId(null)
    await loadAll()
  }

  const todaySummary = summary[todayStr]

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/proyectos/${projectId}`} className="p-1.5 rounded-lg hover:bg-app-hover text-app-muted">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Users className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">Asistencia Diaria</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />Registrar
        </button>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Personal hoy</p>
          <p className="text-2xl font-bold text-app-text">{todaySummary?.total_workers ?? 0}</p>
          <p className="text-xs text-app-subtle mt-0.5">trabajadores</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Horas hoy</p>
          <p className="text-2xl font-bold text-app-text">{todaySummary?.total_hours ?? 0}</p>
          <p className="text-xs text-app-subtle mt-0.5">horas-hombre</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Total registros</p>
          <p className="text-2xl font-bold text-app-text">{records.length}</p>
          <p className="text-xs text-app-subtle mt-0.5">en este proyecto</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-app-text">Nuevo registro de asistencia</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-app-muted block mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Contratista *</label>
              <select value={form.contractor_id} onChange={(e) => setForm({ ...form, contractor_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar...</option>
                {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Trabajadores</label>
              <input type="number" min={1} value={form.workers_count} onChange={(e) => setForm({ ...form, workers_count: +e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Horas trabajadas</label>
              <input type="number" min={1} max={24} step={0.5} value={form.hours_worked} onChange={(e) => setForm({ ...form, hours_worked: +e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-app-muted block mb-1">Actividad *</label>
              <input value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })}
                placeholder="Ej: Vaciado columnas nivel 2"
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Notas</label>
              <input value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones opcionales"
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
            <button onClick={handleAdd} disabled={saving || !form.contractor_id || !form.activity.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Filter + table */}
      <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border flex items-center gap-3">
          <h3 className="font-semibold text-app-text text-sm flex-1">Historial de asistencia</h3>
          <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setPage(0) }}
            className="px-3 py-1.5 text-xs border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs text-blue-600 hover:underline">Limpiar</button>
          )}
        </div>
        {loading ? (
          <div className="text-center py-8 text-app-muted text-sm">Cargando...</div>
        ) : paged.length === 0 ? (
          <div className="text-center py-8 text-app-muted text-sm">Sin registros.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-app-hover/50 text-xs text-app-muted">
                    <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                    <th className="text-left px-4 py-2.5 font-medium">Contratista</th>
                    <th className="text-left px-4 py-2.5 font-medium">Actividad</th>
                    <th className="text-center px-4 py-2.5 font-medium">Trabajadores</th>
                    <th className="text-center px-4 py-2.5 font-medium">Horas</th>
                    <th className="text-center px-4 py-2.5 font-medium">H-H</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {paged.map((r) => (
                    <tr key={r.id} className="hover:bg-app-hover/50">
                      <td className="px-4 py-3 text-app-text whitespace-nowrap">
                        {new Date(r.date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-app-text">{r.contractor?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-app-text">{r.activity}</td>
                      <td className="px-4 py-3 text-center font-semibold text-app-text">{r.workers_count}</td>
                      <td className="px-4 py-3 text-center text-app-text">{r.hours_worked}h</td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-600">{r.workers_count * r.hours_worked}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-app-border">
                <span className="text-xs text-app-muted">Pág. {page + 1} de {totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                    className="p-1.5 rounded hover:bg-app-hover text-app-muted disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                    className="p-1.5 rounded hover:bg-app-hover text-app-muted disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar registro"
        message="¿Eliminar este registro de asistencia?"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
