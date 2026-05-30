import { describe, expect, it } from 'vitest'
import { inventoryService, InventoryError } from './inventoryService'
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
