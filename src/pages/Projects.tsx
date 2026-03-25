import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { projectService } from '@/services/projectService'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/features/projects/ProjectForm'
import type { Project } from '@/types/database'

export default function Projects() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const navigate = useNavigate()
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
    completed: 'bg-app-chip text-app-muted',
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
          <h1 className="text-2xl font-semibold text-app-text">Proyectos</h1>
          <p className="text-sm text-app-muted mt-1">{projects.length} proyectos registrados</p>
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
        <input
          type="text"
          placeholder="Buscar proyecto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-sm text-app-muted">Cargando proyectos...</div>
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-3 font-medium text-app-muted">Proyecto</th>
                <th className="text-left px-4 py-3 font-medium text-app-muted hidden sm:table-cell">Ubicación</th>
                <th className="text-left px-4 py-3 font-medium text-app-muted hidden md:table-cell">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-app-muted">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-app-muted hidden lg:table-cell">DT %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filtered.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => navigate(`/proyectos/${project.id}`)}
                  className="hover:bg-app-hover transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-blue-600">{project.name}</div>
                    <div className="text-xs text-app-subtle">{project.code}</div>
                  </td>
                  <td className="px-4 py-3 text-app-muted hidden sm:table-cell">{project.location}</td>
                  <td className="px-4 py-3 text-app-muted hidden md:table-cell">{project.company?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
                      {statusLabels[project.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-app-muted hidden lg:table-cell">{project.dt_percent}%</td>
                  <td className="px-2 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(project) }}
                      className="p-1.5 text-app-subtle hover:text-blue-500"
                      title="Editar proyecto"
                    >
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
