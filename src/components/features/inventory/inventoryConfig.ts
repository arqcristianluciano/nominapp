import type { AddMovementInput } from '@/services/inventoryService'

export type InventoryTab = 'stock' | 'movements'

export const EMPTY_ITEM_FORM = {
  name: '',
  unit: 'unid',
  current_stock: 0,
  min_stock: 10,
  unit_cost: 0,
  material_catalog_id: null as string | null,
}

export type InventoryMovementFormState = Pick<
  AddMovementInput,
  | 'item_id'
  | 'type'
  | 'quantity'
  | 'date'
  | 'notes'
  | 'supplier_id'
  | 'budget_category_id'
  | 'budget_item_id'
  | 'purchase_order_id'
  | 'unit_cost'
>

export const EMPTY_MOVEMENT_FORM: InventoryMovementFormState = {
  item_id: '',
  type: 'in',
  quantity: 1,
  date: new Date().toISOString().split('T')[0],
  supplier_id: null,
  notes: '',
  budget_category_id: null,
  budget_item_id: null,
  purchase_order_id: null,
  unit_cost: null,
}
