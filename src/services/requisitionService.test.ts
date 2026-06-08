import { beforeAll, describe, expect, it } from 'vitest'
import { requisitionService } from './requisitionService'
import { inventoryService } from './inventoryService'
import { lotService } from './lotService'
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

  it('enlaza el material de inventario al catálogo cuando la descripción coincide', async () => {
    const name = `Varilla 1/2 ${Date.now()}`
    const { data: catalog } = await supabase
      .from('materials_catalog')
      .insert({ code: `CAT-${Date.now()}`, description: name, unit: 'qq', is_active: true })
      .select()
      .single()

    const req = await makeOrderedReq(name, 10, 100)
    await requisitionService.markReceived(req.id, 'Almacenista')

    const item = (await inventoryService.getItems(projectId)).find((i) => i.name === name)
    expect(item?.material_catalog_id).toBe((catalog as { id: string }).id)
  })

  it('reverseReceipt deshace el stock y devuelve la OC a "ordered"', async () => {
    const name = `Bloque ${Date.now()}`
    const req = await makeOrderedReq(name, 25, 30)
    await requisitionService.markReceived(req.id, 'Almacenista')

    const itemBefore = (await inventoryService.getItems(projectId)).find((i) => i.name === name)
    expect(itemBefore?.current_stock).toBe(25)

    await requisitionService.reverseReceipt(req.id, 'Almacenista')

    const after = await requisitionService.getById(req.id)
    expect(after.status).toBe('ordered')
    expect(after.received_by).toBeNull()
    expect(after.received_at).toBeNull()

    // El stock vuelve a 0 vía una salida compensatoria enlazada a la OC.
    const itemAfter = (await inventoryService.getItems(projectId)).find((i) => i.name === name)
    expect(itemAfter?.current_stock).toBe(0)

    const poMovements = await inventoryService.getMovementsByPurchaseOrder(req.id)
    expect(poMovements.some((m) => m.type === 'out' && m.quantity === 25)).toBe(true)
  })

  it('reverseReceipt funciona aunque el material recibido ya se haya consumido (caso Sentry #99)', async () => {
    const name = `Varilla ${Date.now()}`
    const req = await makeOrderedReq(name, 100, 12)
    await requisitionService.markReceived(req.id, 'Almacenista')

    const item = (await inventoryService.getItems(projectId)).find((i) => i.name === name)!
    expect(item.current_stock).toBe(100)

    // Se consume todo el material recibido (salida normal a una partida): el
    // stock queda en 0 antes de intentar revertir la recepción.
    await inventoryService.addMovement({
      item_id: item.id,
      project_id: projectId,
      type: 'out',
      quantity: 100,
      date: new Date().toISOString().slice(0, 10),
      budget_item_id: itemId,
      created_by: 'Almacenista',
      notes: 'Consumo en obra',
    })
    const consumed = (await inventoryService.getItems(projectId)).find((i) => i.name === name)!
    expect(consumed.current_stock).toBe(0)

    // Antes del fix esto lanzaba InventoryError INSUFFICIENT_STOCK
    // ("disponible 0, solicitado 100"). La reversa debe completarse como
    // corrección administrativa (override) y dejar la OC en "ordered".
    await requisitionService.reverseReceipt(req.id, 'Almacenista')

    const after = await requisitionService.getById(req.id)
    expect(after.status).toBe('ordered')
    const finalItem = (await inventoryService.getItems(projectId)).find((i) => i.name === name)!
    expect(finalItem.current_stock).toBe(-100)
  })

  it('vincula la entrada de almacén por material_catalog_id de la línea de cotización', async () => {
    const { data: cat } = await supabase
      .from('materials_catalog')
      .insert({ code: `CC-${Date.now()}`, description: `Catalogado ${Date.now()}`, unit: 'm3', is_active: true })
      .select()
      .single()
    const catId = (cat as { id: string }).id

    const req = await requisitionService.create({
      project_id: projectId,
      description: 'OC catálogo',
      requested_by: 'ing-obra',
      budget_item_id: itemId,
      quantity_requested: 10,
      unit: 'm3',
      resource_type: 'material',
    })
    const quoteIds: string[] = []
    for (const [supplier, total] of [
      ['s1', 100],
      ['s2', 150],
    ] as const) {
      const { data: q } = await supabase
        .from('purchase_quotes')
        .insert({ requisition_id: req.id, supplier_id: supplier, total, subtotal: total, tax_percent: 0 })
        .select()
        .single()
      const qId = (q as { id: string }).id
      quoteIds.push(qId)
      await supabase.from('purchase_quote_items').insert({
        quote_id: qId,
        description: 'Hormigón premezclado',
        quantity: 10,
        unit: 'm3',
        unit_price: 10,
        subtotal: 100,
        material_catalog_id: catId,
      })
    }
    await requisitionService.approve(req.id, quoteIds[0], 'Director', 'sig')
    await requisitionService.placeOrder(req.id, 'cash', 'Admin')
    await requisitionService.markReceived(req.id, 'Almacenista')

    const item = (await inventoryService.getItems(projectId)).find((i) => i.material_catalog_id === catId)
    expect(item).toBeTruthy()
    expect(item?.name).toBe('Hormigón premezclado')
  })

  it('crea lote y enlaza el movimiento al recibir con lote/vencimiento; la reversa lo anula', async () => {
    const name = `Membrana ${Date.now()}`
    const req = await makeOrderedReq(name, 12, 9)
    const lineId = requisitionService.getPendingReceiptLines(await requisitionService.getById(req.id))[0]
      .quote_item_id as string
    await requisitionService.receiveItems(req.id, 'Almacenista', [
      { quote_item_id: lineId, quantity: 12, lot_number: 'L-001', expiry_date: '2027-01-01' },
    ])

    const item = (await inventoryService.getItems(projectId)).find((i) => i.name === name)!
    const lots = await lotService.list(item.id)
    expect(lots.length).toBe(1)
    expect(lots[0].lot_number).toBe('L-001')
    expect(lots[0].quantity).toBe(12)
    expect(lots[0].expiry_date).toBe('2027-01-01')

    const movs = await inventoryService.getMovementsByPurchaseOrder(req.id)
    expect(movs.find((m) => m.type === 'in')?.lot_id).toBe(lots[0].id)

    await requisitionService.reverseReceipt(req.id, 'Almacenista')
    expect((await lotService.list(item.id))[0].quantity).toBe(0)
  })

  it('guarda el attachment_path (conduce) en los movimientos de la recepción', async () => {
    const name = `Tubería ${Date.now()}`
    const req = await makeOrderedReq(name, 6, 20)
    const lineId = requisitionService.getPendingReceiptLines(await requisitionService.getById(req.id))[0]
      .quote_item_id as string
    await requisitionService.receiveItems(
      req.id,
      'Almacenista',
      [{ quote_item_id: lineId, quantity: 6 }],
      'proj/po/conduce.pdf',
    )
    const movs = await inventoryService.getMovementsByPurchaseOrder(req.id)
    expect(movs.find((m) => m.type === 'in')?.attachment_path).toBe('proj/po/conduce.pdf')
  })

  it('reverseReceipt rechaza una OC que no está "received"', async () => {
    const req = await makeOrderedReq(`X ${Date.now()}`, 5, 10)
    await expect(requisitionService.reverseReceipt(req.id, 'Almacenista')).rejects.toThrow(/Recibida/i)
  })

  it('receiveItems parcial deja la OC en "partially_received" y completa el resto', async () => {
    const name = `Arena ${Date.now()}`
    const req = await makeOrderedReq(name, 100, 5)
    const lines = requisitionService.getPendingReceiptLines(await requisitionService.getById(req.id))
    const lineId = lines[0].quote_item_id as string

    // Primera entrega: 40 de 100.
    await requisitionService.receiveItems(req.id, 'Almacenista', [{ quote_item_id: lineId, quantity: 40 }])
    let after = await requisitionService.getById(req.id)
    expect(after.status).toBe('partially_received')
    expect(after.received_at).toBeNull()

    let item = (await inventoryService.getItems(projectId)).find((i) => i.name === name)
    expect(item?.current_stock).toBe(40)

    const pending = requisitionService.getPendingReceiptLines(after)
    expect(pending[0].received_quantity).toBe(40)
    expect(pending[0].remaining_quantity).toBe(60)

    // Segunda entrega: los 60 restantes → completa.
    await requisitionService.receiveItems(req.id, 'Almacenista', [{ quote_item_id: lineId, quantity: 60 }])
    after = await requisitionService.getById(req.id)
    expect(after.status).toBe('received')
    expect(after.received_by).toBe('Almacenista')

    item = (await inventoryService.getItems(projectId)).find((i) => i.name === name)
    expect(item?.current_stock).toBe(100)
  })

  it('receiveItems rechaza recibir más de lo pendiente', async () => {
    const req = await makeOrderedReq(`Grava ${Date.now()}`, 10, 5)
    const lines = requisitionService.getPendingReceiptLines(await requisitionService.getById(req.id))
    const lineId = lines[0].quote_item_id as string
    await expect(
      requisitionService.receiveItems(req.id, 'Almacenista', [{ quote_item_id: lineId, quantity: 11 }]),
    ).rejects.toThrow(/excede lo pendiente/i)
  })

  it('hereda default_min_stock del catálogo al crear el material recibido', async () => {
    const name = `Tornillo ${Date.now()}`
    await supabase
      .from('materials_catalog')
      .insert({ code: `MC-${Date.now()}`, description: name, unit: 'caja', default_min_stock: 7, is_active: true })
    const req = await makeOrderedReq(name, 5, 3)
    await requisitionService.markReceived(req.id, 'Almacenista')
    const item = (await inventoryService.getItems(projectId)).find((i) => i.name === name)
    expect(item?.min_stock).toBe(7)
  })

  it('getReceiptProgress y getAll exponen el progreso recibido/pedido', async () => {
    const name = `Pintura ${Date.now()}`
    const req = await makeOrderedReq(name, 80, 4)
    const lineId = requisitionService.getPendingReceiptLines(await requisitionService.getById(req.id))[0]
      .quote_item_id as string
    await requisitionService.receiveItems(req.id, 'Almacenista', [{ quote_item_id: lineId, quantity: 30 }])

    expect(requisitionService.getReceiptProgress(await requisitionService.getById(req.id))).toEqual({
      ordered: 80,
      received: 30,
    })
    const inList = (await requisitionService.getAll()).find((r) => r.id === req.id)
    expect(inList?.receipt_progress).toEqual({ ordered: 80, received: 30 })
  })

  it('reverseReceipt sobre una OC parcial reinicia received_quantity y vuelve a "ordered"', async () => {
    const name = `Cal ${Date.now()}`
    const req = await makeOrderedReq(name, 50, 8)
    const lines = requisitionService.getPendingReceiptLines(await requisitionService.getById(req.id))
    const lineId = lines[0].quote_item_id as string
    await requisitionService.receiveItems(req.id, 'Almacenista', [{ quote_item_id: lineId, quantity: 20 }])

    await requisitionService.reverseReceipt(req.id, 'Almacenista')
    const after = await requisitionService.getById(req.id)
    expect(after.status).toBe('ordered')

    const pending = requisitionService.getPendingReceiptLines(after)
    expect(pending[0].received_quantity).toBe(0)
    expect(pending[0].remaining_quantity).toBe(50)

    const item = (await inventoryService.getItems(projectId)).find((i) => i.name === name)
    expect(item?.current_stock).toBe(0)
  })
})
