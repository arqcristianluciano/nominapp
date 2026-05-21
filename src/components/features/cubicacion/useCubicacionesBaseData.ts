import { useEffect, useMemo, useState } from 'react'
import * as Sentry from '@sentry/react'
import { useProjectStore } from '@/stores/projectStore'
import { contractorService } from '@/services/contractorService'
import { useToast } from '@/components/ui/Toast'
import type { Contractor } from '@/types/database'

export function useCubicacionesBaseData(projectId: string | undefined) {
  const { projects, fetchProjects } = useProjectStore()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const { error: toastError } = useToast()

  useEffect(() => {
    if (!projects.length) {
      void fetchProjects()
    }
    contractorService
      .getAll()
      .then(setContractors)
      .catch((err) => {
        console.error('[useCubicacionesBaseData] cargar contractors fallo', err)
        Sentry.captureException(err, { tags: { area: 'useCubicacionesBaseData' } })
        toastError('No se pudieron cargar los contratistas')
      })
  }, [fetchProjects, projects.length, toastError])

  const project = useMemo(
    () => projects.find((currentProject) => currentProject.id === projectId),
    [projectId, projects]
  )

  return { project, contractors }
}
