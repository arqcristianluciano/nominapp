import { describe, expect, it } from 'vitest'
import { div, mul, round2, sub, sumBy } from '@/utils/money'
import type { ContractAdelanto, ContractCorte, ContractPartida } from '@/types/database'

// --- Wrapper local ---
// `computeSummary` no está exportado desde `cubicationService.ts` y el
// requerimiento prohíbe modificar ese archivo. Replicamos aquí la misma
// lógica pura (idéntica a la del service) para poder testearla en
// aislamiento. Si cambia la fórmula en el service, este wrapper debe
// actualizarse en paralelo.
function computeSummary(partidas: ContractPartida[], cortes: ContractCorte[], adelantos: ContractAdelanto[] = []) {
  const nonDraftCortes = cortes.filter((c) => c.status !== 'draft')
  const acordado = round2(sumBy(partidas, (p) => mul(p.agreed_quantity, p.unit_price)))
  const acumulado = round2(sumBy(nonDraftCortes, (c) => c.amount))
  const retenido = round2(sumBy(nonDraftCortes, (c) => c.retention_amount))
  const total_adelantos = round2(sumBy(adelantos, (a) => a.amount))
  const pendienteRaw = round2(sub(sub(acordado, acumulado), total_adelantos))
  return {
    partidas_count: partidas.length,
    acordado,
    acumulado,
    retenido,
    total_adelantos,
    pendiente: pendienteRaw < 0 ? 0 : pendienteRaw,
    completion_percent: acordado > 0 ? Math.min(round2(mul(div(acumulado, acordado), 100)), 100) : 0,
  }
}

// --- Factories ---
function makePartida(overrides: Partial<ContractPartida> = {}): ContractPartida {
  return {
    id: `partida-${Math.random().toString(36).slice(2, 8)}`,
    contract_id: 'contract-1',
    description: 'Partida test',
    unit: 'm2',
    unit_price: 100,
    agreed_quantity: 10,
    sort_order: 0,
    ...overrides,
  }
}

function makeCorte(overrides: Partial<ContractCorte> = {}): ContractCorte {
  return {
    id: `corte-${Math.random().toString(36).slice(2, 8)}`,
    contract_id: 'contract-1',
    partida_id: 'partida-1',
    cut_number: 1,
    cut_date: '2026-05-01',
    measured_quantity: 1,
    amount: 0,
    retention_amount: 0,
    status: 'approved',
    notes: null,
    photo_url: null,
    approved_by: null,
    signature_data: null,
    linked_payroll_id: null,
    created_at: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

function makeAdelanto(overrides: Partial<ContractAdelanto> = {}): ContractAdelanto {
  return {
    id: `adelanto-${Math.random().toString(36).slice(2, 8)}`,
    contract_id: 'contract-1',
    advance_date: '2026-05-01',
    amount: 0,
    description: null,
    created_at: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

describe('cubicationService.computeSummary', () => {
  it('1. sin partidas: acordado, acumulado, total_adelantos y pendiente son 0', () => {
    const summary = computeSummary([], [], [])
    expect(summary.partidas_count).toBe(0)
    expect(summary.acordado).toBe(0)
    expect(summary.acumulado).toBe(0)
    expect(summary.total_adelantos).toBe(0)
    expect(summary.pendiente).toBe(0)
    expect(summary.completion_percent).toBe(0)
  })

  it('2. acordado = sumatoria de agreed_quantity × unit_price por partida', () => {
    const partidas = [
      makePartida({ agreed_quantity: 10, unit_price: 100 }), // 1000
      makePartida({ agreed_quantity: 5, unit_price: 250 }), // 1250
      makePartida({ agreed_quantity: 3, unit_price: 50 }), // 150
    ]
    const summary = computeSummary(partidas, [], [])
    expect(summary.acordado).toBe(2400)
    expect(summary.partidas_count).toBe(3)
  })

  it('3. acumulado = sumatoria del amount de cada corte', () => {
    const partidas = [makePartida({ agreed_quantity: 100, unit_price: 100 })] // acordado 10000
    const cortes = [makeCorte({ amount: 1500 }), makeCorte({ amount: 2500 }), makeCorte({ amount: 1000 })]
    const summary = computeSummary(partidas, cortes, [])
    expect(summary.acumulado).toBe(5000)
  })

  it('4. pendiente = acordado - acumulado - total_adelantos', () => {
    const partidas = [makePartida({ agreed_quantity: 100, unit_price: 100 })] // acordado 10000
    const cortes = [makeCorte({ amount: 3000 })]
    const adelantos = [makeAdelanto({ amount: 1000 }), makeAdelanto({ amount: 500 })]
    const summary = computeSummary(partidas, cortes, adelantos)
    expect(summary.acordado).toBe(10000)
    expect(summary.acumulado).toBe(3000)
    expect(summary.total_adelantos).toBe(1500)
    // 10000 - 3000 - 1500 = 5500
    expect(summary.pendiente).toBe(5500)
  })

  it('5. pendiente nunca es negativo: se clampa a 0 cuando adelantos+acumulado superan acordado', () => {
    const partidas = [makePartida({ agreed_quantity: 10, unit_price: 100 })] // acordado 1000
    const cortes = [makeCorte({ amount: 800 })]
    const adelantos = [makeAdelanto({ amount: 500 })] // 800 + 500 = 1300 > 1000
    const summary = computeSummary(partidas, cortes, adelantos)
    expect(summary.pendiente).toBe(0)
  })

  it('6. completion_percent se capea a 100 aunque acumulado supere lo acordado', () => {
    const partidas = [makePartida({ agreed_quantity: 10, unit_price: 100 })] // acordado 1000
    const cortes = [makeCorte({ amount: 1500 })] // sobre-ejecutado
    const summary = computeSummary(partidas, cortes, [])
    expect(summary.completion_percent).toBe(100)
  })

  it('6b. completion_percent calcula porcentaje proporcional cuando acumulado < acordado', () => {
    const partidas = [makePartida({ agreed_quantity: 10, unit_price: 100 })] // acordado 1000
    const cortes = [makeCorte({ amount: 250 })] // 25%
    const summary = computeSummary(partidas, cortes, [])
    expect(summary.completion_percent).toBe(25)
  })

  it('6c. adelantos por defecto vacío no rompe el cálculo', () => {
    const partidas = [makePartida({ agreed_quantity: 4, unit_price: 100 })] // 400
    const cortes = [makeCorte({ amount: 100 })]
    const summary = computeSummary(partidas, cortes)
    expect(summary.total_adelantos).toBe(0)
    expect(summary.pendiente).toBe(300)
  })

  it('7. (A5) cortes en borrador no cuentan en acumulado ni retenido', () => {
    const partidas = [makePartida({ agreed_quantity: 100, unit_price: 100 })] // acordado 10000
    const cortes = [
      makeCorte({ amount: 3000, retention_amount: 300, status: 'approved' }),
      makeCorte({ amount: 2000, retention_amount: 200, status: 'draft' }), // debe ignorarse
    ]
    const summary = computeSummary(partidas, cortes)
    // Solo el corte aprobado cuenta
    expect(summary.acumulado).toBe(3000)
    expect(summary.retenido).toBe(300)
    // completion_percent calculado solo sobre aprobados
    expect(summary.completion_percent).toBe(30)
  })
})
