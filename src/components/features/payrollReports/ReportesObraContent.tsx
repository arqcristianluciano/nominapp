import type { PayrollPeriod, Project } from '@/types/database'
import { ProjectReportsSection } from './ProjectReportsSection'
import { EmptyProjectsPanel } from './EmptyProjectsPanel'
import { ReportesObraEmptyState } from './ReportesObraEmptyState'

interface GroupedProjectReports {
  project: Project
  periods: PayrollPeriod[]
}

interface Props {
  loading: boolean
  periodsCount: number
  grouped: GroupedProjectReports[]
  emptyProjects: Project[]
  expandedProjects: Set<string>
  closingProjectId: string | null
  deletingId: string | null
  onToggleExpand: (projectId: string) => void
  onMarkAllPaid: (projectId: string) => Promise<void>
  onCreate: (projectId?: string) => void
  onDeleteDraft: (periodId: string) => void
}

export function ReportesObraContent({
  loading,
  periodsCount,
  grouped,
  emptyProjects,
  expandedProjects,
  closingProjectId,
  deletingId,
  onToggleExpand,
  onMarkAllPaid,
  onCreate,
  onDeleteDraft,
}: Props) {
  if (loading) {
    return <div className="text-sm text-app-muted">Cargando reportes...</div>
  }

  if (periodsCount === 0) {
    return <ReportesObraEmptyState onCreate={() => onCreate()} />
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ project, periods }) => (
        <ProjectReportsSection
          key={project.id}
          project={project}
          periods={periods}
          expanded={expandedProjects.has(project.id)}
          closing={closingProjectId === project.id}
          deletingId={deletingId}
          onToggleExpand={onToggleExpand}
          onMarkAllPaid={onMarkAllPaid}
          onCreateNew={(projectId) => onCreate(projectId)}
          onDeleteDraft={onDeleteDraft}
        />
      ))}
      <EmptyProjectsPanel projects={emptyProjects} onCreate={(projectId) => onCreate(projectId)} />
    </div>
  )
}
