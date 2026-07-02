import { FileUp, Trash2, History } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { BudgetHierarchyTable } from '@/components/features/budget/BudgetHierarchyTable'
import { BudgetSummaryCards } from '@/components/features/budget/BudgetSummaryCards'
import PriceListPanel from '@/components/features/budget/PriceListPanel'
import type { BudgetCategory, BudgetItem, PriceListItem, Project } from '@/types/database'

export function BudgetDetailHeader({
  project,
  projectId,
  tab,
  onOpenImport,
  emptyCount = 0,
  onCleanEmpty,
  onOpenHistory,
}: {
  project: Project
  projectId: string
  tab: 'presupuesto' | 'precios'
  onOpenImport: () => void
  emptyCount?: number
  onCleanEmpty?: () => void
  onOpenHistory?: () => void
}) {
  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Proyectos', to: '/proyectos' },
          { label: project.name, to: `/proyectos/${projectId}` },
          { label: 'Presupuesto' },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Presupuesto</h1>
          <p className="text-sm text-app-muted mt-0.5">
            {project.name} · {project.code}
          </p>
        </div>
        {tab === 'presupuesto' && (
          <div className="flex items-center gap-2">
            {emptyCount > 0 && onCleanEmpty && (
              <button
                onClick={onCleanEmpty}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-700 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                title="Eliminar partidas vacías (sin subpartidas, monto ni gasto)"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpiar partidas vacías ({emptyCount})
              </button>
            )}
            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
                title="Ver y guardar versiones del presupuesto"
              >
                <History className="w-3.5 h-3.5" /> Historial
              </button>
            )}
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
            >
              <FileUp className="w-3.5 h-3.5" /> Importar Excel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function BudgetPresupuestoTab({
  loading,
  rows,
  spentByItem,
  spentTotal,
  budgetedTotal,
  itemsByCategory,
  priceList,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onEditBudgetAmount,
  onDeleteCategory,
}: {
  loading: boolean
  rows: Array<{ category: BudgetCategory; spent: number; budgeted: number }>
  spentByItem: Record<string, number>
  spentTotal: number
  budgetedTotal: number
  itemsByCategory: Record<string, BudgetItem[]>
  priceList: unknown[]
  onAddItem: (data: Omit<BudgetItem, 'id'>) => Promise<void>
  onUpdateItem: (id: string, categoryId: string, changes: Partial<Omit<BudgetItem, 'id'>>) => Promise<void>
  onDeleteItem: (id: string, categoryId: string) => Promise<void>
  onEditBudgetAmount: (id: string, amount: number) => void
  onDeleteCategory?: (categoryId: string) => Promise<void>
}) {
  return (
    <>
      <BudgetSummaryCards spent={spentTotal} budgeted={budgetedTotal} />
      <BudgetHierarchyTable
        loading={loading}
        rows={rows}
        spentByItem={spentByItem}
        spentTotal={spentTotal}
        budgetedTotal={budgetedTotal}
        itemsByCategory={itemsByCategory}
        priceList={priceList}
        onAddItem={onAddItem}
        onUpdateItem={onUpdateItem}
        onDeleteItem={onDeleteItem}
        onEditBudgetAmount={onEditBudgetAmount}
        onDeleteCategory={onDeleteCategory}
      />
    </>
  )
}

export function BudgetPreciosTab({
  projectId,
  items,
  onAdd,
  onUpdate,
  onDelete,
  onReplicate,
}: {
  projectId: string
  items: PriceListItem[]
  onAdd: (item: Omit<PriceListItem, 'id'>) => Promise<void>
  onUpdate: (id: string, changes: Partial<Omit<PriceListItem, 'id'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReplicate: () => void
}) {
  return (
    <PriceListPanel
      projectId={projectId}
      items={items}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onReplicate={onReplicate}
    />
  )
}
