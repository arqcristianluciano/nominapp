import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EMPTY_SCHEDULE_FORM } from '@/components/features/schedule/scheduleConfig'
import { buildGanttInfo, getTodayLeft } from '@/components/features/schedule/scheduleGanttUtils'
import {
  scheduleService,
  wouldCreateParentCycle,
  wouldCreatePredecessorCycle,
  type ScheduleTask,
  type ScheduleTaskFormData,
} from '@/services/scheduleService'
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
    parent_task_id: task.parent_task_id,
    task_number: task.task_number,
    predecessor_id: task.predecessor_id,
    is_milestone: task.is_milestone,
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
  /** When not null, the form is opened in "add subtask" mode with this parent locked. */
  const [lockedParentId, setLockedParentId] = useState<string | null>(null)
  /** Bumped on every open so the page scrolls to the form even if it was already visible. */
  const [formRevision, setFormRevision] = useState(0)

  const openCreate = useCallback(() => {
    setShowForm(true)
    setEditId(null)
    setLockedParentId(null)
    setForm({ ...EMPTY_SCHEDULE_FORM })
    setFormRevision((r) => r + 1)
  }, [])

  const openAddSubtask = useCallback((parentTask: ScheduleTask) => {
    setShowForm(true)
    setEditId(null)
    setLockedParentId(parentTask.id)
    setForm({
      ...EMPTY_SCHEDULE_FORM,
      parent_task_id: parentTask.id,
      color: parentTask.color,
    })
    setFormRevision((r) => r + 1)
  }, [])

  const startEdit = useCallback((task: ScheduleTask) => {
    setForm(buildFormFromTask(task))
    setEditId(task.id)
    setLockedParentId(null)
    setShowForm(true)
    setFormRevision((r) => r + 1)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditId(null)
    setLockedParentId(null)
  }, [])

  return {
    showForm,
    form,
    editId,
    deleteId,
    saving,
    lockedParentId,
    formRevision,
    setForm,
    setDeleteId,
    setSaving,
    openCreate,
    openAddSubtask,
    startEdit,
    closeForm,
  }
}

function useScheduleEditor(
  projectId: string | undefined,
  tasks: ScheduleTask[],
  load: () => Promise<void>,
  onError: (message: string) => void,
) {
  const state = useScheduleFormState()
  const { form, editId, deleteId, setForm, setDeleteId, setSaving, closeForm } = state
  // Guard síncrono contra doble clic en Guardar: el estado `saving` tarda un
  // render en reflejarse y un segundo clic rápido podría duplicar la tarea.
  const savingRef = useRef(false)

  const saveTask = useCallback(async () => {
    if (savingRef.current) return
    if (!projectId || !form.name.trim()) return
    // Validation: needs end_date unless it has children (dates are derived then)
    const hasChildrenInDb = editId ? tasks.some((t) => t.parent_task_id === editId) : false
    if (!hasChildrenInDb && !form.end_date) return

    // Cycle checks
    if (editId && form.parent_task_id) {
      if (wouldCreateParentCycle(tasks, editId, form.parent_task_id)) {
        onError('No se puede asignar esta tarea padre: crearía un ciclo en la jerarquía.')
        return
      }
    }
    if (editId && form.predecessor_id) {
      if (wouldCreatePredecessorCycle(tasks, editId, form.predecessor_id)) {
        onError('No se puede asignar esta predecesora: crearía un ciclo en las dependencias.')
        return
      }
    }

    savingRef.current = true
    setSaving(true)
    try {
      const payload = { ...form, project_id: projectId }
      if (editId) await scheduleService.update(editId, payload)
      else await scheduleService.create(payload)
      closeForm()
      setForm({ ...EMPTY_SCHEDULE_FORM })
    } catch (saveError) {
      onError(`No se pudo guardar tarea: ${getErrorMessage(saveError)}`)
    } finally {
      // La lista se refresca SIEMPRE (también tras un error) para que lo que
      // se ve en pantalla coincida con lo guardado, sin refrescar el navegador.
      await load()
      savingRef.current = false
      setSaving(false)
    }
  }, [closeForm, editId, form, load, onError, projectId, setForm, setSaving, tasks])

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
  const editor = useScheduleEditor(projectId, tasks, load, error)
  const overall = useMemo(() => scheduleService.getOverallProgress(tasks), [tasks])
  const delayed = useMemo(() => scheduleService.getDelayedTasks(tasks), [tasks])
  const ganttInfo = useMemo(() => buildGanttInfo(tasks), [tasks])
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const todayLeft = useMemo(() => getTodayLeft(ganttInfo, today), [ganttInfo, today])

  /** True when the task currently in the edit form has children (locks date fields). */
  const editingHasChildren = useMemo(
    () => (editor.editId ? tasks.some((t) => t.parent_task_id === editor.editId) : false),
    [editor.editId, tasks],
  )

  return {
    tasks,
    loading,
    overall,
    delayed,
    ganttInfo,
    today,
    todayLeft,
    editingHasChildren,
    ...editor,
  }
}
