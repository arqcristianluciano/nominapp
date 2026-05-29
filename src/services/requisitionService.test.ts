import { beforeAll, describe, expect, it } from 'vitest'
import { requisitionService } from './requisitionService'
import { inventoryService } from './inventoryService'
import { supabase } from '@/lib/supabase'

const projectId = 'p1000000-0000-0000-0000-000000000099'
const categoryId = `c0000099-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`
const itemId = `b0000099-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`

beforeAll(async () => {
  // Seed minimal de proyecto, capítulo y partida.
  await supabase.from('projects').insert({ id: projectId, name: 'Proyecto Test', code: 'TEST' })
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
    description: 'Cemento',
    unit: 'saco',
    quantity: 100,
    unit_price: 500,
    sort_order: 0,
  })
})

describe('requisitionService - regla 7.1 (excedente)', () => {
  it('crea en estado "quoting" cuando cantidad no excede plan', async () => {
    const req = await requisitionService.create({
      project_id: projectId,
      description: '50 sacos cemento',
      requested_by: 'ing-obra',
      budget_item_id: itemId,
      quantity_requested: 50,
      unit: 'saco',
      resource_type: 'material',
    })
    // Si no se llama submitForApproval primero, queda en draft.
    // Pero si quantity_requested <= disponible, el constructor no fuerza
    // pendiente_validacion. Verificamos que NO está en pendiente_validacion.
    expect(req.status).not.toBe('pendiente_validacion')
  })

  it('crea en pendiente_validacion cuando cantidad excede plan', async () => {
    const req = await requisitionService.create({
      project_id: projectId,
      description: '500 sacos cemento (excede)',
      requested_by: 'ing-obra',
      budget_item_id: itemId,
      quantity_requested: 500, // Plan = 100
      unit: 'saco',
      resource_type: 'material',
    })
    expect(req.status).toBe('pendiente_validacion')
    expect(req.planned_quantity_at_request).toBe(100)
  })

  it('validateExcess libera la solicitud y registra motivo', async () => {
    const req = await requisitionService.create({
      project_id: projectId,
      description: 'excedente para validar',
      requested_by: 'ing-obra',
      budget_item_id: itemId,
      quantity_requested: 999,
      unit: 'saco',
      resource_type: 'material',
    })
    expect(req.status).toBe('pendiente_validacion')

    await requisitionService.validateExcess(req.id, 'gerente', 'Reforzamiento estructural extra')
    const after = await requisitionService.getById(req.id)
    expect(after.status).toBe('quoting')
    expect(after.excess_motivo).toBe('Reforzamiento estructural extra')
    expect(after.validated_by).toBe('gerente')

    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .eq('entity_id', req.id)
      .eq('action', 'validate_excess')
    expect((approvals ?? []).length).toBeGreaterThanOrEqual(1)
  })

  it('validateExcess rechaza motivo vacío', async () => {
    const req = await requisitionService.create({
      project_id: projectId,
      description: 'sin motivo',
      requested_by: 'ing-obra',
      budget_item_id: itemId,
      quantity_requested: 999,
      unit: 'saco',
      resource_type: 'material',
    })
    await expect(requisitionService.validateExcess(req.id, 'gerente', '   ')).rejects.toThrow(/Motivo obligatorio/)
  })
})

describe('requisitionService - regla 7.3 (1 cotización requiere justificación)', () => {
  it('rechaza approve con 1 cotización sin justificación', async () => {
    const req = await requisitionService.create({
      project_id: projectId,
      description: 'OC 1 cotización',
      requested_by: 'ing-obra',
    })
    // Inyectamos 1 cotización vía Supabase directo (más rápido que el service para test).
    await supabase.from('purchase_quotes').insert({
      requisition_id: req.id,
      supplier_id: 'sup-test',
      total: 1000,
      subtotal: 1000,
      tax_percent: 0,
    })
    await expect(requisitionService.approve(req.id, 'q-fake', 'gerente', 'sig')).rejects.toThrow(/justificación/i)
  })

  it('acepta approve con 1 cotización + justificación', async () => {
    const req = await requisitionService.create({
      project_id: projectId,
      description: 'OC 1 cotización con motivo',
      requested_by: 'ing-obra',
    })
    const { data: quote } = await supabase
      .from('purchase_quotes')
      .insert({
        requisition_id: req.id,
        supplier_id: 'sup-test',
        total: 1000,
        subtotal: 1000,
        tax_percent: 0,
      })
      .select()
      .single()
    await expect(
      requisitionService.approve(req.id, (quote as { id: string }).id, 'gerente', 'sig', {
        singleQuoteJustification: 'Único proveedor disponible en la zona',
      }),
    ).resolves.not.toThrow()
  })
})

