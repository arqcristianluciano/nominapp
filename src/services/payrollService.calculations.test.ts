import { describe, it, expect } from 'vitest'
import { calcLaborTotal, calcMaterialsTotal, calcIndirectCosts, calcGrandTotal } from '@/utils/calculations'
import type { LaborLineItem, MaterialInvoice, Project } from '@/types/database'

// Helpers de fabricación de payload para mantener los casos legibles.
function makeLabor(overrides: Partial<LaborLineItem> = {}): LaborLineItem {
  return {
    id: `l_${Math.random().toString(36).slice(2, 8)}`,
    payroll_period_id: 'period-1',
    contractor_id: 'contractor-1',
    description: 'item',
    quantity: 1,
    unit: 'global',
    unit_price: 100,
    subtotal: 100,
    is_advance: false,
    is_advance_deduction: false,
    sort_order: 1,
    notes: null,
    budget_category_id: null,
    budget_item_id: null,
    created_by: null,
    ...overrides,
  }
}

function makeInvoice(overrides: Partial<MaterialInvoice> = {}): MaterialInvoice {
  return {
    id: `m_${Math.random().toString(36).slice(2, 8)}`,
    payroll_period_id: 'period-1',
    supplier_id: 'supplier-1',
    description: 'material',
    invoice_reference: null,
    amount: 0,
    budget_category_id: null,
    budget_item_id: null,
    attachment_path: null,
    notes: null,
    created_by: null,
    ...overrides,
  }
}

type ProjectIndirectInput = Pick<
  Project,
  'dt_percent' | 'admin_percent' | 'transport_percent' | 'planning_fee' | 'custom_indirects'
>

const baseProject: ProjectIndirectInput = {
  dt_percent: 10,
  admin_percent: 1,
  transport_percent: 0.5,
  planning_fee: 0,
  custom_indirects: [],
}

