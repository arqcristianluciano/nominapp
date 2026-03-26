import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, RefreshCw, ExternalLink, FileX } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { mercadoBudgetService, mercadoBudgetLineService } from '@/services/mercadoBudgetService'
import { contractorService } from '@/services/contractorService'
import { MercadoExcelUpload } from '@/components/features/insumos/MercadoExcelUpload'
import { CreateContractFromLineModal } from '@/components/features/insumos/CreateContractFromLineModal'
import { CATEGORY_LABELS, CATEGORY_COLORS, CUBICABLE_CATEGORIES } from '@/types/mercadoBudget'
import type { MercadoBudget, MercadoBudgetLine, MercadoCategory } from '@/types/mercadoBudget'
import type { Contractor } from '@/types/database'
import { formatRD } from '@/utils/currency'

const CATEGORIES: MercadoCategory[] = ['AJUSTES', 'MANO_DE_OBRA', 'EQUIPOS', 'MATERIALES']

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
    contractorService.getAll().then(setContractors).catch(() => {})
  }, [projects.length, fetchProjects])

  useEffect(() => {
    if (projectId) load()
  }, [projectId])

  async function load() {
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
  }

  function handleImported() {
    setShowUpload(false)
    load()
  }

  function handleContractCreated(contractId: string) {
    setSelectedLine(null)
    load()
    navigate(`/proyectos/${projectId}/cubicaciones/${contractId}`)
  }

  const filtered = activeCategory === 'ALL' ? lines : lines.filter((l) => l.category === activeCategory)
  const countByCategory = CATEGORIES.reduce(
    (acc, c) => ({ ...acc, [c]: lines.filter((l) => l.category === c).length }),
    {} as Record<MercadoCategory, number>
  )

  const grandTotal = (budget?.total_ajustes ?? 0) + (budget?.total_equipos ?? 0) + (budget?.total_mano_obra ?? 0) + (budget?.total_materiales ?? 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link to={`/proyectos/${projectId}`} className="flex items-center gap-1 text-sm text-app-muted hover:text-app-text mb-2">
          <ArrowLeft className="w-4 h-4" /> {project?.name || 'Proyecto'}
        </Link>
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
        <div className="bg-app-surface border border-app-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-app-text">
              {budget ? 'Reemplazar presupuesto Mercado' : 'Importar presupuesto Mercado'}
            </h2>
          </div>
          <MercadoExcelUpload projectId={projectId!} hasExisting={!!budget} onImported={handleImported} />
          {budget && (
            <button onClick={() => setShowUpload(false)} className="mt-3 text-xs text-app-muted hover:text-app-text">
              Cancelar
            </button>
          )}
        </div>
      ) : (
        <>
          {/* KPIs totales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => {
              const total = cat === 'AJUSTES' ? budget.total_ajustes
                : cat === 'EQUIPOS' ? budget.total_equipos
                : cat === 'MANO_DE_OBRA' ? budget.total_mano_obra
                : budget.total_materiales
              const contracted = lines.filter((l) => l.category === cat && l.contract_id).length
              return (
                <div key={cat} className="bg-app-surface border border-app-border rounded-xl p-4">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mb-1 ${CATEGORY_COLORS[cat]}`}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <p className="text-lg font-semibold text-app-text">{formatRD(total)}</p>
                  <p className="text-[11px] text-app-muted mt-0.5">{countByCategory[cat]} líneas · {contracted} cubicadas</p>
                </div>
              )
            })}
          </div>

          {/* Metadata del archivo */}
          <div className="flex items-center gap-3 text-xs text-app-muted">
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
            <span>{budget.file_name}</span>
            <span>·</span>
            <span>Total presupuestado: <strong className="text-app-text">{formatRD(grandTotal)}</strong></span>
            <span>·</span>
            <span>Importado {new Date(budget.imported_at).toLocaleDateString('es-DO')}</span>
          </div>

          {/* Tabla de líneas */}
          <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
            {/* Filtros de categoría */}
            <div className="flex items-center gap-1 px-4 py-2.5 border-b border-app-border bg-app-bg overflow-x-auto">
              {(['ALL', ...CATEGORIES] as const).map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'text-app-muted hover:bg-app-hover'}`}>
                  {cat === 'ALL' ? `Todas (${lines.length})` : `${CATEGORY_LABELS[cat]} (${countByCategory[cat]})`}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="py-10 text-center">
                <FileX className="w-8 h-8 text-app-subtle mx-auto mb-2" />
                <p className="text-sm text-app-muted">Sin líneas en esta categoría</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-app-bg border-b border-app-border">
                      <th className="px-3 py-2.5 text-left font-semibold text-app-muted uppercase text-[10px]">Categoría</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-app-muted uppercase text-[10px]">Cód.</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-app-muted uppercase text-[10px]">Descripción</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-app-muted uppercase text-[10px]">Und</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">Cant. Pres.</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">P.U. Pres.</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">Total Pres.</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">Acordado</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-app-muted uppercase text-[10px]">Desvío</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-app-muted uppercase text-[10px]">Contrato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {filtered.map((line) => {
                      const isCubicable = CUBICABLE_CATEGORIES.includes(line.category)
                      const hasContract = !!line.contract_id
                      const agreedTotal = (line.agreed_quantity ?? 0) * (line.agreed_unit_price ?? 0)
                      const deviation = hasContract ? agreedTotal - line.budgeted_total : null
                      const deviationPct = hasContract && line.budgeted_total > 0 ? (deviation! / line.budgeted_total) * 100 : null

                      return (
                        <tr key={line.id} className="hover:bg-app-hover">
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${CATEGORY_COLORS[line.category]}`}>
                              {CATEGORY_LABELS[line.category]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-app-subtle font-mono">{line.code || '—'}</td>
                          <td className="px-3 py-2 text-app-text max-w-[200px] truncate" title={line.description}>{line.description}</td>
                          <td className="px-3 py-2 text-center text-app-muted">{line.unit}</td>
                          <td className="px-3 py-2 text-right text-app-muted">{line.budgeted_quantity}</td>
                          <td className="px-3 py-2 text-right text-app-muted">{formatRD(line.budgeted_unit_price)}</td>
                          <td className="px-3 py-2 text-right font-medium text-app-text">{formatRD(line.budgeted_total)}</td>
                          <td className="px-3 py-2 text-right text-app-muted">
                            {hasContract ? <span className="font-medium text-app-text">{formatRD(agreedTotal)}</span> : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {deviation !== null ? (
                              <span className={`font-semibold ${deviation > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                {deviation >= 0 ? '+' : ''}{deviationPct!.toFixed(1)}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {hasContract ? (
                              <Link to={`/proyectos/${projectId}/cubicaciones/${line.contract_id}`}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
                                Ver <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : isCubicable ? (
                              <button onClick={() => setSelectedLine(line)}
                                className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-semibold hover:bg-blue-700">
                                Crear contrato
                              </button>
                            ) : (
                              <span className="text-[10px] text-app-subtle">Referencia</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
