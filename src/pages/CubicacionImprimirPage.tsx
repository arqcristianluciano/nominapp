import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { contractService } from '@/services/cubicationService'
import type { ContractWithContractor } from '@/services/cubicationService'
import type { ContractPartida, ContractCorte, ContractAdelanto } from '@/types/database'
import {
  ContractAdvancesTable,
  ContractCutsTable,
  ContractPartidasTable,
  ContractPrintHeader,
  ContractPrintSignatures,
  ContractPrintSummary,
  ContractPrintTopBar,
} from '@/components/features/cubicacion/ContractPrintSections'

export default function CubicacionImprimirPage() {
  const { projectId, contratoId } = useParams<{ projectId: string; contratoId: string }>()
  const [contrato, setContrato] = useState<ContractWithContractor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (contratoId) contractService.getById(contratoId).then(setContrato).finally(() => setLoading(false))
  }, [contratoId])

  if (loading) return <div className="p-8 text-sm">Cargando...</div>
  if (!contrato) return <div className="p-8 text-sm">Contrato no encontrado.</div>

  const partidas: ContractPartida[] = contrato.partidas ?? []
  const cortes: ContractCorte[] = contrato.cortes ?? []
  const adelantos: ContractAdelanto[] = contrato.adelantos ?? []

  const acordado = partidas.reduce((s, p) => s + p.agreed_quantity * p.unit_price, 0)
  const acumulado = cortes.reduce((s, c) => s + c.amount, 0)
  const retenido = cortes.reduce((s, c) => s + c.retention_amount, 0)
  const adelantosTotal = adelantos.reduce((s, a) => s + a.amount, 0)

  const printDate = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })

  function acumuladoPartida(pid: string) { return cortes.filter((c) => c.partida_id === pid).reduce((s, c) => s + c.amount, 0) }

  return (
    <div>
      <ContractPrintTopBar projectId={projectId!} contratoId={contratoId!} />

      <div className="max-w-4xl mx-auto p-8 print:p-6 space-y-6 text-sm">
        <ContractPrintHeader contrato={contrato} printDate={printDate} />
        <ContractPrintSummary acordado={acordado} acumulado={acumulado} retenido={retenido} />
        <ContractPartidasTable partidas={partidas} acumuladoPorPartida={acumuladoPartida} acordado={acordado} acumulado={acumulado} />
        <ContractCutsTable cortes={cortes} partidas={partidas} />
        <ContractAdvancesTable adelantos={adelantos} total={adelantosTotal} />
        <ContractPrintSignatures contractorName={contrato.contractor?.name || 'Contratista'} />
      </div>
    </div>
  )
}
