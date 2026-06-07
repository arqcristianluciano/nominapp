import * as Sentry from '@sentry/react'
import { supabase } from '@/lib/supabase'
import { approvalsService } from '@/services/approvalsService'

const RECEIPT_BUCKET = 'receipt-attachments'

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
  lot_id: string | null
  attachment_path: string | null
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
  lot_id?: string | null
  attachment_path?: string | null
  override?: { motivo: string; actor: string } | null
}

export class InventoryError extends Error {
  code: 'OUT_REQUIRES_PARTIDA' | 'INSUFFICIENT_STOCK' | 'ITEM_NOT_FOUND' | 'INVALID_QUANTITY' | 'HAS_STOCK_OR_MOVEMENTS'
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

  // Busca un material del proyecto y, si no existe, lo crea. Usado por la
  // recepción de órdenes de compra para dar entrada a stock sin obligar al
  // almacenista a pre-registrar el material. Reusa por catálogo (si la línea lo
  // trae) o por nombre. Al crear, hereda unidad y stock mínimo del catálogo y lo
  // enlaza para alimentar el histórico de precios (migración 011).
  async findOrCreateItem(input: {
    project_id: string
    name: string
    unit?: string | null
    unit_cost?: number | null
    material_catalog_id?: string | null
  }): Promise<InventoryItem> {
    const name = input.name.trim()

    // 1. Si la línea trae catálogo, reusa el material del proyecto enlazado a él.
    if (input.material_catalog_id) {
      const { data: byCatalog } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('project_id', input.project_id)
        .eq('material_catalog_id', input.material_catalog_id)
        .limit(1)
      if (byCatalog && byCatalog.length > 0) return byCatalog[0] as InventoryItem
    }

    // 2. Reusa por nombre (sin distinguir mayúsculas).
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('project_id', input.project_id)
      .ilike('name', name)
      .limit(1)
    if (existing && existing.length > 0) return existing[0] as InventoryItem

    // 3. Resuelve el catálogo: por id (si vino) o por descripción.
    const catalogQuery = supabase.from('materials_catalog').select('id, unit, default_min_stock')
    const { data: catalogMatch } = input.material_catalog_id
      ? await catalogQuery.eq('id', input.material_catalog_id).limit(1)
      : await catalogQuery.ilike('description', name).eq('is_active', true).limit(1)
    const catalog = catalogMatch && catalogMatch.length > 0 ? catalogMatch[0] : null

    return this.createItem({
      project_id: input.project_id,
      name,
      unit: input.unit?.trim() || catalog?.unit || 'UD',
      current_stock: 0,
      min_stock: Number(catalog?.default_min_stock ?? 0),
      unit_cost: input.unit_cost ?? 0,
      material_catalog_id: input.material_catalog_id ?? catalog?.id ?? null,
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
    // C2: refuse to delete if the item still has stock or any movements.
    // DB-side complement: add ON DELETE RESTRICT on inventory_movements.item_id
    // and inventory_lots.item_id (replace current ON DELETE CASCADE).
    const { data: item, error: fetchErr } = await supabase
      .from('inventory_items')
      .select('id, current_stock')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr
    if (item && Number(item.current_stock) !== 0) {
      throw new InventoryError(
        'HAS_STOCK_OR_MOVEMENTS',
        'No se puede eliminar un material que tiene stock. Primero ajusta el stock a cero.',
      )
    }
    const { count, error: mvCountErr } = await supabase
      .from('inventory_movements')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', id)
    if (mvCountErr) throw mvCountErr
    if ((count ?? 0) > 0) {
      throw new InventoryError(
        'HAS_STOCK_OR_MOVEMENTS',
        'No se puede eliminar un material que tiene historial de movimientos.',
      )
    }
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
    // Validaciones previas al RPC (código de error en TS antes de ir a la DB).
    if (!(Number(movement.quantity) > 0)) {
      throw new InventoryError('INVALID_QUANTITY', 'La cantidad del movimiento debe ser mayor que cero.')
    }
    if (movement.type === 'out' && !movement.budget_item_id && !movement.budget_category_id) {
      throw new InventoryError(
        'OUT_REQUIRES_PARTIDA',
        'Toda salida de almacén debe imputarse a una partida del presupuesto.',
      )
    }

    // Leer el stock actual SOLO para el breadcrumb de Sentry; el RPC hace la
    // verdadera lectura atómica con FOR UPDATE dentro de la transacción.
    const { data: itemSnap } = await supabase
      .from('inventory_items')
      .select('id, current_stock, unit_cost')
      .eq('id', movement.item_id)
      .single()

    const currentStock = Number((itemSnap as { current_stock?: number } | null)?.current_stock ?? 0)
    const delta = movement.type === 'in' ? movement.quantity : -movement.quantity
    const estimatedNewStock = currentStock + delta

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
        estimatedNewStock,
        override: Boolean(movement.override),
        override_motivo: movement.override?.motivo ?? null,
        override_actor: movement.override?.actor ?? null,
      },
    })

