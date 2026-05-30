import { BudgetPreciosTab, BudgetPresupuestoTab } from '@/components/features/budget/BudgetDetailSections'
import type { BudgetRow } from '@/hooks/useBudgetDetail'
import type { BudgetItem, PriceListItem } from '@/types/database'

type Props = {
  tab: 'presupuesto' | 'precios'
  projectId: string
  loading: boolean
  rows: BudgetRow[]
  spentTotal: number
  budgetedTotal: number
  itemsByCategory: Record<string, BudgetItem[]>
  priceList: PriceListItem[]
  onAddItem: (data: Omit<BudgetItem, 'id'>) => Promise<void>
  onUpdateItem: (id: string, categoryId: string, changes: Partial<Omit<BudgetItem, 'id'>>) => Promise<void>
  onDeleteItem: (id: string, categoryId: string) => Promise<void>
  onEditBudgetAmount: (id: string, amount: number) => void
  onDeleteCategory?: (categoryId: string) => Promise<void>
  onAddPrice: (item: Omit<PriceListItem, 'id'>) => Promise<void>
  onUpdatePrice: (id: string, changes: Partial<Omit<PriceListItem, 'id'>>) => Promise<void>
  onDeletePrice: (id: string) => Promise<void>
  onReplicatePrices: () => void
}

export function BudgetDetailTabContent({
  tab,
  projectId,
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
  onDeleteCategory,
  onAddPrice,
  onUpdatePrice,
  onDeletePrice,
  onReplicatePrices,
}: Props) {
  if (tab === 'presupuesto') {
    return (
      <BudgetPresupuestoTab
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
        onDeleteCategory={onDeleteCategory}
      />
    )
  }

  return (
    <BudgetPreciosTab
      projectId={projectId}
      items={priceList}
      onAdd={onAddPrice}
      onUpdate={onUpdatePrice}
      onDelete={onDeletePrice}
      onReplicate={onReplicatePrices}
    />
  )
}
