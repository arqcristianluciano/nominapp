import { BarChart2, Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

interface SchedulePageHeaderProps {
  projectId?: string
  projectName?: string
  onCreateTask: () => void
}

export function SchedulePageHeader({ projectId, projectName, onCreateTask }: SchedulePageHeaderProps) {
  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: projectName ?? 'Proyecto', to: `/proyectos/${projectId}` },
          { label: 'Cronograma' },
        ]}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">Cronograma de Obra</h1>
        </div>
        <button
          onClick={onCreateTask}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nueva tarea
        </button>
      </div>
    </div>
  )
}
