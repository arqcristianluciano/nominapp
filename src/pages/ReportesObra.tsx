import { useEffect, useState } from 'react'
import { payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import type { PayrollPeriod, Project } from '@/types/database'
import { ProjectReportsSection } from '@/components/features/payrollReports/ProjectReportsSection'
import { EmptyProjectsPanel } from '@/components/features/payrollReports/EmptyProjectsPanel'
import { ReportesObraHeader } from '@/components/features/payrollReports/ReportesObraHeader'
import { ReportesObraEmptyState } from '@/components/features/payrollReports/ReportesObraEmptyState'
import { ReportesObraModals } from '@/components/features/payrollReports/ReportesObraModals'

export default function ReportesObra() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [closingProjectId, setClosingProjectId] = useState<string | null>(null)

  function toggleExpand(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  async function handleMarkAllPaid(projectId: string) {
    setClosingProjectId(projectId)
    try {
      const drafts = periods.filter(
        (p) => p.project_id === projectId && (p.status === 'draft' || p.status === 'submitted' || p.status === 'approved')
      )
      await Promise.all(drafts.map((p) => payrollService.updatePeriodStatus(p.id, 'paid')))
      setPeriods((prev) =>
        prev.map((p) => (p.project_id === projectId && p.status !== 'paid') ? { ...p, status: 'paid' } : p)
      )
    } finally {
      setClosingProjectId(null)
    }
  }

  async function handleDelete(periodId: string) {
    setDeletingId(periodId)
    try {
      await payrollService.deletePeriod(periodId)
      setPeriods((prev) => prev.filter((p) => p.id !== periodId))
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  useEffect(() => {
    Promise.all([
      payrollService.getAllPeriods(),
      projectService.getAll(),
    ]).then(([p, proj]) => {
      setPeriods(p)
      setProjects(proj)
      if (proj.length > 0) setSelectedProjectId(proj[0].id)
    }).finally(() => setLoading(false))
  }, [])

  const grouped = projects.map((proj) => ({
    project: proj,
    periods: periods.filter((p) => p.project_id === proj.id),
  })).filter((g) => g.periods.length > 0)

  const emptyProjects = projects.filter((p) => !periods.some((r) => r.project_id === p.id))

  return (
    <div className="space-y-6 max-w-4xl">
      <ReportesObraHeader periodsCount={periods.length} onCreate={() => setShowCreate(true)} />

      {loading ? (
        <div className="text-sm text-app-muted">Cargando reportes...</div>
      ) : periods.length === 0 ? (
        <ReportesObraEmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ project, periods: projectPeriods }) => (
            <ProjectReportsSection
              key={project.id}
              project={project}
              periods={projectPeriods}
              expanded={expandedProjects.has(project.id)}
              closing={closingProjectId === project.id}
              deletingId={deletingId}
              onToggleExpand={toggleExpand}
              onMarkAllPaid={handleMarkAllPaid}
              onCreateNew={(projectId) => { setSelectedProjectId(projectId); setShowCreate(true) }}
              onDeleteDraft={setConfirmDeleteId}
            />
          ))}
          <EmptyProjectsPanel
            projects={emptyProjects}
            onCreate={(projectId) => { setSelectedProjectId(projectId); setShowCreate(true) }}
          />
        </div>
      )}

      <ReportesObraModals
        projects={projects}
        showCreate={showCreate}
        selectedProjectId={selectedProjectId}
        confirmDeleteId={confirmDeleteId}
        onCloseCreate={() => setShowCreate(false)}
        onProjectChange={setSelectedProjectId}
        onConfirmDelete={handleDelete}
        onCancelDelete={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
