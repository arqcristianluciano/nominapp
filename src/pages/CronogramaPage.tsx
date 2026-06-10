import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useSchedulePage } from '@/hooks/useSchedulePage'
import { SchedulePageHeader } from '@/components/features/schedule/SchedulePageHeader'
import { ScheduleStats } from '@/components/features/schedule/ScheduleStats'
import { ScheduleTaskForm } from '@/components/features/schedule/ScheduleTaskForm'
import { ScheduleTasksContent } from '@/components/features/schedule/ScheduleTasksContent'
import { ScheduleDeleteTaskModal } from '@/components/features/schedule/ScheduleDeleteTaskModal'

export default function CronogramaPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const schedule = useSchedulePage(projectId)

  // Al abrir el formulario (editar, nueva tarea o subtarea) la página se
  // desplaza sola hasta él: sin esto, al editar una tarea del final de la
  // lista había que subir manualmente para ver el formulario.
  const formRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (schedule.showForm && schedule.formRevision > 0) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [schedule.showForm, schedule.formRevision])

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <SchedulePageHeader projectId={projectId} projectName={project?.name} onCreateTask={schedule.openCreate} />
      <ScheduleStats overall={schedule.overall} totalTasks={schedule.tasks.length} delayedTasks={schedule.delayed} />
      {schedule.showForm && (
        <div ref={formRef} className="scroll-mt-16">
          <ScheduleTaskForm
            form={schedule.form}
            editMode={!!schedule.editId}
            saving={schedule.saving}
            allTasks={schedule.tasks}
            editId={schedule.editId}
            lockedParentId={schedule.lockedParentId}
            hasChildren={schedule.editingHasChildren}
            onChange={schedule.setForm}
            onCancel={schedule.closeForm}
            onSave={schedule.saveTask}
          />
        </div>
      )}
      <ScheduleTasksContent
        loading={schedule.loading}
        tasks={schedule.tasks}
        ganttInfo={schedule.ganttInfo}
        today={schedule.today}
        todayLeft={schedule.todayLeft}
        onEdit={schedule.startEdit}
        onDelete={schedule.setDeleteId}
        onAddSubtask={schedule.openAddSubtask}
      />
      <ScheduleDeleteTaskModal
        deleteId={schedule.deleteId}
        onConfirm={schedule.confirmDelete}
        onCancel={() => schedule.setDeleteId(null)}
      />
    </div>
  )
}
