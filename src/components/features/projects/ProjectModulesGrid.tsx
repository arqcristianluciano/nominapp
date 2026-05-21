import { Link } from 'react-router-dom'
import type { ElementType } from 'react'
import {
  BarChart2,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Landmark,
  Layers,
  Package,
  PackageSearch,
  Users,
} from 'lucide-react'
import { useProjectRoles, type ProjectRole } from '@/hooks/useProjectRoles'

interface Props {
  projectId: string
}

interface ModuleDef {
  label: string
  desc: string
  to: string
  icon: ElementType
  tone: string
  visibleTo?: ProjectRole[]
}

const topModules: ModuleDef[] = [
  { label: 'Control Financiero', desc: 'Libro diario, CxP, cheques', to: 'control', icon: Landmark, tone: 'bg-blue-50 text-blue-600', visibleTo: ['director_proyecto', 'contabilidad'] },
  { label: 'Presupuesto', desc: 'Presupuesto vs real', to: 'presupuesto', icon: BarChart3, tone: 'bg-purple-50 text-purple-600' },
]

const extraModules: ModuleDef[] = [
  { label: 'Cubicaciones', desc: 'Contrato por contratista', to: 'cubicaciones', icon: Layers, tone: 'bg-teal-50 text-teal-600', visibleTo: ['director_proyecto', 'comprador', 'ingeniero_obra', 'contabilidad'] },
  { label: 'Control de Calidad', desc: 'Ensayos de hormigón', to: 'calidad', icon: ClipboardCheck, tone: 'bg-rose-50 text-rose-600', visibleTo: ['director_proyecto', 'planificacion', 'ingeniero_obra', 'supervisor_especializado'] },
  { label: 'Listado de Insumos', desc: 'Presupuesto Mercado · contratos de ajuste', to: 'insumos', icon: PackageSearch, tone: 'bg-green-50 text-green-600', visibleTo: ['director_proyecto', 'planificacion'] },
  { label: 'Bitácora de Obra', desc: 'Registro diario de actividades', to: 'bitacora', icon: BookOpen, tone: 'bg-amber-50 text-amber-600', visibleTo: ['director_proyecto', 'planificacion', 'ingeniero_obra', 'supervisor_especializado'] },
  { label: 'Asistencia Diaria', desc: 'Personal · horas-hombre', to: 'asistencia', icon: Users, tone: 'bg-indigo-50 text-indigo-600', visibleTo: ['director_proyecto', 'planificacion', 'ingeniero_obra', 'supervisor_especializado'] },
  { label: 'Inventario de Materiales', desc: 'Stock · entradas y salidas', to: 'inventario', icon: Package, tone: 'bg-orange-50 text-orange-600', visibleTo: ['director_proyecto', 'almacenista'] },
  { label: 'Cronograma de Obra', desc: 'Diagrama de Gantt · avance', to: 'cronograma', icon: BarChart2, tone: 'bg-sky-50 text-sky-600', visibleTo: ['director_proyecto', 'planificacion', 'ingeniero_obra', 'supervisor_especializado', 'comprador'] },
]

function ModuleCard({
  projectId,
  to,
  label,
  desc,
  icon: Icon,
  tone,
}: {
  projectId: string
  to: string
  label: string
  desc: string
  icon: ElementType
  tone: string
}) {
  return (
    <Link
      to={`/proyectos/${projectId}/${to}`}
      className="bg-app-surface rounded-xl border border-app-border p-3 sm:p-4 hover:border-blue-300 hover:shadow-sm transition-all min-h-[80px] sm:min-h-0 flex"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
        <div className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-app-text truncate">{label}</p>
          <p className="text-xs text-app-muted line-clamp-2 sm:line-clamp-1">{desc}</p>
        </div>
      </div>
    </Link>
  )
}

export function ProjectModulesGrid({ projectId }: Props) {
  const { hasAny } = useProjectRoles(projectId)
  const visible = (m: ModuleDef) => !m.visibleTo || hasAny(...m.visibleTo)
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {topModules.filter(visible).map((item) => (
          <ModuleCard key={item.to} projectId={projectId} {...item} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {extraModules.filter(visible).map((item) => (
          <ModuleCard key={item.to} projectId={projectId} {...item} />
        ))}
      </div>
    </>
  )
}
