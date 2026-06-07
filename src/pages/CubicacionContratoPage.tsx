import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { contractService } from '@/services/cubicationService'
import { useProjectStore } from '@/stores/projectStore'
import { useToast } from '@/components/ui/Toast'
import { PartidaSection } from '@/components/features/cubicacion/PartidaSection'
import { CorteSection } from '@/components/features/cubicacion/CorteSection'
import { AdelantoSection } from '@/components/features/cubicacion/AdelantoSection'
import { PrestamoSection } from '@/components/features/cubicacion/PrestamoSection'
import {
  CubicacionContratoHeader,
  CubicacionContratoKpis,
  CubicacionContratoProgress,
  CubicacionContratoTabs,
  type CubicacionTab,
} from '@/components/features/cubicacion/CubicacionContratoSections'
import type { ContractWithContractor } from '@/services/cubicationService'
import type { ContractPartida, ContractCorte, ContractAdelanto } from '@/types/database'

export default function CubicacionContratoPage() {
  const { projectId, contratoId } = useParams<{ projectId: string; contratoId: string }>()
  const { projects, fetchProjects } = useProjectStore()
  const { error: toastError } = useToast()
  const [contrato, setContrato] = useState<ContractWithContractor | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<CubicacionTab>('partidas')

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projects.length) fetchProjects()
  }, [projects.length, fetchProjects])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setContrato(await contractService.getById(contratoId!))
    } catch (err) {
      console.warn('[CubicacionContratoPage] load failed', err)
      toastError('No se pudo cargar el contrato. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [contratoId, toastError])

  useEffect(() => {
    if (contratoId) load()
  }, [contratoId, load])

  if (loading) return <div className="text-sm text-app-muted p-6">Cargando contrato...</div>
  if (!contrato) return <div className="text-sm text-app-muted p-6">Contrato no encontrado.</div>

  const partidas: ContractPartida[] = contrato.partidas ?? []
  const cortes: ContractCorte[] = contrato.cortes ?? []
  const adelantos: ContractAdelanto[] = contrato.adelantos ?? []

  const nonDraftCortes = cortes.filter((c) => c.status !== 'draft')
  const acordado = partidas.reduce((s, p) => s + p.agreed_quantity * p.unit_price, 0)
  const acumulado = nonDraftCortes.reduce((s, c) => s + c.amount, 0)
  const retenido = nonDraftCortes.reduce((s, c) => s + c.retention_amount, 0)
  const adelantosTotal = adelantos.reduce((s, a) => s + a.amount, 0)
  const pendienteRaw = acordado - acumulado - adelantosTotal
  const pendiente = pendienteRaw < 0 ? 0 : pendienteRaw

  return (
    <div className="space-y-5">
      <CubicacionContratoHeader
        projectId={projectId!}
        contratoId={contratoId!}
        projectName={project?.name ?? 'Proyecto'}
        contrato={contrato}
        adelantosTotal={adelantosTotal}
      />
      <CubicacionContratoKpis
        acordado={acordado}
        acumulado={acumulado}
        pendiente={pendiente}
        retenido={retenido}
        retentionPercent={contrato.retention_percent}
      />
      <CubicacionContratoProgress acordado={acordado} acumulado={acumulado} />

      <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
        <CubicacionContratoTabs
          tab={tab}
          partidasCount={partidas.length}
          cortesCount={cortes.length}
          adelantosCount={adelantos.length}
          onChange={setTab}
        />
        <div className="p-5">
          {tab === 'partidas' && (
            <PartidaSection
              contractId={contratoId!}
              projectId={projectId!}
              partidas={partidas}
              cortes={cortes}
              onRefresh={load}
            />
          )}
          {tab === 'cortes' && (
            <CorteSection
              contractId={contratoId!}
              projectId={projectId!}
              contractorId={contrato.contractor_id}
              retentionPercent={contrato.retention_percent}
              partidas={partidas}
              cortes={cortes}
              onRefresh={load}
            />
          )}
          {tab === 'adelantos' && <AdelantoSection contractId={contratoId!} adelantos={adelantos} onRefresh={load} />}
          {tab === 'prestamos' && <PrestamoSection contractorId={contrato.contractor_id} />}
        </div>
      </div>
    </div>
  )
}
