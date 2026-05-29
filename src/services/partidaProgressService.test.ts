import { beforeAll, describe, expect, it } from 'vitest'
import { partidaProgressService } from './partidaProgressService'
import { supabase } from '@/lib/supabase'

const projectId = `p_prog_${Date.now()}`
const categoryId = `cat_prog_${Date.now()}`
const itemId = `item_prog_${Date.now()}`

beforeAll(async () => {
  await supabase.from('projects').insert({ id: projectId, name: 'P', code: 'P' })
  await supabase.from('budget_categories').insert({
    id: categoryId,
    project_id: projectId,
    code: '01',
    name: 'Estructura',
    sort_order: 0,
    budgeted_amount: 100000,
  })
  await supabase.from('budget_items').insert({
    id: itemId,
    budget_category_id: categoryId,
    description: 'Hormigón',
    unit: 'm3',
    quantity: 100,
    unit_price: 1000,
    sort_order: 0,
  })
})

describe('partidaProgressService', () => {
  it('addProgress requiere al menos partida o categoría', async () => {
    await expect(
      partidaProgressService.addProgress({
        project_id: projectId,
        cut_date: '2026-05-01',
        executed_quantity: 10,
      }),
    ).rejects.toThrow(/budget_item_id o budget_category_id/)
  })

  it('addProgress requiere quantity o percent', async () => {
    await expect(
      partidaProgressService.addProgress({
        project_id: projectId,
        budget_item_id: itemId,
        cut_date: '2026-05-01',
      }),
    ).rejects.toThrow(/executed_quantity o executed_percent/)
  })

  it('getMonthlyCubication calcula cubicado = qty × precio', async () => {
    await partidaProgressService.addProgress({
      project_id: projectId,
      budget_item_id: itemId,
      cut_date: '2026-05-15',
      executed_quantity: 25,
    })
    const rows = await partidaProgressService.getMonthlyCubication(projectId)
    const may = rows.find((r) => r.month === '2026-05')
    expect(may).toBeDefined()
    // 25 m3 × 1000 = 25000
    expect(may!.cubicado).toBe(25000)
  })

  it('getActualCostByPartida suma costos imputados y compara con presupuesto', async () => {
    const periodId = `pp_${Date.now()}`
    await supabase.from('payroll_periods').insert({
      id: periodId,
      project_id: projectId,
      period_number: 1,
      report_date: '2026-05-20',
      status: 'approved',
    })
    // Factura de materiales imputada a la partida (RD$ 4000)
    await supabase.from('material_invoices').insert({
      id: `mi_${Date.now()}`,
      payroll_period_id: periodId,
      supplier_id: 's_test',
      description: 'CEMENTO',
      amount: 4000,
      budget_item_id: itemId,
    })
    // Salida de almacén imputada a la partida (3 × 1000 = 3000)
    await supabase.from('inventory_movements').insert({
      id: `mv_${Date.now()}`,
      project_id: projectId,
      type: 'out',
      quantity: 3,
      unit_cost: 1000,
      budget_item_id: itemId,
    })

    const rows = await partidaProgressService.getActualCostByPartida(projectId)
    const row = rows.find((r) => r.budget_item_id === itemId)
    expect(row).toBeDefined()
    // presupuesto = 100 × 1000
    expect(row!.presupuesto).toBe(100000)
    // costo_real = 4000 (factura) + 3000 (salida)
    expect(row!.costo_real).toBe(7000)
    expect(row!.desviacion).toBe(7000 - 100000)
  })
})
