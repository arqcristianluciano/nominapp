import { ArrowUpCircle, Package, Plus } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

export function InventoryPageHeader({
  projectId,
  projectName,
  onOpenMovement,
  onOpenItem,
}: {
  projectId: string
  projectName: string
  onOpenMovement: () => void
  onOpenItem: () => void
}) {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Proyectos', to: '/proyectos' }, { label: projectName, to: `/proyectos/${projectId}` }, { label: 'Inventario' }]} />
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Package className="w-5 h-5 text-blue-600" /><h1 className="text-xl font-bold text-app-text">Inventario de Materiales</h1></div><div className="flex gap-2"><button onClick={onOpenMovement} className="flex items-center gap-2 px-3 py-2 border border-app-border text-app-muted rounded-lg text-sm hover:bg-app-hover transition-colors"><ArrowUpCircle className="w-4 h-4" />Movimiento</button><button onClick={onOpenItem} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />Material</button></div></div>
    </div>
  )
}

export function InventoryLoadingState() {
  return <div className="text-center py-8 text-app-muted text-sm">Cargando...</div>
}
