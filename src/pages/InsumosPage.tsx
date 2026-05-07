import { useParams, useNavigate } from 'react-router-dom'
import {
  InsumosContentSection,
  InsumosModalsSection,
  InsumosPageHeader,
} from '@/components/features/insumos/InsumosPageSections'
import { useInsumosPageController } from '@/components/features/insumos/useInsumosPageController'

export default function InsumosPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const {
    projects,
    budget,
    lines,
    contractors,
    loading,
    showUpload,
    selectedLine,
    activeCategory,
    setShowUpload,
    setSelectedLine,
    setActiveCategory,
    handleImported,
    handleContractCreated,
  } = useInsumosPageController(projectId)
  if (!projectId) return null
  const projectName = projects.find((project) => project.id === projectId)?.name ?? 'Proyecto'

  return (
    <div className="space-y-5">
      <InsumosPageHeader projectId={projectId} projectName={projectName} canReplaceExcel={!!budget && !showUpload} onReplaceExcel={() => setShowUpload(true)} />
      <InsumosContentSection projectId={projectId} budget={budget} lines={lines} loading={loading} showUpload={showUpload} activeCategory={activeCategory} onCategoryChange={setActiveCategory} onCreateContract={setSelectedLine} onImported={handleImported} onCancelUpload={() => setShowUpload(false)} />
      <InsumosModalsSection projectId={projectId} contractors={contractors} selectedLine={selectedLine} onClose={() => setSelectedLine(null)} onCreated={(contractId) => {
        handleContractCreated()
        navigate(`/proyectos/${projectId}/cubicaciones/${contractId}`)
      }} />
    </div>
  )
}
