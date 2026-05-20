import { Pencil, Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import type { PayrollPeriod, Project } from '@/types/database'
import { useProjectRoles } from '@/hooks/useProjectRoles'

export function ProjectDetailHeader({
  project,
  draftPeriod,
  onEdit,
  onCreate,
}: {
  project: Project
  draftPeriod: PayrollPeriod | null
  onEdit: () => void
  onCreate: () => void
}) {
  const { canEditProject, canCreatePayroll } = useProjectRoles(project.id)
  return (
    <div>
      <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: project.name }]} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">{project.name}</h1>
          <p className="text-sm text-app-muted mt-0.5">{project.location} · {project.code}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEditProject && (
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-app-muted border border-app-border rounded-xl hover:bg-app-hover transition-colors">
              <Pencil className="w-4 h-4" /> Editar
            </button>
          )}
          {canCreatePayroll && (
            draftPeriod ? (
              <span title={`El Reporte No. ${draftPeriod.period_number} está pendiente. Concluye ese reporte antes de crear uno nuevo.`} className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl cursor-not-allowed border border-amber-200">Borrador pendiente</span>
            ) : (
              <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">
                <Plus className="w-4 h-4" /> Nuevo reporte
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
