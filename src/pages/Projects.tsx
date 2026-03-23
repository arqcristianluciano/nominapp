import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { projectService } from '@/services/projectService'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/features/projects/ProjectForm'
import type { Project } from '@/types/database'

export default function Projects() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleCreate = async (data: any) => {
    setSaving(true)
    try {
      await projectService.create(data)
      setShowCreate(false)
      fetchProjects()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editing) return
    setSaving(true)
    try {
      await projectService.update(editing.id, data)
      setEditing(undefined)
      fetchProjects()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    paused: 'bg-amber-50 text-amber-700',
  }

  const statusLabels: Record<string, string> = {
    active: 'Activo',
    completed: 'Completado',
    paused: 'Pausado',
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} proyectos registrados</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar proyecto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando proyectos...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proyecto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Ubicación</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">DT %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/proyectos/${project.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                      {project.name}
                    </Link>
                    <div className="text-xs text-gray-400">{project.code}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{project.location}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{project.company?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
                      {statusLabels[project.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell">{project.dt_percent}%</td>
                  <td className="px-2 py-3">
                    <button onClick={() => setEditing(project)} className="p-1.5 text-gray-300 hover:text-blue-500" title="Editar proyecto">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo proyecto">
        <ProjectForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(undefined)} title="Editar proyecto">
        {editing && <ProjectForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(undefined)} saving={saving} />}
      </Modal>
    </div>
  )
}
