import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { HardHat } from 'lucide-react'
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
import { buildProjectSummary, type Cubication, type LaborItem, type ProjectLite } from '@/components/features/contractors/detailTypes'

export default function ContractorDetail() {
  const { contractorId } = useParams<{ contractorId: string }>()
  const [contractor, setContractor] = useState<Contractor | null>(null)
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
      const found = ctrs.find((c) => c.id === contractorId) ?? null
      setContractor(found)
      setItems(laborItems as unknown as LaborItem[])
      setCubications(cubs as unknown as Cubication[])
      setProjectMap(pmap as Record<string, ProjectLite>)
      setDocs(docList)
    } finally {
      setLoading(false)
    }
  }, [contractorId])

  useEffect(() => { load() }, [load])

  const billableItems = items.filter((i) => !i.is_advance_deduction)
  const totalPaid = billableItems.reduce((s, i) => s + i.subtotal, 0)
  const totalContracted = cubications.reduce((s, c) => s + (c.adjusted_budget || 0), 0)
  const byProject = buildProjectSummary(billableItems, projectMap)

  if (loading) {
    return <div className="text-sm text-app-muted p-6">Cargando...</div>
  }

  if (!contractor) {
    return (
      <div className="p-6">
        <p className="text-sm text-app-muted">Contratista no encontrado.</p>
        <Link to="/contratistas" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">← Volver</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Breadcrumb items={[
          { label: 'Contratistas', to: '/contratistas' },
          { label: contractor.name },
        ]} />
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