describe('payrollService calculations', () => {
  // === 1. Lista vacía ===
  describe('items vacíos', () => {
    it('calcLaborTotal con [] retorna 0', () => {
      expect(calcLaborTotal([])).toBe(0)
    })

    it('calcMaterialsTotal con [] retorna 0', () => {
      expect(calcMaterialsTotal([])).toBe(0)
    })

    it('calcIndirectCosts con 0 labor y 0 materials → total 0 cuando project no tiene porcentajes ni planning', () => {
      const result = calcIndirectCosts(0, 0, {
        dt_percent: 0,
        admin_percent: 0,
        transport_percent: 0,
        planning_fee: 0,
        custom_indirects: [],
      })
      expect(result.base).toBe(0)
      expect(result.total).toBe(0)
    })
  })

  // === 2. Suma normal exacta sin pérdidas de redondeo ===
  describe('suma normal sin pérdida de precisión', () => {
    it('calcLaborTotal suma cantidad × precio exactamente con decimales', () => {
      const items = [
        makeLabor({ quantity: 2, unit_price: 1500.5 }),
        makeLabor({ quantity: 3, unit_price: 250.25 }),
        makeLabor({ quantity: 1.5, unit_price: 800 }),
      ]
      // 2*1500.5 + 3*250.25 + 1.5*800 = 3001 + 750.75 + 1200 = 4951.75
      expect(calcLaborTotal(items)).toBe(4951.75)
    })

    it('calcLaborTotal evita el error clásico de float (0.1 + 0.2)', () => {
      const items = [makeLabor({ quantity: 1, unit_price: 0.1 }), makeLabor({ quantity: 1, unit_price: 0.2 })]
      expect(calcLaborTotal(items)).toBe(0.3)
    })

    it('calcMaterialsTotal suma facturas con decimales sin perder centavos', () => {
      const invoices = [
        makeInvoice({ amount: 1234.56 }),
        makeInvoice({ amount: 7890.12 }),
        makeInvoice({ amount: 99.99 }),
      ]
      // 1234.56 + 7890.12 + 99.99 = 9224.67
      expect(calcMaterialsTotal(invoices)).toBe(9224.67)
    })
  })

  // === 3. Deducciones negativas restan correctamente ===
  describe('deducciones negativas', () => {
    it('calcLaborTotal resta cuando quantity es negativa (deducción de adelanto)', () => {
      const items = [
        makeLabor({ quantity: 10, unit_price: 500 }), // +5000
        makeLabor({ quantity: 5, unit_price: 200 }), // +1000
        makeLabor({ quantity: -2, unit_price: 500, is_advance_deduction: true }), // -1000
      ]
      // 5000 + 1000 - 1000 = 5000
      expect(calcLaborTotal(items)).toBe(5000)
    })

    it('una deducción que iguala todo deja el total en 0', () => {
      const items = [
        makeLabor({ quantity: 4, unit_price: 1250 }),
        makeLabor({ quantity: -1, unit_price: 5000, is_advance_deduction: true }),
      ]
      expect(calcLaborTotal(items)).toBe(0)
    })

    it('deducción mayor que ingresos da total negativo (no se trunca)', () => {
      const items = [
        makeLabor({ quantity: 1, unit_price: 1000 }),
        makeLabor({ quantity: -1, unit_price: 1500, is_advance_deduction: true }),
      ]
      expect(calcLaborTotal(items)).toBe(-500)
    })
  })

  // === 4. Indirectos % sobre base correcta (labor + materials) ===
  describe('indirectos en porcentaje sobre base correcta', () => {
    it('aplica dt/admin/transporte sobre base = labor + materials', () => {
      const result = calcIndirectCosts(80000, 20000, baseProject)
      expect(result.base).toBe(100000)
      expect(result.direction_technique.amount).toBe(10000) // 10% de 100000
      expect(result.administration.amount).toBe(1000) // 1% de 100000
      expect(result.transport.amount).toBe(500) // 0.5% de 100000
    })

    it('custom indirect tipo percent se calcula sobre la misma base', () => {
      const result = calcIndirectCosts(60000, 40000, {
        ...baseProject,
        dt_percent: 0,
        admin_percent: 0,
        transport_percent: 0,
        custom_indirects: [{ id: 'sup', name: 'Supervisión', type: 'percent', value: 3 }],
      })
      expect(result.base).toBe(100000)
      expect(result.customs).toHaveLength(1)
      expect(result.customs[0].amount).toBe(3000) // 3% de 100000
    })

    it('porcentaje fraccionario se aplica sin pérdida (7.5% de 200000 = 15000)', () => {
      const result = calcIndirectCosts(150000, 50000, {
        ...baseProject,
        dt_percent: 7.5,
        admin_percent: 0,
        transport_percent: 0,
      })
      expect(result.direction_technique.amount).toBe(15000)
    })
  })

  // === 5. Indirectos fijos se suman tal cual ===
  describe('indirectos fijos', () => {
    it('planning_fee se suma sin tocar (no es porcentaje)', () => {
      const result = calcIndirectCosts(100000, 0, {
        ...baseProject,
        dt_percent: 0,
        admin_percent: 0,
        transport_percent: 0,
        planning_fee: 12345.67,
      })
      expect(result.planning.amount).toBe(12345.67)
      expect(result.total).toBe(12345.67)
    })

    it('custom indirect tipo fixed se suma como monto literal', () => {
      const result = calcIndirectCosts(50000, 50000, {
        ...baseProject,
        dt_percent: 0,
        admin_percent: 0,
        transport_percent: 0,
        custom_indirects: [
          { id: 'seg', name: 'Seguridad', type: 'fixed', value: 7500 },
          { id: 'eq', name: 'Alquiler equipos', type: 'fixed', value: 2500.5 },
        ],
      })
      expect(result.customs[0].amount).toBe(7500)
      expect(result.customs[1].amount).toBe(2500.5)
      expect(result.total).toBe(10000.5)
    })

    it('mezcla de percent + fixed se suma correctamente', () => {
      const result = calcIndirectCosts(80000, 20000, {
        ...baseProject,
        planning_fee: 5000,
        custom_indirects: [
          { id: 'a', name: 'Supervisión', type: 'percent', value: 2 }, // 2000
          { id: 'b', name: 'Seguridad', type: 'fixed', value: 3000 }, // 3000
        ],
      })
      // dt 10000 + admin 1000 + transport 500 + planning 5000 + sup 2000 + seg 3000 = 21500
      expect(result.total).toBe(21500)
    })
  })

  // === 6. grand_total = labor + materials + indirect ===
  describe('grand_total = labor + materials + indirect', () => {
    it('suma simple de los tres componentes', () => {
      expect(calcGrandTotal(50000, 30000, 8500)).toBe(88500)
    })

    it('simula el cálculo encadenado de recalculateTotals', () => {
      const laborItems = [
        makeLabor({ quantity: 5, unit_price: 12000 }), // 60000
        makeLabor({ quantity: -1, unit_price: 5000, is_advance_deduction: true }), // -5000
      ]
      const invoices = [makeInvoice({ amount: 15000 }), makeInvoice({ amount: 5000 })]

      const laborTotal = calcLaborTotal(laborItems) // 55000
      const materialsTotal = calcMaterialsTotal(invoices) // 20000
      const indirect = calcIndirectCosts(laborTotal, materialsTotal, {
        ...baseProject,
        planning_fee: 1000,
      })
      // base 75000 → dt 7500, admin 750, transport 375, planning 1000 = 9625
      const grand = calcGrandTotal(laborTotal, materialsTotal, indirect.total)

      expect(laborTotal).toBe(55000)
      expect(materialsTotal).toBe(20000)
      expect(indirect.total).toBe(9625)
      expect(grand).toBe(55000 + 20000 + 9625)
      expect(grand).toBe(84625)
    })

    it('grand_total con todos los componentes en 0 es 0', () => {
      expect(calcGrandTotal(0, 0, 0)).toBe(0)
    })
  })

  // === 7. Redondeo a 2 decimales consistente ===
  describe('redondeo a 2 decimales', () => {
    it('calcLaborTotal redondea a 2 decimales', () => {
      const items = [makeLabor({ quantity: 1, unit_price: 33.333 }), makeLabor({ quantity: 1, unit_price: 66.666 })]
      // 33.333 + 66.666 = 99.999 → 100.00
      const result = calcLaborTotal(items)
      expect(result).toBe(100)
      // Verificar que el número no tiene más de 2 decimales
      expect(Number.isInteger(result * 100)).toBe(true)
    })

    it('calcMaterialsTotal redondea a 2 decimales', () => {
      const invoices = [makeInvoice({ amount: 10.005 }), makeInvoice({ amount: 20.004 })]
      // 10.005 + 20.004 = 30.009 → 30.01 (half-even)
      const result = calcMaterialsTotal(invoices)
      expect(Number.isInteger(result * 100)).toBe(true)
      expect(result).toBeCloseTo(30.01, 2)
    })

    it('calcIndirectCosts redondea cada componente a 2 decimales', () => {
      const result = calcIndirectCosts(33333.33, 0, {
        ...baseProject,
        dt_percent: 7.5,
        admin_percent: 0,
        transport_percent: 0,
        planning_fee: 0,
      })
      // 33333.33 * 0.075 = 2499.99975 → 2500.00 (half-even)
      expect(Number.isInteger(result.direction_technique.amount * 100)).toBe(true)
      expect(Number.isInteger(result.total * 100)).toBe(true)
    })

    it('calcGrandTotal redondea a 2 decimales', () => {
      const result = calcGrandTotal(100.005, 200.004, 0)
      // 300.009 → 300.01 (half-even)
      expect(Number.isInteger(result * 100)).toBe(true)
      expect(result).toBeCloseTo(300.01, 2)
    })

    it('todos los totales de un período encadenado terminan con ≤ 2 decimales', () => {
      const laborItems = [makeLabor({ quantity: 3.333, unit_price: 111.11 })]
      const invoices = [makeInvoice({ amount: 999.999 })]
      const labor = calcLaborTotal(laborItems)
      const materials = calcMaterialsTotal(invoices)
      const indirect = calcIndirectCosts(labor, materials, baseProject)
      const grand = calcGrandTotal(labor, materials, indirect.total)

      for (const value of [labor, materials, indirect.total, grand]) {
        expect(Number.isInteger(value * 100)).toBe(true)
      }
    })
  })
})
