import { useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { HubPage } from '@/components/ui/HubPage'

export default function PresupuestoHub() {
  const { projects, loading, fetchProjects } = useProjectStore()
  useEffect(() => { fetchProjects() }, [fetchProjects])

  return (
    <HubPage
      title="Presupuesto"
      description="Selecciona un proyecto para ver presupuesto vs real"
      icon={BarChart3}
      accentColor="purple"
      projects={projects.filter((p) => p.status === 'active')}
      loading={loading}
      getUrl={(id) => `/proyectos/${id}/presupuesto`}
      featureLabel="Categorías · Presupuesto vs Real"
    />
  )
}
