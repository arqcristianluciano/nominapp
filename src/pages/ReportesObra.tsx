import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { PayrollPeriod, Project } from '@/types/database'
import { ProjectReportsSection } from '@/components/features/payrollReports/ProjectReportsSection'
import { EmptyProjectsPanel } from '@/components/features/payrollReports/EmptyProjectsPanel'
import { CreateReportModalContent } from '@/components/features/payrollReports/CreateReportModalContent'

export default function ReportesObra() {
  const navigate = useNavigate()
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Reportes</h1>
          <p className="text-sm text-app-muted mt-0.5">{periods.length} reporte{periods.length !== 1 ? 's' : ''} registrado{periods.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Nuevo reporte
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-app-muted">Cargando reportes...</div>
      ) : periods.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
          <FileText className="w-10 h-10 text-app-subtle mx-auto mb-3" />
          <p className="text-app-muted font-medium">No hay reportes registrados</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Crear el primer reporte
          </button>
        </div>
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

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Eliminar borrador"
        message="¿Eliminar este reporte en borrador? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo reporte">
        {showCreate && (
          <CreateReportModalContent
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            onCreated={(periodId) => { setShowCreate(false); navigate(`/nominas/${periodId}`) }}
            onCancel={() => setShowCreate(false)}
          />
        )}
      </Modal>
    </div>
  )
}
