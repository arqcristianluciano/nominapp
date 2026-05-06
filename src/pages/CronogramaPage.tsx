import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { BarChart2, Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { useProjectStore } from '@/stores/projectStore'
import { scheduleService, type ScheduleTask, type ScheduleTaskFormData } from '@/services/scheduleService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ScheduleStats } from '@/components/features/schedule/ScheduleStats'
import { ScheduleTaskForm } from '@/components/features/schedule/ScheduleTaskForm'
import { ScheduleTaskTable } from '@/components/features/schedule/ScheduleTaskTable'
import { ScheduleGantt } from '@/components/features/schedule/ScheduleGantt'
import { buildGanttInfo, getTodayLeft } from '@/components/features/schedule/scheduleGanttUtils'
import { EMPTY_SCHEDULE_FORM } from '@/components/features/schedule/scheduleConfig'

export default function CronogramaPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<ScheduleTaskFormData, 'project_id'>>({ ...EMPTY_SCHEDULE_FORM })
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setTasks(await scheduleService.getByProject(projectId!)) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

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
      setForm({ ...EMPTY_SCHEDULE_FORM })
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
  const ganttInfo = useMemo(() => buildGanttInfo(tasks), [tasks])

  const today = new Date().toISOString().split('T')[0]
  const todayLeft = useMemo(() => getTodayLeft(ganttInfo, today), [ganttInfo, today])

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <Breadcrumb items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: project?.name ?? 'Proyecto', to: `/proyectos/${projectId}` },
          { label: 'Cronograma' },
        ]} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-app-text">Cronograma de Obra</h1>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_SCHEDULE_FORM }) }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" />Nueva tarea
          </button>
        </div>
      </div>

      <ScheduleStats overall={overall} totalTasks={tasks.length} delayedTasks={delayed} />

      {showForm && (
        <ScheduleTaskForm
          form={form}
          editMode={!!editId}
          saving={saving}
          onChange={setForm}
          onCancel={() => { setShowForm(false); setEditId(null) }}
          onSave={handleSave}
        />
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
          {ganttInfo && (
            <ScheduleGantt tasks={tasks} ganttInfo={ganttInfo} today={today} todayLeft={todayLeft} />
          )}

          <ScheduleTaskTable tasks={tasks} today={today} onEdit={startEdit} onDelete={setDeleteId} />
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
