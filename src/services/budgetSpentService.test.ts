import { beforeAll, describe, expect, it } from 'vitest'
import { budgetSpentService } from './budgetSpentService'
import { supabase } from '@/lib/supabase'

const projectId = `p_spent_${Date.now()}`
const catA = `cat_spent_a_${Date.now()}`
const catB = `cat_spent_b_${Date.now()}`
const itemA = `item_spent_a_${Date.now()}`
const approvedPeriod = `per_appr_${Date.now()}`
const draftPeriod = `per_draft_${Date.now()}`

beforeAll(async () => {
  await supabase.from('projects').insert({ id: projectId, name: 'P', code: 'P' })
  await supabase.from('budget_categories').insert([
    { id: catA, project_id: projectId, code: '01', name: 'Preliminares', sort_order: 0, budgeted_amount: 100000 },
    { id: catB, project_id: projectId, code: '02', name: 'Demoliciones', sort_order: 1, budgeted_amount: 50000 },
  ])
  // Partida bajo el capítulo A, para imputaciones a nivel de budget_item.
  await supabase.from('budget_items').insert({
    id: itemA,
    budget_category_id: catA,
    description: 'Limpieza',
    unit: 'm2',
    quantity: 100,
    unit_price: 50,
    sort_order: 0,
  })
  // Reporte comprometido (aprobado) — debe contar.
  await supabase.from('payroll_periods').insert({
    id: approvedPeriod,
    project_id: projectId,
    period_number: 1,
    report_date: '2026-05-10',
    status: 'approved',
  })
  // Reporte en borrador — NO debe contar.
  await supabase.from('payroll_periods').insert({
    id: draftPeriod,
    project_id: projectId,
    period_number: 2,
    report_date: '2026-05-20',
    status: 'draft',
  })

  await supabase.from('labor_line_items').insert([
    // 5 × 1000 = 5000 imputado a Preliminares (caso del bug reportado).
    {
      payroll_period_id: approvedPeriod,
      contractor_id: 'c1',
      description: 'AYUDANTE',
      quantity: 5,
      unit: 'Dia',
      unit_price: 1000,
      budget_category_id: catA,
      sort_order: 1,
    },
    // Sin imputación: no debe sumar a ningún capítulo.
    {
      payroll_period_id: approvedPeriod,
      contractor_id: 'c1',
      description: 'PEON',
      quantity: 2,
      unit: 'Dia',
      unit_price: 800,
      budget_category_id: null,
      sort_order: 2,
    },
    // En borrador: no debe contar.
    {
      payroll_period_id: draftPeriod,
      contractor_id: 'c1',
      description: 'MAESTRO',
      quantity: 10,
      unit: 'Dia',
      unit_price: 2000,
      budget_category_id: catA,
      sort_order: 1,
    },
  ])
  await supabase.from('material_invoices').insert([
    {
      payroll_period_id: approvedPeriod,
      supplier_id: 's1',
      description: 'Cemento',
      amount: 3000,
      budget_category_id: catB,
    },
  ])

  // Salidas de almacén imputadas: una por capítulo (catB) y otra por partida (itemA → catA).
  await supabase.from('inventory_movements').insert([
    {
      project_id: projectId,
      type: 'out',
      quantity: 2,
      unit_cost: 250,
      date: '2026-05-12',
      budget_category_id: catB,
      budget_item_id: null,
    },
    {
      project_id: projectId,
      type: 'out',
      quantity: 4,
      unit_cost: 100,
      date: '2026-05-12',
      budget_category_id: null,
      budget_item_id: itemA,
    },
    // Entrada (type='in'): NO debe contar como gasto.
    {
      project_id: projectId,
      type: 'in',
      quantity: 10,
      unit_cost: 1000,
      date: '2026-05-12',
      budget_category_id: catB,
      budget_item_id: null,
    },
  ])
})

describe('budgetSpentService.getImputedCostByCategory', () => {
  it('suma mano de obra, materiales e inventario imputados por capítulo', async () => {
    const map = await budgetSpentService.getImputedCostByCategory(projectId)
    // Preliminares: 5×1000 (mano de obra) + 4×100 (salida de almacén vía partida) = 5400.
    expect(map[catA]).toBe(5400)
    // Demoliciones: factura 3000 + salida 2×250 = 3500. La entrada (type='in') no cuenta.
    expect(map[catB]).toBe(3500)
  })

  it('excluye reportes en borrador del rango de fechas', async () => {
    const map = await budgetSpentService.getImputedCostByCategory(projectId, {
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    })
    // El reporte en borrador (10 × 2000) NO se incluye aunque cae en el rango.
    // catA = 5000 (mano de obra) + 400 (inventario) = 5400.
    expect(map[catA]).toBe(5400)
  })
})