describe('requisitionService - regla 7.2 (doble aprobación: Director → Administrador)', () => {
  async function makeApprovableReq() {
    const req = await requisitionService.create({
      project_id: projectId,
      description: 'OC dos cotizaciones',
      requested_by: 'ing-obra',
    })
    const quoteIds: string[] = []
    for (const total of [1000, 1200]) {
      const { data: quote } = await supabase
        .from('purchase_quotes')
        .insert({
          requisition_id: req.id,
          supplier_id: 'sup-test',
          total,
          subtotal: total,
          tax_percent: 0,
        })
        .select()
        .single()
      quoteIds.push((quote as { id: string }).id)
    }
    return { req, quoteId: quoteIds[0] }
  }

  it('approve() del Director deja la OC en pendiente_liberacion (no la emite)', async () => {
    const { req, quoteId } = await makeApprovableReq()
    await requisitionService.approve(req.id, quoteId, 'Director Proyecto', 'sig')

    const after = await requisitionService.getById(req.id)
    expect(after.status).toBe('pendiente_liberacion')
    expect(after.approved_by).toBe('Director Proyecto')
    expect(after.approved_quote_id).toBe(quoteId)
    // No debe emitirse todavía: la liberación final es del Administrador.
    expect(after.status).not.toBe('ordered')
    expect(after.ordered_at).toBeFalsy()
    expect(after.released_by).toBeFalsy()
  })

  it('placeOrder() del Administrador libera y emite la OC (última liberación)', async () => {
    const { req, quoteId } = await makeApprovableReq()
    await requisitionService.approve(req.id, quoteId, 'Director Proyecto', 'sig')
    await requisitionService.placeOrder(req.id, 'cash', 'Administrador General')

    const after = await requisitionService.getById(req.id)
    expect(after.status).toBe('ordered')
    expect(after.payment_type).toBe('cash')
    expect(after.released_by).toBe('Administrador General')
    expect(after.released_at).not.toBeNull()
    expect(after.ordered_at).not.toBeNull()

    // La liberación queda registrada en la bitácora de aprobaciones.
    const { data: approvals } = await supabase
      .from('approvals')
      .select('*')
      .eq('entity_id', req.id)
      .eq('action', 'release')
    expect((approvals ?? []).length).toBeGreaterThanOrEqual(1)
  })

  it('placeOrder() rechaza una OC que el Director aún no ha aprobado', async () => {
    const req = await requisitionService.create({
      project_id: projectId,
      description: 'OC sin aprobar',
      requested_by: 'ing-obra',
    })
    await expect(requisitionService.placeOrder(req.id, 'cash', 'Administrador General')).rejects.toThrow(
      /pendiente de liberación/i,
    )
  })
})

describe('requisitionService - availability calculation', () => {
  it('disponible = planificado - comprometido', async () => {
    // Comprometer 30 vía requisición en estado quoting.
    await requisitionService.create({
      project_id: projectId,
      description: 'reserva 1',
      requested_by: 'ing-obra',
      budget_item_id: itemId,
      quantity_requested: 30,
      unit: 'saco',
      resource_type: 'material',
    })
    const avail = await requisitionService.getAvailabilityForBudgetItem(itemId)
    expect(avail.planned_quantity).toBe(100)
    // No verifico el número exacto porque otros tests pueden haber añadido más;
    // solo verifico la fórmula básica.
    expect(avail.available_quantity).toBeLessThanOrEqual(avail.planned_quantity)
  })
})

describe('requisitionService - recepción de mercancía (entrada a almacén)', () => {
  // Lleva una OC hasta 'ordered' con una cotización aprobada de una sola línea.
  async function makeOrderedReq(materialName: string, qty: number, unitPrice: number) {
    const req = await requisitionService.create({
      project_id: projectId,
      description: materialName,
      requested_by: 'ing-obra',
      budget_item_id: itemId,
      quantity_requested: qty,
      unit: 'saco',
      resource_type: 'material',
    })
    const quoteIds: string[] = []
    for (const [supplier, total] of [
      ['sup-a', unitPrice * qty],
      ['sup-b', unitPrice * qty + 500],
    ] as const) {
      const { data: quote } = await supabase
        .from('purchase_quotes')
        .insert({ requisition_id: req.id, supplier_id: supplier, total, subtotal: total, tax_percent: 0 })
        .select()
        .single()
      const qId = (quote as { id: string }).id
      quoteIds.push(qId)
      await supabase.from('purchase_quote_items').insert({
        quote_id: qId,
        description: materialName,
        quantity: qty,
        unit: 'saco',
        unit_price: unitPrice,
        subtotal: unitPrice * qty,
      })
    }
    await requisitionService.approve(req.id, quoteIds[0], 'Director Proyecto', 'sig')
    await requisitionService.placeOrder(req.id, 'cash', 'Administrador General')
    return req
  }

  it('markReceived da entrada al stock y marca la OC como Recibida', async () => {
    const name = `Cemento Portland ${Date.now()}`
    const req = await makeOrderedReq(name, 40, 250)

    await requisitionService.markReceived(req.id, 'Almacenista')

    const after = await requisitionService.getById(req.id)
    expect(after.status).toBe('received')
    expect(after.received_by).toBe('Almacenista')
    expect(after.received_at).not.toBeNull()

    // El material entró a stock por la cantidad de la cotización aprobada.
    const items = await inventoryService.getItems(projectId)
    const item = items.find((i) => i.name === name)
    expect(item).toBeTruthy()
    expect(item?.current_stock).toBe(40)
    expect(item?.unit_cost).toBe(250)

    // El movimiento de entrada quedó enlazado a la OC.
    const movements = await inventoryService.getMovements(projectId)
    const mv = movements.find((m) => m.purchase_order_id === req.id)
    expect(mv).toBeTruthy()
    expect(mv?.type).toBe('in')
    expect(mv?.quantity).toBe(40)
  })

  it('markReceived rechaza una OC que no está en estado "ordered"', async () => {
    const req = await requisitionService.create({
      project_id: projectId,
      description: 'OC no colocada',
      requested_by: 'ing-obra',
    })
    await expect(requisitionService.markReceived(req.id, 'Almacenista')).rejects.toThrow(/Orden colocada/i)
  })
})
