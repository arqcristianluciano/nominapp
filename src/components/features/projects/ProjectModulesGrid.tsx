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

interface Props {
  projectId: string
}

const topModules = [
  { label: 'Control Financiero', desc: 'Libro diario, CxP, cheques', to: 'control', icon: Landmark, tone: 'bg-blue-50 text-blue-600' },
  { label: 'Presupuesto', desc: 'Presupuesto vs real', to: 'presupuesto', icon: BarChart3, tone: 'bg-purple-50 text-purple-600' },
]

const extraModules = [
  { label: 'Cubicaciones', desc: 'Contrato por contratista', to: 'cubicaciones', icon: Layers, tone: 'bg-teal-50 text-teal-600' },
  { label: 'Control de Calidad', desc: 'Ensayos de hormigón', to: 'calidad', icon: ClipboardCheck, tone: 'bg-rose-50 text-rose-600' },
  { label: 'Listado de Insumos', desc: 'Presupuesto Mercado · contratos de ajuste', to: 'insumos', icon: PackageSearch, tone: 'bg-green-50 text-green-600' },
  { label: 'Bitácora de Obra', desc: 'Registro diario de actividades', to: 'bitacora', icon: BookOpen, tone: 'bg-amber-50 text-amber-600' },
  { label: 'Asistencia Diaria', desc: 'Personal · horas-hombre', to: 'asistencia', icon: Users, tone: 'bg-indigo-50 text-indigo-600' },
  { label: 'Inventario de Materiales', desc: 'Stock · entradas y salidas', to: 'inventario', icon: Package, tone: 'bg-orange-50 text-orange-600' },
  { label: 'Cronograma de Obra', desc: 'Diagrama de Gantt · avance', to: 'cronograma', icon: BarChart2, tone: 'bg-sky-50 text-sky-600' },
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
    <Link to={`/proyectos/${projectId}/${to}`} className="bg-app-surface rounded-xl border border-app-border p-4 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-app-text">{label}</p>
          <p className="text-xs text-app-muted">{desc}</p>
        </div>
      </div>
    </Link>
  )
}

export function ProjectModulesGrid({ projectId }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topModules.map((item) => (
          <ModuleCard key={item.to} projectId={projectId} {...item} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {extraModules.map((item) => (
          <ModuleCard key={item.to} projectId={projectId} {...item} />
        ))}
      </div>
    </>
  )
}
