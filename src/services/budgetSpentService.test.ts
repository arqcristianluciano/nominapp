import { beforeAll, describe, expect, it } from 'vitest'
import { budgetSpentService } from './budgetSpentService'
import { supabase } from '@/lib/supabase'

const projectId = `p_spent_${Date.now()}`
const catA = `cat_spent_a_${Date.now()}`
const catB = `cat_spent_b_${Date.now()}`
const approvedPeriod = `per_appr_${Date.now()}`
const draftPeriod = `per_draft_${Date.now()}`

beforeAll(async () => {
  await supabase.from('projects').insert({ id: projectId, name: 'P', code: 'P' })
  await supabase.from('budget_categories').insert([
    { id: catA, project_id: projectId, code: '01', name: 'Preliminares', sort_order: 0, budgeted_amount: 100000 },
    { id: catB, project_id: projectId, code: '02', name: 'Demoliciones', sort_order: 1, budgeted_amount: 50000 },
  ])
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
  await supabase
    .from('material_invoices')
    .insert([
      {
        payroll_period_id: approvedPeriod,
        supplier_id: 's1',
        description: 'Cemento',
        amount: 3000,
        budget_category_id: catB,
      },
    ])
})

describe('budgetSpentService.getImputedCostByCategory', () => {
  it('suma mano de obra y materiales de reportes comprometidos por capítulo', async () => {
    const map = await budgetSpentService.getImputedCostByCategory(projectId)
    // Sólo el reporte aprobado: 5 × 1000 en Preliminares.
    expect(map[catA]).toBe(5000)
    // Factura de material en Demoliciones.
    expect(map[catB]).toBe(3000)
  })

  it('excluye reportes en borrador del rango de fechas', async () => {
    const map = await budgetSpentService.getImputedCostByCategory(projectId, {
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
    })
    // El reporte en borrador (10 × 2000) NO se incluye aunque cae en el rango.
    expect(map[catA]).toBe(5000)
  })
})
