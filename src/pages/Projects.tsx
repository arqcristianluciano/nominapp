import { useNavigate } from 'react-router-dom'
import { ProjectsHeader } from '@/components/features/projects/ProjectsHeader'
import { ProjectsSearchInput } from '@/components/features/projects/ProjectsSearchInput'
import { ProjectsTable } from '@/components/features/projects/ProjectsTable'
import { ProjectsModals } from '@/components/features/projects/ProjectsModals'
import { EmptyProjects } from '@/components/features/projects/EmptyProjects'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useProjectsPage } from '@/hooks/useProjectsPage'

export default function Projects() {
  const navigate = useNavigate()
  const { projects, loading, showCreate, editing, saving, search, filteredProjects, counts, setShowCreate, setEditing, setSearch, handleCreate, handleUpdate } = useProjectsPage()

  return (
    <div className="space-y-6">
      <ProjectsHeader total={projects.length} active={counts.active} paused={counts.paused} onCreate={() => setShowCreate(true)} />
      <ProjectsSearchInput value={search} onChange={setSearch} />
      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : filteredProjects.length === 0 ? (
        <EmptyProjects hasSearch={!!search} onNew={() => setShowCreate(true)} />
      ) : (
        <ProjectsTable projects={filteredProjects} onOpen={(projectId) => navigate(`/proyectos/${projectId}`)} onEdit={setEditing} />
      )}
      <ProjectsModals showCreate={showCreate} editing={editing} saving={saving} onCloseCreate={() => setShowCreate(false)} onCloseEdit={() => setEditing(undefined)} onCreate={handleCreate} onUpdate={handleUpdate} />
    </div>
  )
}
