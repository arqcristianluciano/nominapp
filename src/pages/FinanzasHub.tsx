import { useEffect } from 'react'
import { Landmark } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { HubPage } from '@/components/ui/HubPage'

export default function FinanzasHub() {
  const { projects, loading, fetchProjects } = useProjectStore()
  useEffect(() => { fetchProjects() }, [fetchProjects])

  return (
    <HubPage
      title="Control Financiero"
      description="Selecciona un proyecto para ver su libro diario, CxP y cheques"
      icon={Landmark}
      accentColor="blue"
      projects={projects.filter((p) => p.status === 'active')}
      loading={loading}
      getUrl={(id) => `/proyectos/${id}/control`}
      featureLabel="Libro diario · CxP · Cheques"
    />
  )
}
