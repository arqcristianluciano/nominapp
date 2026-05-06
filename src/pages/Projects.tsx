import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { projectService } from '@/services/projectService'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/features/projects/ProjectForm'
import { ProjectsHeader } from '@/components/features/projects/ProjectsHeader'
import { ProjectsTable } from '@/components/features/projects/ProjectsTable'
import { EmptyProjects } from '@/components/features/projects/EmptyProjects'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { Project } from '@/types/database'

export default function Projects() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const { success, error } = useToast()

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleCreate = async (data: Parameters<typeof projectService.create>[0]) => {
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

  const handleUpdate = async (data: Parameters<typeof projectService.create>[0]) => {
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
      <ProjectsHeader total={projects.length} active={counts.active} paused={counts.paused} onCreate={() => setShowCreate(true)} />

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
        <ProjectsTable projects={filtered} onOpen={(projectId) => navigate(`/proyectos/${projectId}`)} onEdit={setEditing} />
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
