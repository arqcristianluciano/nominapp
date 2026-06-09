import { describe, expect, it } from 'vitest'
import { inventoryService, InventoryError } from './inventoryService'
import { lotService } from './lotService'
import { supabase } from '@/lib/supabase'

const projectId = 'p1000000-0000-0000-0000-000000000001'
const budgetItemId = `b00000aa-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`

async function createItem(name: string, stock = 0): Promise<{ id: string }> {
  return inventoryService.createItem({
    project_id: projectId,
    name,
    unit: 'sacos',
    current_stock: stock,
    min_stock: 5,
    unit_cost: 0,
  })
}

describe('inventoryService - regla 7.4 (salida imputada a partida)', () => {
  it('rechaza salida sin budget_item_id ni budget_category_id', async () => {
    const item = await createItem(`material-${Date.now()}`, 10)
    await expect(
      inventoryService.addMovement({
        item_id: item.id,
        project_id: projectId,
        type: 'out',
        quantity: 1,
        date: '2026-05-01',
      }),
    ).rejects.toBeInstanceOf(InventoryError)
  })

  it('acepta salida con budget_item_id', async () => {
    const item = await createItem(`material-${Date.now() + 1}`, 10)
    await expect(
      inventoryService.addMovement({
        item_id: item.id,
        project_id: projectId,
        type: 'out',
        quantity: 1,
        date: '2026-05-01',
        budget_item_id: budgetItemId,
      }),
    ).resolves.not.toThrow()
  })

  it('acepta entradas sin partida (regla 7.4 sólo aplica a salidas)', async () => {
    const item = await createItem(`material-${Date.now() + 2}`, 0)
    await expect(
      inventoryService.addMovement({
        item_id: item.id,
        project_id: projectId,
        type: 'in',
        quantity: 5,
        date: '2026-05-01',
        unit_cost: 100,
      }),
    ).resolves.not.toThrow()
  })
})

describe('inventoryService - regla 7.5 (bloqueo stock negativo)', () => {
  it('bloquea salida que dejaría stock negativo', async () => {
    const item = await createItem(`material-${Date.now() + 3}`, 3)
    await expect(
      inventoryService.addMovement({
        item_id: item.id,
        project_id: projectId,
        type: 'out',
        quantity: 5,
        date: '2026-05-01',
        budget_item_id: budgetItemId,
      }),
    ).rejects.toThrow(/Stock insuficiente/)
  })

  it('permite override del Director con motivo y deja registro de auditoría', async () => {
    const item = await createItem(`material-${Date.now() + 4}`, 1)
    await expect(
      inventoryService.addMovement({
        item_id: item.id,
        project_id: projectId,
        type: 'out',
        quantity: 5,
        date: '2026-05-01',
        budget_item_id: budgetItemId,
        override: { motivo: 'Urgencia obra', actor: 'gerente' },
      }),
    ).resolves.not.toThrow()

    const { data: approvals } = await supabase.from('approvals').select('*').eq('action', 'override_stock')
    expect((approvals ?? []).length).toBeGreaterThanOrEqual(1)
  })
})

describe('inventoryService - costo promedio ponderado', () => {
  it('valora la salida al costo promedio del material cuando no se indica costo', async () => {
    const item = await createItem(`salida-costo-${Date.now()}`, 100)
    await inventoryService.updateItem(item.id, { unit_cost: 850 })

    // Salida sin unit_cost explícito (como la registra el formulario de salidas).
    await inventoryService.addMovement({
      item_id: item.id,
      project_id: projectId,
      type: 'out',
      quantity: 10,
      date: '2026-05-02',
      budget_item_id: budgetItemId,
    })

    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('item_id', item.id)
      .eq('type', 'out')
    expect(movements?.length).toBe(1)
    // El movimiento queda valorado al costo promedio vigente: 10 × 850 = 8500 de consumo.
    expect(Number(movements?.[0]?.unit_cost)).toBe(850)
  })

  it('una salida de reversa de recepción (con orden de compra) queda sin costo', async () => {
    const item = await createItem(`reversa-costo-${Date.now()}`, 100)
    await inventoryService.updateItem(item.id, { unit_cost: 850 })

    await inventoryService.addMovement({
      item_id: item.id,
      project_id: projectId,
      type: 'out',
      quantity: 10,
      date: '2026-05-02',
      budget_item_id: budgetItemId,
      purchase_order_id: 'oc-reversa-test',
    })

    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('item_id', item.id)
      .eq('type', 'out')
    // La reversa no es consumo: no se valora, para no inflar el gasto de la partida.
    expect(movements?.[0]?.unit_cost).toBeNull()
  })

  it('recalcula unit_cost ponderado tras entrada', async () => {
    const item = await createItem(`material-${Date.now() + 5}`, 10)
    // Setear costo inicial 100
    await inventoryService.updateItem(item.id, { unit_cost: 100 })

    // Entrada de 10 unidades a 200
    await inventoryService.addMovement({
      item_id: item.id,
      project_id: projectId,
      type: 'in',
      quantity: 10,
      date: '2026-05-01',
      unit_cost: 200,
    })

    const items = await inventoryService.getItems(projectId)
    const updated = items.find((i) => i.id === item.id)
    // (10*100 + 10*200) / 20 = 150
    expect(updated?.unit_cost).toBe(150)
  })
})

describe('inventoryService - consumo FIFO de lotes en salidas', () => {
  it('descuenta del lote más antiguo primero', async () => {
    const item = await createItem(`fifo-${Date.now()}`, 0)
    await lotService.create({
      item_id: item.id,
      lot_number: 'A',
      quantity: 5,
      unit_cost: 1,
      received_date: '2026-01-01',
      expiry_date: null,
      notes: null,
    })
    await lotService.create({
      item_id: item.id,
      lot_number: 'B',
      quantity: 5,
      unit_cost: 1,
      received_date: '2026-02-01',
      expiry_date: null,
      notes: null,
    })
    await inventoryService.updateItem(item.id, { current_stock: 10 })

    // Salida de 7 → consume el lote A completo (5) y 2 del lote B.
    await inventoryService.addMovement({
      item_id: item.id,
      project_id: projectId,
      type: 'out',
      quantity: 7,
      date: '2026-03-01',
      budget_item_id: budgetItemId,
    })

    const lots = await lotService.list(item.id)
    expect(lots.find((l) => l.lot_number === 'A')?.quantity).toBe(0)
    expect(lots.find((l) => l.lot_number === 'B')?.quantity).toBe(3)
  })
})

describe('lotService - listByProject', () => {
  it('lista lotes activos con nombre de material, ordenados por vencimiento y sin los agotados', async () => {
    const pid = `p1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`
    const item = await inventoryService.createItem({
      project_id: pid,
      name: 'Pintura X',
      unit: 'gal',
      current_stock: 0,
      min_stock: 0,
      unit_cost: 0,
    })
    const mk = (lot_number: string, quantity: number, expiry_date: string) =>
      lotService.create({
        item_id: item.id,
        lot_number,
        quantity,
        unit_cost: 1,
        received_date: '2026-01-01',
        expiry_date,
        notes: null,
      })
    await mk('L1', 3, '2026-12-01')
    await mk('L2', 0, '2026-06-01') // agotado → excluido
    await mk('L3', 5, '2026-03-01') // vence antes → primero

    const result = await lotService.listByProject(pid)
    expect(result.map((l) => l.lot_number)).toEqual(['L3', 'L1'])
    expect(result[0].item_name).toBe('Pintura X')
    expect(result[0].item_unit).toBe('gal')
  })
})
