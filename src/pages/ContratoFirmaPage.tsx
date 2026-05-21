import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { contractService } from '@/services/cubicationService'
import type { ContractWithContractor } from '@/services/cubicationService'
import type { ContractPartida } from '@/types/database'
import { ContratoFirmaDocument, ContratoFirmaTopBar } from '@/components/features/cubicacion/ContratoFirmaSections'

export default function ContratoFirmaPage() {
  const { projectId, contratoId } = useParams<{ projectId: string; contratoId: string }>()
  const [contrato, setContrato] = useState<ContractWithContractor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (contratoId) contractService.getById(contratoId).then(setContrato).finally(() => setLoading(false))
  }, [contratoId])

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-sm text-app-muted">
        Cargando contrato...
      </div>
    )
  if (!contrato)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-sm text-app-muted">
        Contrato no encontrado.
      </div>
    )

  const partidas: ContractPartida[] = contrato.partidas ?? []
  const totalAcordado = partidas.reduce((s, p) => s + p.agreed_quantity * p.unit_price, 0)
  const printDate = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-app-bg print:bg-white">
      <ContratoFirmaTopBar projectId={projectId!} contratoId={contratoId!} />
      <ContratoFirmaDocument
        contrato={contrato}
        partidas={partidas}
        totalAcordado={totalAcordado}
        printDate={printDate}
      />
    </div>
  )
}
