import { supabase } from '@/lib/supabase'

export interface MaterialCatalogItem {
  id: string
  code: string
  description: string
  unit: string
  default_min_stock: number
  category: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MaterialPriceStat {
  material_catalog_id: string
  code: string
  description: string
  unit: string
  avg_unit_cost: number
  min_unit_cost: number
  max_unit_cost: number
  last_unit_cost: number
  last_supplier: string | null
  total_movements: number
}

function nextCode(existing: MaterialCatalogItem[], prefix = 'MAT'): string {
  const used = new Set(
    existing
      .map((m) => m.code)
      .filter((c) => c.startsWith(`${prefix}-`))
      .map((c) => parseInt(c.slice(prefix.length + 1), 10))
      .filter((n) => !isNaN(n)),
  )
  let i = 1
  while (used.has(i)) i++
  return `${prefix}-${String(i).padStart(4, '0')}`
}

export const materialsCatalogService = {
  async getAll(includeInactive = false): Promise<MaterialCatalogItem[]> {
    const query = supabase.from('materials_catalog').select('*').order('code')
    const { data, error } = includeInactive ? await query : await query.eq('is_active', true)
    if (error) throw error
    return (data ?? []) as MaterialCatalogItem[]
  },

  async getById(id: string): Promise<MaterialCatalogItem | null> {
    const { data, error } = await supabase.from('materials_catalog').select('*').eq('id', id).single()
    if (error) return null
    return data as MaterialCatalogItem
  },

  async create(input: {
    code?: string
    description: string
    unit: string
    default_min_stock?: number
    category?: string | null
    notes?: string | null
  }): Promise<MaterialCatalogItem> {
    let code = input.code?.trim()
    if (!code) {
      const all = await this.getAll(true)
      code = nextCode(all)
    }
    const { data, error } = await supabase
      .from('materials_catalog')
      .insert({
        code,
        description: input.description,
        unit: input.unit,
        default_min_stock: input.default_min_stock ?? 0,
        category: input.category ?? null,
        notes: input.notes ?? null,
        is_active: true,
      })
      .select()
      .single()
    if (error) throw error
    return data as MaterialCatalogItem
  },

  async update(id: string, updates: Partial<MaterialCatalogItem>): Promise<void> {
    const { error } = await supabase.from('materials_catalog').update(updates).eq('id', id)
    if (error) throw error
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from('materials_catalog').update({ is_active: isActive }).eq('id', id)
    if (error) throw error
  },

  // Histórico transversal cross-proyecto por material.
  async getPriceHistory(materialCatalogId: string): Promise<MaterialPriceStat | null> {
    const catalog = await this.getById(materialCatalogId)
    if (!catalog) return null

    // 1) Movimientos en inventario que apuntan a inventory_items con este catálogo.
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('material_catalog_id', materialCatalogId)
    const itemIds = (items ?? []).map((it: { id: string }) => it.id)
    if (itemIds.length === 0) return zeroStat(catalog)

    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('unit_cost, quantity, date, supplier_id, supplier:suppliers(name)')
      .eq('type', 'in')
      .in('item_id', itemIds)
      .order('date', { ascending: false })

    const rows = (movements ?? []) as Array<{
      unit_cost: number | null
      quantity: number | null
      date: string
      supplier?: { name?: string | null } | null
    }>
    const withCost = rows.filter((r) => r.unit_cost != null && r.unit_cost > 0)
    if (withCost.length === 0) return zeroStat(catalog)

    const costs = withCost.map((r) => Number(r.unit_cost ?? 0))
    // Promedio PONDERADO por cantidad: una compra grande pesa mas que una pequena.
    // Si no hay cantidades validas, se usa el promedio simple como resguardo.
    const totalQty = withCost.reduce((sum, r) => sum + Math.max(0, Number(r.quantity ?? 0)), 0)
    const avg =
      totalQty > 0
        ? withCost.reduce((sum, r) => sum + Number(r.unit_cost ?? 0) * Math.max(0, Number(r.quantity ?? 0)), 0) / totalQty
        : costs.reduce((a, b) => a + b, 0) / costs.length
    const min = Math.min(...costs)
    const max = Math.max(...costs)
    const last = withCost[0]

    return {
      material_catalog_id: materialCatalogId,
      code: catalog.code,
      description: catalog.description,
      unit: catalog.unit,
      avg_unit_cost: round2(avg),
      min_unit_cost: round2(min),
      max_unit_cost: round2(max),
      last_unit_cost: round2(Number(last.unit_cost ?? 0)),
      last_supplier: last.supplier?.name ?? null,
      total_movements: withCost.length,
    }
  },
}

function zeroStat(catalog: MaterialCatalogItem): MaterialPriceStat {
  return {
    material_catalog_id: catalog.id,
    code: catalog.code,
    description: catalog.description,
    unit: catalog.unit,
    avg_unit_cost: 0,
    min_unit_cost: 0,
    max_unit_cost: 0,
    last_unit_cost: 0,
    last_supplier: null,
    total_movements: 0,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
