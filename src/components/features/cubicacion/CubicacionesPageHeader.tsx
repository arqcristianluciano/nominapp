import { Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

interface CubicacionesPageHeaderProps {
  projectId: string | undefined
  projectName: string
  onCreateContract: () => void
}

export function CubicacionesPageHeader({
  projectId,
  projectName,
  onCreateContract,
}: CubicacionesPageHeaderProps) {
  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: projectName, to: `/proyectos/${projectId}` },
          { label: 'Cubicaciones' },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Cubicaciones</h1>
          <p className="mt-0.5 text-sm text-app-muted">Contratos de ajuste por contratista</p>
        </div>
        <button
          onClick={onCreateContract}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo contrato
        </button>
      </div>
    </div>
  )
}
