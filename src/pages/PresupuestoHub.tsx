import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Building2, ArrowRight } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'

export default function PresupuestoHub() {
  const { projects, loading, fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const activeProjects = projects.filter((p) => p.status === 'active')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-app-text">Presupuesto</h1>
        <p className="text-sm text-app-muted mt-1">Selecciona un proyecto para ver presupuesto vs real</p>
      </div>

      {loading ? (
        <div className="text-sm text-app-muted">Cargando proyectos...</div>
      ) : activeProjects.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <BarChart3 className="w-12 h-12 text-app-subtle mx-auto mb-3" />
          <p className="text-app-muted">No hay proyectos activos</p>
          <Link to="/proyectos" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium">
            Ir a proyectos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.map((project) => (
            <Link
              key={project.id}
              to={`/proyectos/${project.id}/presupuesto`}
              className="bg-app-surface rounded-xl border border-app-border p-5 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-app-text">{project.name}</h3>
                    <p className="text-xs text-app-muted mt-0.5">{project.location}</p>
                    <p className="text-xs text-app-subtle mt-1">{project.code}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-app-subtle group-hover:text-purple-500 transition-colors" />
              </div>
              <div className="mt-4 pt-3 border-t border-app-border">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs text-app-muted">23 categorías · Presupuesto vs Real</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
