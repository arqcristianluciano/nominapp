import * as Sentry from '@sentry/react'
import { supabase } from '@/lib/supabase'
import { approvalsService } from '@/services/approvalsService'

export interface InventoryItem {
  id: string
  project_id: string
  name: string
  unit: string
  current_stock: number
  min_stock: number
  unit_cost: number
  material_catalog_id?: string | null
  created_at: string
}

export interface InventoryMovement {
  id: string
  item_id: string
  project_id: string
  type: 'in' | 'out'
  quantity: number
  date: string
  supplier_id: string | null
  notes: string | null
  budget_item_id: string | null
  budget_category_id: string | null
  purchase_order_id: string | null
  unit_cost: number | null
  created_by: string | null
  override_motivo: string | null
  created_at: string
  item?: { id: string; name: string; unit: string }
}

export interface AddMovementInput {
  item_id: string
  project_id: string
  type: 'in' | 'out'
  quantity: number
  date: string
  notes?: string | null
  supplier_id?: string | null
  budget_item_id?: string | null
  budget_category_id?: string | null
  purchase_order_id?: string | null
  unit_cost?: number | null
  created_by?: string | null
  override?: { motivo: string; actor: string } | null
}

export class InventoryError extends Error {
  code: 'OUT_REQUIRES_PARTIDA' | 'INSUFFICIENT_STOCK' | 'ITEM_NOT_FOUND'
  constructor(code: InventoryError['code'], message: string) {
    super(message)
    this.code = code
    this.name = 'InventoryError'
  }
}

export const inventoryService = {
  async getItems(projectId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async createItem(item: Omit<InventoryItem, 'id' | 'created_at'>): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({ ...item, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateItem(id: string, item: Partial<InventoryItem>): Promise<void> {
    const { error } = await supabase.from('inventory_items').update(item).eq('id', id)
    if (error) throw error
  },

  // Busca un material del proyecto por nombre (sin distinguir mayúsculas) y, si
  // no existe, lo crea. Usado por la recepción de órdenes de compra para dar
  // entrada a stock sin obligar al almacenista a pre-registrar el material.
  // Al crear, intenta enlazarlo al catálogo global de materiales por descripción
  // para que la entrada alimente el histórico de precios (migración 011); no
  // crea entradas de catálogo nuevas (el catálogo es curado, con código único).
  async findOrCreateItem(input: {
    project_id: string
    name: string
    unit?: string | null
    unit_cost?: number | null
  }): Promise<InventoryItem> {
    const name = input.name.trim()
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('project_id', input.project_id)
      .ilike('name', name)
      .limit(1)
    if (existing && existing.length > 0) return existing[0] as InventoryItem

    const { data: catalogMatch } = await supabase
      .from('materials_catalog')
      .select('id, unit')
      .ilike('description', name)
      .eq('is_active', true)
      .limit(1)
    const catalog = catalogMatch && catalogMatch.length > 0 ? catalogMatch[0] : null

    return this.createItem({
      project_id: input.project_id,
      name,
      unit: input.unit?.trim() || catalog?.unit || 'UD',
      current_stock: 0,
      min_stock: 0,
      unit_cost: input.unit_cost ?? 0,
      material_catalog_id: catalog?.id ?? null,
    })
  },

  // Movimientos de inventario generados por una orden de compra (entradas de
  // recepción y, si las hubo, reversas). Usado para revertir una recepción.
  async getMovementsByPurchaseOrder(purchaseOrderId: string): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, item:inventory_items(id,name,unit)')
      .eq('purchase_order_id', purchaseOrderId)
      .order('date', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if (error) throw error
  },

  async getMovements(projectId: string): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, item:inventory_items(id,name,unit)')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async addMovement(movement: AddMovementInput): Promise<void> {
    // Regla 7.4: toda salida debe imputarse a una partida.
    if (movement.type === 'out' && !movement.budget_item_id && !movement.budget_category_id) {
      throw new InventoryError(
        'OUT_REQUIRES_PARTIDA',
        'Toda salida de almacén debe imputarse a una partida del presupuesto.',
      )
    }

    const { data: item } = await supabase
      .from('inventory_items')
      .select('id, current_stock, unit_cost')
      .eq('id', movement.item_id)
      .single()
    if (!item) throw new InventoryError('ITEM_NOT_FOUND', 'Material no encontrado.')

    const currentStock = Number(item.current_stock ?? 0)
    const currentCost = Number(item.unit_cost ?? 0)
    const delta = movement.type === 'in' ? movement.quantity : -movement.quantity
    const newStock = currentStock + delta

    // Regla 7.5: stock negativo bloqueado salvo override del Director con motivo.
    if (newStock < 0 && !movement.override) {
      throw new InventoryError(
        'INSUFFICIENT_STOCK',
        `Stock insuficiente: disponible ${currentStock}, solicitado ${movement.quantity}.`,
      )
    }

    Sentry.addBreadcrumb({
      category: 'inventory',
      message: movement.override
        ? `inventory ${movement.type} movement with override`
        : `inventory ${movement.type} movement`,
      level: movement.override ? 'warning' : 'info',
      data: {
        itemId: movement.item_id,
        projectId: movement.project_id,
        type: movement.type,
        quantity: movement.quantity,
        currentStock,
        newStock,
        override: Boolean(movement.override),
        override_motivo: movement.override?.motivo ?? null,
        override_actor: movement.override?.actor ?? null,
      },
    })

    const now = new Date().toISOString()
    const { data: inserted, error: mvErr } = await supabase
      .from('inventory_movements')
      .insert({
        item_id: movement.item_id,
        project_id: movement.project_id,
        type: movement.type,
        quantity: movement.quantity,
        date: movement.date,
        notes: movement.notes ?? null,
        supplier_id: movement.supplier_id ?? null,
        budget_item_id: movement.budget_item_id ?? null,
        budget_category_id: movement.budget_category_id ?? null,
        purchase_order_id: movement.purchase_order_id ?? null,
        unit_cost: movement.unit_cost ?? null,
        created_by: movement.created_by ?? null,
        override_motivo: movement.override?.motivo ?? null,
        created_at: now,
      })
      .select()
      .single()
    if (mvErr) throw mvErr

    // Recalcular costo promedio ponderado en entradas (sección 6.4 / punto 10).
    let nextCost = currentCost
    if (movement.type === 'in' && movement.unit_cost != null && movement.unit_cost > 0) {
      const incomingValue = movement.quantity * movement.unit_cost
      const currentValue = currentStock * currentCost
      const totalQty = currentStock + movement.quantity
      nextCost = totalQty > 0 ? (currentValue + incomingValue) / totalQty : movement.unit_cost
    }

    const { error: updateErr } = await supabase
      .from('inventory_items')
      .update({ current_stock: newStock, unit_cost: nextCost })
      .eq('id', movement.item_id)
    if (updateErr) throw updateErr

    if (movement.override) {
      await approvalsService.log({
        entity_type: 'inventory_movement',
        entity_id: (inserted as { id: string }).id,
        action: 'override_stock',
        actor_display_name: movement.override.actor,
        payload_before: { current_stock: currentStock },
        payload_after: { new_stock: newStock, quantity_out: movement.quantity },
        motivo: movement.override.motivo,
        metadata: { item_id: movement.item_id, project_id: movement.project_id },
      })
    }
  },

  getLowStockItems(items: InventoryItem[]): InventoryItem[] {
    return items.filter((i) => i.current_stock <= i.min_stock)
  },
}