    // Llamada atómica al RPC de Postgres: inserta el movimiento y actualiza
    // stock + costo promedio ponderado en una sola transacción con FOR UPDATE.
    // El RPC devuelve el id del movimiento insertado o lanza una excepción con
    // códigos INSUFFICIENT_STOCK / ITEM_NOT_FOUND / OUT_REQUIRES_PARTIDA.
    const { data: movementId, error: rpcErr } = await supabase.rpc('rpc_inventory_add_movement', {
      p_item_id: movement.item_id,
      p_project_id: movement.project_id,
      p_type: movement.type,
      p_quantity: movement.quantity,
      p_date: movement.date,
      p_notes: movement.notes ?? null,
      p_supplier_id: movement.supplier_id ?? null,
      p_budget_item_id: movement.budget_item_id ?? null,
      p_budget_category_id: movement.budget_category_id ?? null,
      p_purchase_order_id: movement.purchase_order_id ?? null,
      p_unit_cost: movement.unit_cost ?? null,
      p_created_by: movement.created_by ?? null,
      p_lot_id: movement.lot_id ?? null,
      p_attachment_path: movement.attachment_path ?? null,
      p_override_motivo: movement.override?.motivo ?? null,
    })

    if (rpcErr) {
      // Traduce los códigos de error del RPC a InventoryError para mantener la
      // misma interfaz que tenía el código anterior.
      const msg: string = (rpcErr as { message?: string }).message ?? ''
      if (msg.startsWith('INSUFFICIENT_STOCK')) {
        throw new InventoryError('INSUFFICIENT_STOCK', msg.replace('INSUFFICIENT_STOCK: ', ''))
      }
      if (msg.startsWith('ITEM_NOT_FOUND')) {
        throw new InventoryError('ITEM_NOT_FOUND', msg.replace('ITEM_NOT_FOUND: ', ''))
      }
      if (msg.startsWith('OUT_REQUIRES_PARTIDA')) {
        throw new InventoryError('OUT_REQUIRES_PARTIDA', msg.replace('OUT_REQUIRES_PARTIDA: ', ''))
      }
      if (msg.startsWith('INVALID_QUANTITY')) {
        throw new InventoryError('INVALID_QUANTITY', msg.replace('INVALID_QUANTITY: ', ''))
      }
      throw rpcErr
    }

    // Consumo FIFO de lotes en las salidas (se hace en TS porque depende de
    // ordered_date y puede tocar múltiples filas de inventory_lots; el RPC ya
    // actualizó el stock total, aquí solo ajustamos los lotes individualmente).
    if (movement.type === 'out') {
      await consumeLotsFifo(movement.item_id, movement.quantity)
    }

    // Registro de auditoría de override.
    if (movement.override) {
      await approvalsService.log({
        entity_type: 'inventory_movement',
        entity_id: movementId as string,
        action: 'override_stock',
        actor_display_name: movement.override.actor,
        payload_before: { current_stock: currentStock },
        payload_after: { estimated_new_stock: estimatedNewStock, quantity_out: movement.quantity },
        motivo: movement.override.motivo,
        metadata: { item_id: movement.item_id, project_id: movement.project_id },
      })
    }
  },

  getLowStockItems(items: InventoryItem[]): InventoryItem[] {
    // C4: use strict < and skip items that have no meaningful min_stock threshold.
    return items.filter((i) => i.min_stock > 0 && i.current_stock < i.min_stock)
  },

  // Expuesto para pruebas/reuso: consumo FIFO de lotes de un material.
  consumeLotsFifo,

  // === CONDUCE / NOTA DE ENTREGA (bucket privado receipt-attachments) ===

  // Sube el conduce de una recepción. El path va prefijado por <projectId> para
  // que la RLS verifique el permiso al proyecto. Devuelve el path almacenado.
  async uploadReceiptAttachment(file: File, projectId: string, purchaseOrderId: string): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${projectId}/${purchaseOrderId}/${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (error) throw error
    return path
  },

  // URL firmada (privada) para ver/descargar el conduce.
  async getReceiptAttachmentUrl(path: string, expiresInSec = 60 * 60): Promise<string> {
    const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(path, expiresInSec)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('No signed URL returned')
    return data.signedUrl
  },
}

// Descuenta `quantity` de los lotes del material, del más antiguo al más nuevo
// (FIFO por received_date). No falla si los lotes no alcanzan a cubrir la
// cantidad: el stock puede provenir de entradas sin lote (legacy / sin lote).
async function consumeLotsFifo(itemId: string, quantity: number): Promise<void> {
  let remaining = Number(quantity)
  if (!(remaining > 0)) return
  const { data: lots } = await supabase
    .from('inventory_lots')
    .select('id, quantity')
    .eq('item_id', itemId)
    .gt('quantity', 0)
    .order('received_date', { ascending: true })
  for (const lot of (lots ?? []) as { id: string; quantity: number }[]) {
    if (remaining <= 0) break
    const available = Number(lot.quantity)
    const take = Math.min(available, remaining)
    await supabase
      .from('inventory_lots')
      .update({ quantity: available - take })
      .eq('id', lot.id)
    remaining -= take
  }
  // C1: if lots didn't cover the full quantity, the remainder came from
  // stock without a lot (legacy entries). Log a warning so it can be
  // investigated; this is not an error but indicates untracked stock.
  if (remaining > 0) {
    Sentry.addBreadcrumb({
      category: 'inventory',
      message: 'consumeLotsFifo: unmatched quantity after FIFO (stock without lot)',
      level: 'warning',
      data: { itemId, unmatchedQty: remaining },
    })
    console.warn(
      `[inventoryService] consumeLotsFifo: item ${itemId} — ${remaining} unit(s) consumed from stock without a lot`,
    )
  }
}
