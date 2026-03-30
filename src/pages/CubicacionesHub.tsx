import { useEffect } from 'react'
import { Layers } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { HubPage } from '@/components/ui/HubPage'

export default function CubicacionesHub() {
  const { projects, loading, fetchProjects } = useProjectStore()
  useEffect(() => { fetchProjects() }, [fetchProjects])

  return (
    <HubPage
      title="Cubicaciones"
      description="Selecciona un proyecto para gestionar contratos de ajuste"
      icon={Layers}
      accentColor="amber"
      projects={projects.filter((p) => p.status === 'active')}
      loading={loading}
      getUrl={(id) => `/proyectos/${id}/cubicaciones`}
      featureLabel="Contratos de ajuste · Cortes · Adelantos"
    />
  )
}
