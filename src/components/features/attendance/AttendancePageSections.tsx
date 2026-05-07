import { Plus, Users } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

export function AttendancePageHeader({
  projectId,
  projectName,
  onRegister,
}: {
  projectId: string
  projectName: string
  onRegister: () => void
}) {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: projectName, to: `/proyectos/${projectId}` }, { label: 'Asistencia' }]} />
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /><h1 className="text-xl font-bold text-app-text">Asistencia Diaria</h1></div><button onClick={onRegister} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />Registrar</button></div>
    </div>
  )
}
