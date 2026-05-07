import { BookOpen, Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

export function BitacoraHeader({
  projectId,
  projectName,
  onNew,
}: {
  projectId: string
  projectName: string
  onNew: () => void
}) {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: projectName, to: `/proyectos/${projectId}` }, { label: 'Bitácora' }]} />
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /><h1 className="text-xl font-bold text-app-text">Bitácora de Obra</h1></div><button onClick={onNew} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />Nuevo registro</button></div>
    </div>
  )
}

export function BitacoraLoadingState() {
  return <div className="text-center py-12 text-app-muted text-sm">Cargando...</div>
}

export function BitacoraEmptyState() {
  return (
    <div className="text-center py-12 text-app-muted">
      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p>No hay registros en la bitácora aún.</p>
    </div>
  )
}
