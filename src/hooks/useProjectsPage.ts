import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { projectService } from '@/services/projectService'
import { useToast } from '@/components/ui/Toast'
import type { Project } from '@/types/database'

type ProjectFormInput = Parameters<typeof projectService.create>[0]

function matchesSearch(project: Project, term: string) {
  return (
    project.name.toLowerCase().includes(term) ||
    project.code.toLowerCase().includes(term) ||
    project.location?.toLowerCase().includes(term)
  )
}

function useProjectFilters(projects: Project[], search: string) {
  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return projects
    return projects.filter((project) => matchesSearch(project, term))
  }, [projects, search])

  const counts = useMemo(
    () => ({
      active: projects.filter((project) => project.status === 'active').length,
      paused: projects.filter((project) => project.status === 'paused').length,
    }),
    [projects],
  )

  return { filteredProjects, counts }
}

interface ProjectActionsParams {
  fetchProjects: () => Promise<void>
  editing: Project | undefined
  setEditing: (project: Project | undefined) => void
  setShowCreate: (value: boolean) => void
}

function useProjectActions({ fetchProjects, editing, setEditing, setShowCreate }: ProjectActionsParams) {
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  const handleCreate = async (data: ProjectFormInput) => {
    setSaving(true)
    try {
      await projectService.create(data)
      setShowCreate(false)
      await fetchProjects()
      success('Proyecto creado correctamente')
    } catch {
      error('No se pudo crear el proyecto')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (data: ProjectFormInput) => {
    if (!editing) return
    setSaving(true)
    try {
      await projectService.update(editing.id, data)
      setEditing(undefined)
      await fetchProjects()
      success('Proyecto actualizado')
    } catch {
      error('No se pudo actualizar el proyecto')
    } finally {
      setSaving(false)
    }
  }

  return { saving, handleCreate, handleUpdate }
}

export function useProjectsPage() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()
  const [search, setSearch] = useState('')
  const { filteredProjects, counts } = useProjectFilters(projects, search)
  const { saving, handleCreate, handleUpdate } = useProjectActions({
    fetchProjects,
    editing,
    setEditing,
    setShowCreate,
  })

  useEffect(() => {
    void fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    loading,
    showCreate,
    editing,
    saving,
    search,
    filteredProjects,
    counts,
    setShowCreate,
    setEditing,
    setSearch,
    handleCreate,
    handleUpdate,
  }
}
