import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { contractorService } from '@/services/contractorService'
import type { Contractor } from '@/types/database'

export function useCubicacionesBaseData(projectId: string | undefined) {
  const { projects, fetchProjects } = useProjectStore()
  const [contractors, setContractors] = useState<Contractor[]>([])

  useEffect(() => {
    if (!projects.length) {
      void fetchProjects()
    }
    contractorService.getAll().then(setContractors).catch(() => {})
  }, [fetchProjects, projects.length])

  const project = useMemo(
    () => projects.find((currentProject) => currentProject.id === projectId),
    [projectId, projects]
  )

  return { project, contractors }
}
