import type { InventoryMovement } from '@/services/inventoryService'

export type InventoryTab = 'stock' | 'movements'

export const EMPTY_ITEM_FORM = {
  name: '',
  unit: 'unid',
  current_stock: 0,
  min_stock: 10,
  unit_cost: 0,
}

export const EMPTY_MOVEMENT_FORM: Pick<InventoryMovement, 'item_id' | 'type' | 'quantity' | 'date' | 'supplier_id' | 'notes'> = {
  item_id: '',
  type: 'in',
  quantity: 1,
  date: new Date().toISOString().split('T')[0],
  supplier_id: null,
  notes: '',
}
