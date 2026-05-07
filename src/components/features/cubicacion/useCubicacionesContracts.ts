import { useCallback, useEffect, useMemo, useState } from 'react'
import { contractService } from '@/services/cubicationService'
import type { ContractSummary } from '@/services/cubicationService'

const EMPTY_TOTALS = { acordado: 0, acumulado: 0, pendiente: 0 }

function sumContracts(contracts: ContractSummary[]) {
  return contracts.reduce(
    (acc, contract) => ({
      acordado: acc.acordado + contract.acordado,
      acumulado: acc.acumulado + contract.acumulado,
      pendiente: acc.pendiente + contract.pendiente,
    }),
    EMPTY_TOTALS
  )
}

export function useCubicacionesContracts(projectId: string | undefined) {
  const [contracts, setContracts] = useState<ContractSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const reloadContracts = useCallback(async () => {
    if (!projectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const nextContracts = await contractService.getByProject(projectId)
      setContracts(nextContracts)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const handleDeleteContract = useCallback(
    async (contractId: string) => {
      await contractService.delete(contractId)
      await reloadContracts()
      setDeleteTargetId(null)
    },
    [reloadContracts]
  )

  useEffect(() => {
    void reloadContracts()
  }, [reloadContracts])

  const totals = useMemo(() => sumContracts(contracts), [contracts])

  return {
    contracts,
    loading,
    deleteTargetId,
    totals,
    setDeleteTargetId,
    handleDeleteContract,
  }
}
