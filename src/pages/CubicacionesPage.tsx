import { useParams, useNavigate } from 'react-router-dom'
import { CubicacionesSummaryCards } from '@/components/features/cubicacion/CubicacionesSummaryCards'
import { ContractsTable } from '@/components/features/cubicacion/ContractsTable'
import { CreateContractModal } from '@/components/features/cubicacion/CreateContractModal'
import { CubicacionesPageHeader } from '@/components/features/cubicacion/CubicacionesPageHeader'
import { CubicacionesDeleteContractModal } from '@/components/features/cubicacion/CubicacionesDeleteContractModal'
import { useCubicacionesBaseData } from '@/components/features/cubicacion/useCubicacionesBaseData'
import { useCubicacionesContracts } from '@/components/features/cubicacion/useCubicacionesContracts'
import { useCreateContractModal } from '@/components/features/cubicacion/useCreateContractModal'

export default function CubicacionesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { project, contractors } = useCubicacionesBaseData(projectId)
  const { contracts, loading, deleteTargetId, totals, setDeleteTargetId, handleDeleteContract } = useCubicacionesContracts(projectId)
  const { showForm, form, saving, formError, setForm, openCreateModal, closeCreateModal, handleCreateContract } = useCreateContractModal(projectId)

  return (
    <div className="space-y-5">
      <CubicacionesPageHeader
        projectId={projectId}
        projectName={project?.name || 'Proyecto'}
        onCreateContract={openCreateModal}
      />
      <CubicacionesSummaryCards acordado={totals.acordado} acumulado={totals.acumulado} pendiente={totals.pendiente} />
      <ContractsTable
        loading={loading}
        contracts={contracts}
        onOpen={(contractId: string) => navigate(`/proyectos/${projectId}/cubicaciones/${contractId}`)}
        onDelete={setDeleteTargetId}
        onCreateFirst={openCreateModal}
      />
      <CubicacionesDeleteContractModal
        contractId={deleteTargetId}
        onConfirmDelete={handleDeleteContract}
        onClose={() => setDeleteTargetId(null)}
      />
      <CreateContractModal
        open={showForm}
        contractors={contractors}
        form={form}
        saving={saving}
        error={formError}
        onChange={setForm}
        onSubmit={handleCreateContract}
        onClose={closeCreateModal}
      />
    </div>
  )
}
