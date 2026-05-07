import { useParams } from 'react-router-dom'
import { useQualityControlPage } from '@/hooks/useQualityControlPage'
import { QualityStatsCards } from '@/components/features/quality/QualityStatsCards'
import { QualityRecordsTable } from '@/components/features/quality/QualityRecordsTable'
import { QualityControlPageHeader, QualityControlPageModals } from '@/components/features/quality/QualityControlPageSections'

export default function QualityControlPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const quality = useQualityControlPage(projectId)

  if (!projectId) return null

  return (
    <div className="space-y-5">
      <QualityControlPageHeader projectId={projectId} projectName={quality.projectName} onCreate={() => quality.setShowCreate(true)} />

      <QualityStatsCards passed={quality.stats.passed} failed={quality.stats.failed} pending={quality.stats.pending} />
      <QualityRecordsTable
        loading={quality.loading}
        records={quality.records}
        onCreate={() => quality.setShowCreate(true)}
        onEdit={quality.setEditing}
        onDelete={quality.setDeletingId}
      />

      <QualityControlPageModals
        projectId={projectId}
        showCreate={quality.showCreate}
        editing={quality.editing}
        deletingId={quality.deletingId}
        saving={quality.saving}
        onSubmit={quality.submitRecord}
        onCloseCreate={() => quality.setShowCreate(false)}
        onCloseEdit={() => quality.setEditing(undefined)}
        onConfirmDelete={quality.confirmDelete}
        onCancelDelete={() => quality.setDeletingId(null)}
      />
    </div>
  )
}
