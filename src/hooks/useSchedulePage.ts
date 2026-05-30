import { useCallback, useEffect, useMemo, useState } from 'react'
import { EMPTY_SCHEDULE_FORM } from '@/components/features/schedule/scheduleConfig'
import { buildGanttInfo, getTodayLeft } from '@/components/features/schedule/scheduleGanttUtils'
import { scheduleService, type ScheduleTask, type ScheduleTaskFormData } from '@/services/scheduleService'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'

type ScheduleForm = Omit<ScheduleTaskFormData, 'project_id'>

function buildFormFromTask(task: ScheduleTask): ScheduleForm {
  return {
    name: task.name,
    start_date: task.start_date,
    end_date: task.end_date,
    progress: task.progress,
    color: task.color,
    notes: task.notes ?? '',
  }
}

function useScheduleTasks(projectId?: string) {
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [loading, setLoading] = useState(true)
  const { error } = useToast()

  const load = useCallback(async () => {
    if (!projectId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setTasks(await scheduleService.getByProject(projectId))
    } catch (loadError) {
      error(`No se pudo cargar cronograma: ${getErrorMessage(loadError)}`)
    } finally {
      setLoading(false)
    }
  }, [error, projectId])

  useEffect(() => {
    void load()
  }, [load])

  return { tasks, loading, load }
}

function useScheduleFormState() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ScheduleForm>({ ...EMPTY_SCHEDULE_FORM })
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreate = useCallback(() => {
    setShowForm(true)
    setEditId(null)
    setForm({ ...EMPTY_SCHEDULE_FORM })
  }, [])

  const startEdit = useCallback((task: ScheduleTask) => {
    setForm(buildFormFromTask(task))
    setEditId(task.id)
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditId(null)
  }, [])

  return {
    showForm,
    form,
    editId,
    deleteId,
    saving,
    setForm,
    setDeleteId,
    setSaving,
    openCreate,
    startEdit,
    closeForm,
  }
}

function useScheduleEditor(
  projectId: string | undefined,
  load: () => Promise<void>,
  onError: (message: string) => void,
) {
  const state = useScheduleFormState()
  const { form, editId, deleteId, setForm, setDeleteId, setSaving, closeForm } = state

  const saveTask = useCallback(async () => {
    if (!projectId || !form.name.trim() || !form.end_date) return
    setSaving(true)
    try {
      const payload = { ...form, project_id: projectId }
      if (editId) await scheduleService.update(editId, payload)
      else await scheduleService.create(payload)
      closeForm()
      setForm({ ...EMPTY_SCHEDULE_FORM })
      await load()
    } catch (saveError) {
      onError(`No se pudo guardar tarea: ${getErrorMessage(saveError)}`)
    } finally {
      setSaving(false)
    }
  }, [closeForm, editId, form, load, onError, projectId, setForm, setSaving])

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      await scheduleService.delete(deleteId)
      setDeleteId(null)
      await load()
    } catch (deleteError) {
      onError(`No se pudo eliminar tarea: ${getErrorMessage(deleteError)}`)
    }
  }, [deleteId, load, onError, setDeleteId])

  return { ...state, saveTask, confirmDelete }
}

export function useSchedulePage(projectId?: string) {
  const { error } = useToast()
  const { tasks, loading, load } = useScheduleTasks(projectId)
  const editor = useScheduleEditor(projectId, load, error)
  const overall = useMemo(() => scheduleService.getOverallProgress(tasks), [tasks])
  const delayed = useMemo(() => scheduleService.getDelayedTasks(tasks), [tasks])
  const ganttInfo = useMemo(() => buildGanttInfo(tasks), [tasks])
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const todayLeft = useMemo(() => getTodayLeft(ganttInfo, today), [ganttInfo, today])

  return {
    tasks,
    loading,
    overall,
    delayed,
    ganttInfo,
    today,
    todayLeft,
    ...editor,
  }
}
