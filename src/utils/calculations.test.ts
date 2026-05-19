import { describe, it, expect } from 'vitest'
import {
  calcLaborTotal,
  calcContractorSubtotal,
  calcMaterialsTotal,
  calcIndirectCosts,
  calcBankCommission,
  calcGrandTotal,
} from './calculations'
import type { LaborLineItem, MaterialInvoice, Project } from '@/types/database'

const labor = (overrides: Partial<LaborLineItem>): LaborLineItem => ({
  id: 'l1',
  payroll_period_id: 'p1',
  contractor_id: 'c1',
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
  ...overrides,
})

const project: Pick<Project, 'dt_percent' | 'admin_percent' | 'transport_percent' | 'planning_fee' | 'custom_indirects'> = {
  dt_percent: 10,
  admin_percent: 1,
  transport_percent: 0.5,
  planning_fee: 25000,
  custom_indirects: [],
}

describe('calculations', () => {
  describe('calcLaborTotal', () => {
    it('suma cantidad × precio sin error de float', () => {
      const items = [
        labor({ quantity: 1.1, unit_price: 100 }),
        labor({ quantity: 2.2, unit_price: 100 }),
        labor({ quantity: 3.3, unit_price: 100 }),
      ]
      expect(calcLaborTotal(items)).toBe(660)
    })

    it('lista vacía retorna 0', () => {
      expect(calcLaborTotal([])).toBe(0)
    })
  })

  describe('calcContractorSubtotal', () => {
    it('filtra por contractor_id antes de sumar', () => {
      const items = [
        labor({ contractor_id: 'A', quantity: 10, unit_price: 100 }),
        labor({ contractor_id: 'B', quantity: 5, unit_price: 100 }),
        labor({ contractor_id: 'A', quantity: 3, unit_price: 100 }),
      ]
      expect(calcContractorSubtotal(items, 'A')).toBe(1300)
      expect(calcContractorSubtotal(items, 'B')).toBe(500)
      expect(calcContractorSubtotal(items, 'C')).toBe(0)
    })
  })

  describe('calcMaterialsTotal', () => {
    it('suma facturas', () => {
      const invoices = [
        { amount: 1234.56 },
        { amount: 7891.23 },
        { amount: 100.21 },
      ] as MaterialInvoice[]
      expect(calcMaterialsTotal(invoices)).toBe(9226)
    })
  })

  describe('calcIndirectCosts', () => {
    it('calcula DT/Admin/Transporte sobre la base correcta', () => {
      const result = calcIndirectCosts(80000, 20000, project)
      expect(result.base).toBe(100000)
      expect(result.direction_technique.amount).toBe(10000)
      expect(result.administration.amount).toBe(1000)
      expect(result.transport.amount).toBe(500)
      expect(result.planning.amount).toBe(25000)
      expect(result.total).toBe(36500)
    })

    it('sin planning_fee', () => {
      const result = calcIndirectCosts(50000, 50000, { ...project, planning_fee: 0 })
      expect(result.planning.amount).toBe(0)
      expect(result.total).toBe(11500)
    })

    it('porcentajes fraccionarios sin pérdida de precisión', () => {
      const result = calcIndirectCosts(33333.33, 0, { ...project, dt_percent: 7.5, admin_percent: 0, transport_percent: 0, planning_fee: 0, custom_indirects: [] })
      expect(result.direction_technique.amount).toBe(2500)
    })

    it('incluye custom_indirects en porcentaje y monto fijo', () => {
      const result = calcIndirectCosts(80000, 20000, {
        ...project,
        planning_fee: 0,
        custom_indirects: [
          { id: 'a', name: 'Supervisión eléctrica', type: 'percent', value: 2 },
          { id: 'b', name: 'Seguridad', type: 'fixed', value: 5000 },
        ],
      })
      expect(result.customs).toHaveLength(2)
      expect(result.customs[0].amount).toBe(2000)
      expect(result.customs[1].amount).toBe(5000)
      expect(result.total).toBe(10000 + 1000 + 500 + 0 + 2000 + 5000)
    })
  })

  describe('calcBankCommission', () => {
    it('comisión bancaria 0.15% por defecto', () => {
      expect(calcBankCommission(100000)).toBeGreaterThan(0)
    })

    it('cero monto retorna cero comisión', () => {
      expect(calcBankCommission(0)).toBe(0)
    })
  })

  describe('calcGrandTotal', () => {
    it('suma labor + materials + indirect', () => {
      expect(calcGrandTotal(50000.5, 25000.25, 10000.25)).toBe(85001)
    })
  })
})
