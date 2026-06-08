import { useProjectDetailPage } from '@/hooks/useProjectDetailPage'
import { ProjectDetailHeader } from '@/components/features/projects/ProjectDetailHeader'
import { ProjectDetailModals } from '@/components/features/projects/ProjectDetailModals'
import { ProjectBudgetSummary } from '@/components/features/projects/ProjectBudgetSummary'
import { ProjectModulesGrid } from '@/components/features/projects/ProjectModulesGrid'
import { ProjectPayrollSection } from '@/components/features/projects/ProjectPayrollSection'
import { ProjectRecentTransactions } from '@/components/features/projects/ProjectRecentTransactions'
import { ProjectDocumentsSection } from '@/components/features/projects/ProjectDocumentsSection'
import { ProjectTendencias } from '@/components/features/projects/ProjectTendencias'

export default function ProjectDetail() {
  const {
    projectId,
    project,
    loading,
    periods,
    recentTxns,
    showCreate,
    showEditProject,
    savingProject,
    deletingId,
    confirmDeleteId,
    duplicatingId,
    draftPeriod,
    totalBudget,
    totalInvested,
    openCreateModal,
    closeCreateModal,
    openEditProjectModal,
    closeEditProjectModal,
    requestDeletePeriod,
    cancelDeletePeriod,
    handleCreatedPeriod,
    handleEditProject,
    handleDeletePeriod,
    handleDuplicatePeriod,
  } = useProjectDetailPage()

  if (!projectId || !project) return <div className="text-sm text-app-muted">Cargando proyecto...</div>

  return (
    <div className="space-y-6">
      <ProjectDetailHeader
        project={project}
        draftPeriod={draftPeriod}
        onEdit={openEditProjectModal}
        onCreate={openCreateModal}
      />

      <ProjectModulesGrid projectId={projectId} />
      <ProjectBudgetSummary projectId={projectId} totalBudget={totalBudget} totalInvested={totalInvested} />
      <ProjectRecentTransactions projectId={projectId} transactions={recentTxns} />
      <ProjectTendencias projectId={projectId} />
      <ProjectDocumentsSection projectId={projectId} />
      <ProjectPayrollSection
        projectId={projectId}
        loading={loading}
        periods={periods}
        draftPeriod={draftPeriod}
        deletingId={deletingId}
        duplicatingId={duplicatingId}
        onCreate={openCreateModal}
        onDuplicate={handleDuplicatePeriod}
        onDelete={requestDeletePeriod}
      />

      <ProjectDetailModals
        projectId={projectId}
        project={project}
        showCreate={showCreate}
        showEditProject={showEditProject}
        savingProject={savingProject}
        confirmDeleteId={confirmDeleteId}
        onCloseCreate={closeCreateModal}
        onCreated={handleCreatedPeriod}
        onCloseEditProject={closeEditProjectModal}
        onSubmitEditProject={handleEditProject}
        onConfirmDeletePeriod={handleDeletePeriod}
        onCancelDeletePeriod={cancelDeletePeriod}
      />
    </div>
  )
}
