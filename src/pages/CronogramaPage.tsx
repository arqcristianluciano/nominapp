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

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <SchedulePageHeader projectId={projectId} projectName={project?.name} onCreateTask={schedule.openCreate} />
      <ScheduleStats overall={schedule.overall} totalTasks={schedule.tasks.length} delayedTasks={schedule.delayed} />
      {schedule.showForm && (
        <ScheduleTaskForm
          form={schedule.form}
          editMode={!!schedule.editId}
          saving={schedule.saving}
          onChange={schedule.setForm}
          onCancel={schedule.closeForm}
          onSave={schedule.saveTask}
        />
      )}
      <ScheduleTasksContent
        loading={schedule.loading}
        tasks={schedule.tasks}
        ganttInfo={schedule.ganttInfo}
        today={schedule.today}
        todayLeft={schedule.todayLeft}
        onEdit={schedule.startEdit}
        onDelete={schedule.setDeleteId}
      />
      <ScheduleDeleteTaskModal deleteId={schedule.deleteId} onConfirm={schedule.confirmDelete} onCancel={() => schedule.setDeleteId(null)} />
    </div>
  )
}
