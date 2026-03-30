import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Building2, MapPin, Factory } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { projectService } from '@/services/projectService'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/features/projects/ProjectForm'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { Project } from '@/types/database'

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  completed: 'bg-app-chip text-app-muted',
  paused:    'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
}

export default function Projects() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const { success, error } = useToast()

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleCreate = async (data: any) => {
    setSaving(true)
    try {
      await projectService.create(data)
      setShowCreate(false)
      fetchProjects()
      success('Proyecto creado correctamente')
    } catch {
      error('No se pudo crear el proyecto')
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
      success('Proyecto actualizado')
    } catch {
      error('No se pudo actualizar el proyecto')
    } finally {
      setSaving(false)
    }
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    active: projects.filter((p) => p.status === 'active').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    paused: projects.filter((p) => p.status === 'paused').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Proyectos</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-app-muted">{projects.length} registrados</span>
            {counts.active > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full">
                {counts.active} activos
              </span>
            )}
            {counts.paused > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 rounded-full">
                {counts.paused} pausados
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
        <input
          type="text"
          placeholder="Buscar proyecto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        />
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyProjects hasSearch={!!search} onNew={() => setShowCreate(true)} />
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Proyecto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">Ubicación</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden md:table-cell">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden lg:table-cell">DT %</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filtered.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => navigate(`/proyectos/${project.id}`)}
                  className="hover:bg-app-hover transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 text-sm">
                          {project.name}
                        </div>
                        <div className="text-xs text-app-subtle mt-0.5">{project.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-app-muted text-sm">
                      {project.location && <MapPin className="w-3.5 h-3.5 shrink-0 text-app-subtle" />}
                      {project.location || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-app-muted text-sm">
                      {project.company?.name && <Factory className="w-3.5 h-3.5 shrink-0 text-app-subtle" />}
                      {project.company?.name || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_STYLES[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-app-muted hidden lg:table-cell">
                    {project.dt_percent}%
                  </td>
                  <td className="px-2 py-3.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(project) }}
                      className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all"
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

function EmptyProjects({ hasSearch, onNew }: { hasSearch: boolean; onNew: () => void }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
      </div>
      <p className="text-base font-semibold text-app-text mb-1">
        {hasSearch ? 'Sin resultados' : 'Sin proyectos aún'}
      </p>
      <p className="text-sm text-app-muted mb-5">
        {hasSearch
          ? 'Intenta con otro nombre, código o ubicación'
          : 'Crea tu primer proyecto para empezar a gestionar obras'}
      </p>
      {!hasSearch && (
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </button>
      )}
    </div>
  )
}
