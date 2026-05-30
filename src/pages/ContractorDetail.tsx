import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { HardHat, Users } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { contractorService } from '@/services/contractorService'
import { contractorDocService, type ContractorDocument } from '@/services/contractorDocService'
import { ContractorDocsSection } from '@/components/features/contractors/ContractorDocsSection'
import type { Contractor } from '@/types/database'
import { ContractorProfileCard } from '@/components/features/contractors/ContractorProfileCard'
import { ContractorKpiGrid } from '@/components/features/contractors/ContractorKpiGrid'
import { ContractorProjectsSummary } from '@/components/features/contractors/ContractorProjectsSummary'
import { ContractorCubicationsList } from '@/components/features/contractors/ContractorCubicationsList'
import { ContractorLaborItemsTable } from '@/components/features/contractors/ContractorLaborItemsTable'
import {
  buildProjectSummary,
  type Cubication,
  type LaborItem,
  type ProjectLite,
} from '@/components/features/contractors/detailTypes'

type ContractorWithHierarchy = Contractor & { parent_contractor_id?: string | null }

const safeNumber = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function ContractorDetail() {
  const { contractorId } = useParams<{ contractorId: string }>()
  const [contractor, setContractor] = useState<ContractorWithHierarchy | null>(null)
  const [allContractors, setAllContractors] = useState<ContractorWithHierarchy[]>([])
  const [items, setItems] = useState<LaborItem[]>([])
  const [cubications, setCubications] = useState<Cubication[]>([])
  const [projectMap, setProjectMap] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState<ContractorDocument[]>([])

  const load = useCallback(async () => {
    if (!contractorId) return
    setLoading(true)
    try {
      const [ctrs, { items: laborItems, cubications: cubs, projectMap: pmap }, docList] = await Promise.all([
        contractorService.getAll(),
        contractorService.getHistory(contractorId),
        contractorDocService.getByContractor(contractorId),
      ])
      const ctrsHier = ctrs as ContractorWithHierarchy[]
      const found = ctrsHier.find((c) => c.id === contractorId) ?? null
      setContractor(found)
      setAllContractors(ctrsHier)
      setItems(laborItems as unknown as LaborItem[])
      setCubications(cubs as unknown as Cubication[])
      setProjectMap(pmap as Record<string, ProjectLite>)
      setDocs(docList)
    } finally {
      setLoading(false)
    }
  }, [contractorId])

  useEffect(() => {
    load()
  }, [load])

  const billableItems = items.filter((i) => !i.is_advance_deduction)
  const totalPaid = billableItems.reduce((s, i) => s + safeNumber(i.subtotal), 0)
  const totalContracted = cubications.reduce((s, c) => s + safeNumber(c.adjusted_budget), 0)
  const byProject = buildProjectSummary(billableItems, projectMap)

  const parentContractor = useMemo<ContractorWithHierarchy | null>(() => {
    if (!contractor?.parent_contractor_id) return null
    return allContractors.find((c) => c.id === contractor.parent_contractor_id) ?? null
  }, [contractor, allContractors])

  const subContractors = useMemo<ContractorWithHierarchy[]>(() => {
    if (!contractor) return []
    return allContractors.filter((c) => c.parent_contractor_id === contractor.id)
  }, [contractor, allContractors])

  if (loading) {
    return <div className="text-sm text-app-muted p-6">Cargando...</div>
  }

  if (!contractor) {
    return (
      <div className="p-6">
        <p className="text-sm text-app-muted">Contratista no encontrado.</p>
        <Link to="/contratistas" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
          ← Volver
        </Link>
      </div>
    )
  }

  const breadcrumbItems = parentContractor
    ? [
        { label: 'Contratistas', to: '/contratistas' },
        { label: parentContractor.name, to: `/contratistas/${parentContractor.id}` },
        { label: contractor.name },
      ]
    : [{ label: 'Contratistas', to: '/contratistas' }, { label: contractor.name }]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="text-2xl font-semibold text-app-text">{contractor.name}</h1>
        <p className="text-sm text-app-muted">{contractor.specialty || 'Sin especialidad'}</p>
      </div>

      <ContractorProfileCard contractor={contractor} />
      <ContractorKpiGrid
        totalPaid={totalPaid}
        totalContracted={totalContracted}
        projectCount={Object.keys(byProject).length}
        reportCount={new Set(items.map((item) => item.payroll_period?.id).filter(Boolean)).size}
      />

      {subContractors.length > 0 && (
        <section className="bg-app-surface rounded-xl border border-app-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-app-muted" />
            <h2 className="text-sm font-semibold text-app-text">Sub-contratistas ({subContractors.length})</h2>
          </div>
          <ul className="divide-y divide-app-border">
            {subContractors.map((sc) => (
              <li key={sc.id} className="py-2 first:pt-0 last:pb-0">
                <Link
                  to={`/contratistas/${sc.id}`}
                  className="flex items-center justify-between gap-3 text-sm hover:text-blue-600 transition-colors"
                >
                  <span className="font-medium text-app-text truncate">{sc.name}</span>
                  <span className="text-xs text-app-muted truncate">{sc.specialty || 'Sin especialidad'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ContractorProjectsSummary projects={Object.values(byProject)} />
      <ContractorCubicationsList cubications={cubications} projectMap={projectMap} />
      <ContractorLaborItemsTable items={items} totalPaid={totalPaid} />

      {items.length === 0 && cubications.length === 0 && (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center">
          <HardHat className="w-10 h-10 text-app-subtle mx-auto mb-3" />
          <p className="text-sm text-app-muted">Este contratista no tiene historial de pagos aún.</p>
        </div>
      )}

      <ContractorDocsSection contractorId={contractorId!} docs={docs} onChange={setDocs} />
    </div>
  )
}
