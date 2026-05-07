import { ReportesObraHeader } from '@/components/features/payrollReports/ReportesObraHeader'
import { ReportesObraContent } from '@/components/features/payrollReports/ReportesObraContent'
import { ReportesObraModals } from '@/components/features/payrollReports/ReportesObraModals'
import { useReportesObraState } from '@/components/features/payrollReports/useReportesObraState'

export default function ReportesObra() {
  const {
    periods,
    projects,
    grouped,
    emptyProjects,
    loading,
    showCreate,
    selectedProjectId,
    expandedProjects,
    confirmDeleteId,
    deletingId,
    closingProjectId,
    toggleExpand,
    openCreate,
    closeCreate,
    setSelectedProjectId,
    setConfirmDeleteId,
    handleMarkAllPaid,
    handleDelete,
  } = useReportesObraState()

  return (
    <div className="space-y-6 max-w-4xl">
      <ReportesObraHeader periodsCount={periods.length} onCreate={() => openCreate()} />

      <ReportesObraContent
        loading={loading}
        periodsCount={periods.length}
        grouped={grouped}
        emptyProjects={emptyProjects}
        expandedProjects={expandedProjects}
        closingProjectId={closingProjectId}
        deletingId={deletingId}
        onToggleExpand={toggleExpand}
        onMarkAllPaid={handleMarkAllPaid}
        onCreate={openCreate}
        onDeleteDraft={setConfirmDeleteId}
      />

      <ReportesObraModals
        projects={projects}
        showCreate={showCreate}
        selectedProjectId={selectedProjectId}
        confirmDeleteId={confirmDeleteId}
        onCloseCreate={closeCreate}
        onProjectChange={setSelectedProjectId}
        onConfirmDelete={handleDelete}
        onCancelDelete={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
