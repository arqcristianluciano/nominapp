import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { useProjectStore } from '@/stores/projectStore'
import { mercadoBudgetService, mercadoBudgetLineService } from '@/services/mercadoBudgetService'
import { contractorService } from '@/services/contractorService'
import { InsumosImportCard } from '@/components/features/insumos/InsumosImportCard'
import { InsumosSummary } from '@/components/features/insumos/InsumosSummary'
import { InsumosLinesTable } from '@/components/features/insumos/InsumosLinesTable'
import { CreateContractFromLineModal } from '@/components/features/insumos/CreateContractFromLineModal'
import type { MercadoBudget, MercadoBudgetLine, MercadoCategory } from '@/types/mercadoBudget'
import type { Contractor } from '@/types/database'

export default function InsumosPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { projects, fetchProjects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)

  const [budget, setBudget] = useState<MercadoBudget | null>(null)
  const [lines, setLines] = useState<MercadoBudgetLine[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedLine, setSelectedLine] = useState<MercadoBudgetLine | null>(null)
  const [activeCategory, setActiveCategory] = useState<MercadoCategory | 'ALL'>('ALL')

  useEffect(() => {
    if (!projects.length) fetchProjects()
    contractorService.getAll().then(setContractors).catch((err) => console.error('InsumosPage contractors load failed', err))
  }, [projects.length, fetchProjects])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const b = await mercadoBudgetService.getByProject(projectId!)
      setBudget(b)
      if (b) {
        const l = await mercadoBudgetLineService.getByBudget(b.id)
        setLines(l)
      } else {
        setLines([])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) load()
  }, [projectId, load])

  function handleImported() {
    setShowUpload(false)
    load()
  }

  function handleContractCreated(contractId: string) {
    setSelectedLine(null)
    load()
    navigate(`/proyectos/${projectId}/cubicaciones/${contractId}`)
  }

  const countByCategory = (['AJUSTES', 'MANO_DE_OBRA', 'EQUIPOS', 'MATERIALES'] as MercadoCategory[]).reduce(
    (acc, category) => ({ ...acc, [category]: lines.filter((line) => line.category === category).length }),
    {} as Record<MercadoCategory, number>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Breadcrumb items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: project?.name ?? 'Proyecto', to: `/proyectos/${projectId}` },
          { label: 'Presupuesto', to: `/proyectos/${projectId}/presupuesto` },
          { label: 'Insumos' },
        ]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app-text">Listado de Insumos</h1>
            <p className="text-sm text-app-muted mt-0.5">Presupuesto Mercado — origen de contratos de ajuste</p>
          </div>
          {budget && !showUpload && (
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover">
              <RefreshCw className="w-3.5 h-3.5" /> Reemplazar Excel
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-app-muted">Cargando...</div>
      ) : showUpload || !budget ? (
        <InsumosImportCard projectId={projectId!} hasExisting={!!budget} onImported={handleImported} onCancel={() => setShowUpload(false)} />
      ) : (
        <>
          <InsumosSummary budget={budget} lines={lines} countByCategory={countByCategory} />
          <InsumosLinesTable
            lines={lines}
            projectId={projectId!}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onCreateContract={setSelectedLine}
          />
        </>
      )}

      {selectedLine && (
        <CreateContractFromLineModal
          line={selectedLine}
          projectId={projectId!}
          contractors={contractors}
          onCreated={handleContractCreated}
          onClose={() => setSelectedLine(null)}
        />
      )}
    </div>
  )
}
