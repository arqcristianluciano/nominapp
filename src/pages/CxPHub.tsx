import { useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { HubPage } from '@/components/ui/HubPage'

export default function CxPHub() {
  const { projects, loading, fetchProjects } = useProjectStore()
  useEffect(() => { fetchProjects() }, [fetchProjects])

  return (
    <HubPage
      title="Cuentas por Pagar"
      description="Selecciona un proyecto para ver sus cuentas por pagar"
      icon={CreditCard}
      accentColor="red"
      projects={projects.filter((p) => p.status === 'active')}
      loading={loading}
      getUrl={(id) => `/cxp/${id}`}
      featureLabel="Facturas pendientes · Proveedores"
      footerLink={{ label: 'Ver consolidado de todas las obras →', to: '/cxp/consolidado' }}
    />
  )
}
