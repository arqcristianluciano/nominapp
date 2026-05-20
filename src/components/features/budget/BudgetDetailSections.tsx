import { FileUp } from 'lucide-react'
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
}: {
  project: Project
  projectId: string
  tab: 'presupuesto' | 'precios'
  onOpenImport: () => void
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
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
          >
            <FileUp className="w-3.5 h-3.5" /> Importar Excel
          </button>
        )}
      </div>
    </div>
  )
}

export function BudgetPresupuestoTab({
  loading,
  rows,
  spentTotal,
  budgetedTotal,
  itemsByCategory,
  priceList,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onEditBudgetAmount,
}: {
  loading: boolean
  rows: Array<{ category: BudgetCategory; spent: number; budgeted: number }>
  spentTotal: number
  budgetedTotal: number
  itemsByCategory: Record<string, BudgetItem[]>
  priceList: unknown[]
  onAddItem: (data: Omit<BudgetItem, 'id'>) => Promise<void>
  onUpdateItem: (id: string, categoryId: string, changes: Partial<Omit<BudgetItem, 'id'>>) => Promise<void>
  onDeleteItem: (id: string, categoryId: string) => Promise<void>
  onEditBudgetAmount: (id: string, amount: number) => void
}) {
  return (
    <>
      <BudgetSummaryCards spent={spentTotal} budgeted={budgetedTotal} />
      <BudgetHierarchyTable
        loading={loading}
        rows={rows}
        spentTotal={spentTotal}
        budgetedTotal={budgetedTotal}
        itemsByCategory={itemsByCategory}
        priceList={priceList}
        onAddItem={onAddItem}
        onUpdateItem={onUpdateItem}
        onDeleteItem={onDeleteItem}
        onEditBudgetAmount={onEditBudgetAmount}
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
