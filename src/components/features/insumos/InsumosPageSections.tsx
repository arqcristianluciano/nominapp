import { FileX, RefreshCw } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { CATEGORY_LABELS } from '@/types/mercadoBudget'
import type { Contractor } from '@/types/database'
import type { MercadoBudget, MercadoBudgetLine, MercadoCategory } from '@/types/mercadoBudget'
import { CreateContractFromLineModal } from './CreateContractFromLineModal'
import { InsumosImportCard } from './InsumosImportCard'
import { InsumosLinesTable } from './InsumosLinesTable'
import { InsumosSummary } from './InsumosSummary'
import { INSUMOS_CATEGORIES } from './insumosCategories'

type CategoryFilter = MercadoCategory | 'ALL'

function countByCategory(lines: MercadoBudgetLine[]) {
  return INSUMOS_CATEGORIES.reduce(
    (acc, category) => ({ ...acc, [category]: lines.filter((line) => line.category === category).length }),
    {} as Record<MercadoCategory, number>
  )
}

export function InsumosPageHeader({
  projectId,
  projectName,
  canReplaceExcel,
  onReplaceExcel,
}: {
  projectId: string
  projectName: string
  canReplaceExcel: boolean
  onReplaceExcel: () => void
}) {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: projectName, to: `/proyectos/${projectId}` }, { label: 'Presupuesto', to: `/proyectos/${projectId}/presupuesto` }, { label: 'Insumos' }]} />
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-app-text">Listado de Insumos</h1><p className="text-sm text-app-muted mt-0.5">Presupuesto Mercado — origen de contratos de ajuste</p></div>
        {canReplaceExcel && <button onClick={onReplaceExcel} className="flex items-center gap-2 px-3 py-2 text-sm text-app-muted border border-app-border rounded-lg hover:bg-app-hover"><RefreshCw className="w-3.5 h-3.5" />Reemplazar Excel</button>}
      </div>
    </div>
  )
}

function InsumosCategoryFilter({
  lines,
  activeCategory,
  onCategoryChange,
}: {
  lines: MercadoBudgetLine[]
  activeCategory: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
}) {
  const totals = countByCategory(lines)

  return (
    <div className="flex items-center gap-1 px-4 py-2.5 border-b border-app-border bg-app-bg overflow-x-auto">
      {(['ALL', ...INSUMOS_CATEGORIES] as const).map((category) => (
        <button key={category} onClick={() => onCategoryChange(category)} className={`px-2.5 py-1 rounded text-[10px] font-semibold whitespace-nowrap transition-colors ${activeCategory === category ? 'bg-blue-600 text-white' : 'text-app-muted hover:bg-app-hover'}`}>
          {category === 'ALL' ? `Todas (${lines.length})` : `${CATEGORY_LABELS[category]} (${totals[category]})`}
        </button>
      ))}
    </div>
  )
}

function InsumosCategoryEmptyState() {
  return (
    <div className="py-10 text-center">
      <FileX className="w-8 h-8 text-app-subtle mx-auto mb-2" />
      <p className="text-sm text-app-muted">Sin líneas en esta categoría</p>
    </div>
  )
}

export function InsumosContentSection({
  projectId,
  budget,
  lines,
  loading,
  showUpload,
  activeCategory,
  onCategoryChange,
  onCreateContract,
  onImported,
  onCancelUpload,
}: {
  projectId: string
  budget: MercadoBudget | null
  lines: MercadoBudgetLine[]
  loading: boolean
  showUpload: boolean
  activeCategory: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
  onCreateContract: (line: MercadoBudgetLine) => void
  onImported: () => void
  onCancelUpload: () => void
}) {
  if (loading) return <div className="text-sm text-app-muted">Cargando...</div>
  if (showUpload || !budget) return <InsumosImportCard projectId={projectId} hasExisting={!!budget} onImported={onImported} onCancel={onCancelUpload} />

  const filteredLines = activeCategory === 'ALL' ? lines : lines.filter((line) => line.category === activeCategory)

  return (
    <>
      <InsumosSummary budget={budget} lines={lines} countByCategory={countByCategory(lines)} />
      <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
        <InsumosCategoryFilter lines={lines} activeCategory={activeCategory} onCategoryChange={onCategoryChange} />
        {filteredLines.length === 0 ? <InsumosCategoryEmptyState /> : <InsumosLinesTable lines={filteredLines} projectId={projectId} onCreateContract={onCreateContract} />}
      </div>
    </>
  )
}

export function InsumosModalsSection({
  projectId,
  contractors,
  selectedLine,
  onClose,
  onCreated,
}: {
  projectId: string
  contractors: Contractor[]
  selectedLine: MercadoBudgetLine | null
  onClose: () => void
  onCreated: (contractId: string) => void
}) {
  if (!selectedLine) return null

  return <CreateContractFromLineModal line={selectedLine} projectId={projectId} contractors={contractors} onCreated={onCreated} onClose={onClose} />
}
