import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BarChart2, ArrowLeft, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { scheduleService, type ScheduleTask, type ScheduleTaskFormData } from '@/services/scheduleService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#ef4444','#14b8a6']

const EMPTY_FORM: Omit<ScheduleTaskFormData, 'project_id'> = {
  name: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  progress: 0,
  color: '#3b82f6',
  notes: '',
}

export default function CronogramaPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [projectId])

  async function load() {
    setLoading(true)
    try { setTasks(await scheduleService.getByProject(projectId!)) }
    finally { setLoading(false) }
  }

  function startEdit(task: ScheduleTask) {
    setForm({ name: task.name, start_date: task.start_date, end_date: task.end_date, progress: task.progress, color: task.color, notes: task.notes ?? '' })
    setEditId(task.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.end_date) return
    setSaving(true)
    try {
      if (editId) {
        await scheduleService.update(editId, { ...form, project_id: projectId! })
      } else {
        await scheduleService.create({ ...form, project_id: projectId! })
      }
      setShowForm(false)
      setEditId(null)
      setForm({ ...EMPTY_FORM })
      await load()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    await scheduleService.delete(deleteId)
    setDeleteId(null)
    await load()
  }

  const overall = useMemo(() => scheduleService.getOverallProgress(tasks), [tasks])
  const delayed = useMemo(() => scheduleService.getDelayedTasks(tasks), [tasks])

  // Gantt chart bounds
  const ganttInfo = useMemo(() => {
    if (!tasks.length) return null
    const allDates = tasks.flatMap((t) => [new Date(t.start_date), new Date(t.end_date)])
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
    minDate.setDate(1)
    maxDate.setMonth(maxDate.getMonth() + 1, 0)
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 1

    const months: { label: string; left: number; width: number }[] = []
    let d = new Date(minDate)
    while (d <= maxDate) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const startOffset = Math.max(0, Math.ceil((monthStart.getTime() - minDate.getTime()) / 86400000))
      const endOffset = Math.min(totalDays - 1, Math.ceil((monthEnd.getTime() - minDate.getTime()) / 86400000))
      months.push({
        label: monthStart.toLocaleDateString('es-DO', { month: 'short', year: '2-digit' }),
        left: (startOffset / totalDays) * 100,
        width: ((endOffset - startOffset + 1) / totalDays) * 100,
      })
      d.setMonth(d.getMonth() + 1)
    }

    return { minDate, totalDays, months }
  }, [tasks])

  function getBarStyle(task: ScheduleTask) {
    if (!ganttInfo) return {}
    const start = Math.ceil((new Date(task.start_date).getTime() - ganttInfo.minDate.getTime()) / 86400000)
    const end = Math.ceil((new Date(task.end_date).getTime() - ganttInfo.minDate.getTime()) / 86400000)
    const left = (start / ganttInfo.totalDays) * 100
    const width = Math.max(((end - start + 1) / ganttInfo.totalDays) * 100, 1)
    return { left: `${left}%`, width: `${width}%` }
  }

  const today = new Date().toISOString().split('T')[0]
  const todayOffset = ganttInfo
    ? Math.ceil((new Date(today).getTime() - ganttInfo.minDate.getTime()) / 86400000)
    : null
  const todayLeft = ganttInfo && todayOffset !== null
    ? `${(todayOffset / ganttInfo.totalDays) * 100}%`
    : null

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/proyectos/${projectId}`} className="p-1.5 rounded-lg hover:bg-app-hover text-app-muted">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <BarChart2 className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">Cronograma de Obra</h1>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }) }}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" />Nueva tarea
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Avance general</p>
          <p className="text-2xl font-bold text-blue-600">{overall}%</p>
          <div className="mt-2 h-1.5 bg-app-chip rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${overall}%` }} />
          </div>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Tareas totales</p>
          <p className="text-2xl font-bold text-app-text">{tasks.length}</p>
        </div>
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <p className="text-xs text-app-muted mb-1">Con retraso</p>
          <p className={`text-2xl font-bold ${delayed.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{delayed.length}</p>
        </div>
      </div>

      {delayed.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">
            <strong>Tareas retrasadas:</strong> {delayed.map((t) => t.name).join(', ')}
          </p>
        </div>
      )}

      {/* Task form */}
      {showForm && (
        <div className="bg-app-surface border border-app-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-app-text">{editId ? 'Editar tarea' : 'Nueva tarea'}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-app-muted block mb-1">Nombre de la tarea *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Estructura nivel 2"
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Inicio</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Fin *</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Avance (%)</label>
              <input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Math.min(100, Math.max(0, +e.target.value)) })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-app-muted block mb-1">Color</label>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? 'border-app-text scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-app-muted block mb-1">Notas</label>
              <input value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 text-sm border border-app-border rounded-lg hover:bg-app-hover text-app-muted">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.end_date}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-app-muted text-sm">Cargando...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-app-muted">
          <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No hay tareas en el cronograma.</p>
        </div>
      ) : (
        <>
          {/* Gantt Chart */}
          {ganttInfo && (
            <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-app-border">
                <h3 className="font-semibold text-app-text text-sm">Diagrama de Gantt</h3>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Month headers */}
                  <div className="flex border-b border-app-border" style={{ marginLeft: '200px' }}>
                    <div className="relative flex-1 h-7">
                      {ganttInfo.months.map((m, i) => (
                        <div key={i} className="absolute top-0 h-full flex items-center justify-center text-[10px] text-app-muted border-r border-app-border/50 font-medium"
                          style={{ left: `${m.left}%`, width: `${m.width}%` }}>
                          {m.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tasks */}
                  {tasks.map((task) => {
                    const barStyle = getBarStyle(task)
                    const isDelayed = task.end_date < today && task.progress < 100
                    return (
                      <div key={task.id} className="flex items-center border-b border-app-border/50 hover:bg-app-hover/30 transition-colors" style={{ minHeight: '40px' }}>
                        <div className="w-[200px] shrink-0 px-3 py-2">
                          <p className="text-xs font-medium text-app-text truncate">{task.name}</p>
                          <p className={`text-[10px] mt-0.5 ${isDelayed ? 'text-red-500' : 'text-app-subtle'}`}>{task.progress}% {isDelayed ? '⚠ Retraso' : ''}</p>
                        </div>
                        <div className="relative flex-1 h-10 flex items-center">
                          {/* Today marker */}
                          {todayLeft && (
                            <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-10" style={{ left: todayLeft }} />
                          )}
                          <div className="absolute inset-x-0 flex items-center px-0">
                            <div className="relative w-full h-6">
                              <div className="absolute inset-y-0 rounded-md opacity-20" style={{ ...barStyle, backgroundColor: task.color }} />
                              <div className="absolute inset-y-0 rounded-md" style={{ ...barStyle, backgroundColor: task.color, width: `calc(${barStyle.width} * ${task.progress / 100})` }} />
                              <div className="absolute inset-y-0 rounded-md border-2" style={{ ...barStyle, borderColor: task.color, backgroundColor: 'transparent' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Task list */}
          <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-app-hover/50 text-xs text-app-muted">
                  <th className="text-left px-4 py-2.5 font-medium">Tarea</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Inicio</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Fin</th>
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
                      <td className="px-4 py-3 text-app-muted text-xs hidden sm:table-cell">{new Date(task.start_date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}</td>
                      <td className="px-4 py-3 text-xs hidden sm:table-cell">
                        <span className={isDelayed ? 'text-red-500 font-semibold' : 'text-app-muted'}>
                          {new Date(task.end_date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-1.5 bg-app-chip rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${task.progress}%`, backgroundColor: task.color }} />
                          </div>
                          <span className="text-xs text-app-muted w-8">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(task)} className="p-1.5 text-app-subtle hover:text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(task.id)} className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar tarea"
        message="¿Eliminar esta tarea del cronograma?"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
