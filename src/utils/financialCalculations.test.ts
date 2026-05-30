import { describe, it, expect } from 'vitest'
import {
  calcTransitos,
  calcCashDisponible,
  calcTotalCxP,
  calcDisponibleNeto,
  calcTotalIncurrido,
  calcBudgetSpent,
  calcCxPDetails,
} from './financialCalculations'
import type { TransactionWithRelations } from '@/services/transactionService'

const txn = (overrides: Partial<TransactionWithRelations>): TransactionWithRelations => ({
  id: 't1',
  project_id: 'p1',
  date: '2026-01-15',
  budget_category_id: null,
  budget_item_id: null,
  description: 'test',
  supplier_id: null,
  quantity: null,
  unit_price: null,
  total: 0,
  payment_condition: null,
  invoice_number: null,
  check_number: null,
  bank: null,
  cashed_date: null,
  payroll_period_id: null,
  notes: null,
  created_at: '2026-01-15T00:00:00Z',
  ...overrides,
})

const deposit = (total: number) =>
  txn({
    total,
    budget_category_id: 'dep',
    budget_category: {
      id: 'dep',
      code: '19 - DEPOSITOS',
      name: 'Depósitos',
    } as TransactionWithRelations['budget_category'],
  })

const expense = (total: number, opts: Partial<TransactionWithRelations> = {}) =>
  txn({
    total,
    budget_category_id: 'mat',
    budget_category: {
      id: 'mat',
      code: '01 - MATERIALES',
      name: 'Materiales',
    } as TransactionWithRelations['budget_category'],
    ...opts,
  })

describe('financialCalculations', () => {
  describe('calcTransitos', () => {
    it('cuenta cheques en tránsito (sin cashed_date)', () => {
      const list = [
        expense(1000, { payment_condition: 'Cheque', cashed_date: null }),
        expense(500, { payment_condition: 'Cheque', cashed_date: '2026-01-20' }),
        expense(300, { payment_condition: 'Efectivo', cashed_date: null }),
      ]
      expect(calcTransitos(list)).toBe(1000)
    })
  })

  describe('calcCashDisponible', () => {
    it('depósitos − egresos', () => {
      const list = [deposit(100000), deposit(50000), expense(30000), expense(20000.5)]
      expect(calcCashDisponible(list)).toBe(99999.5)
    })

    it('sin movimientos = 0', () => {
      expect(calcCashDisponible([])).toBe(0)
    })
  })

  describe('calcTotalCxP', () => {
    it('crédito completo sin pagos', () => {
      const list = [expense(1000, { payment_condition: 'Credito 30 dias', invoice_number: 'F-001', supplier_id: 's1' })]
      expect(calcTotalCxP(list)).toBe(1000)
    })

    it('crédito parcialmente pagado', () => {
      const list = [
        expense(1000, { payment_condition: 'Credito 30 dias', invoice_number: 'F-001', supplier_id: 's1' }),
        expense(400, { payment_condition: 'Cheque', invoice_number: 'F-001', supplier_id: 's1' }),
      ]
      expect(calcTotalCxP(list)).toBe(600)
    })

    it('crédito totalmente pagado no aporta', () => {
      const list = [
        expense(1000, { payment_condition: 'Credito 30 dias', invoice_number: 'F-001', supplier_id: 's1' }),
        expense(1000, { payment_condition: 'Cheque', invoice_number: 'F-001', supplier_id: 's1' }),
      ]
      expect(calcTotalCxP(list)).toBe(0)
    })

    it('múltiples créditos', () => {
      const list = [
        expense(1000, { payment_condition: 'Credito', invoice_number: 'F-001', supplier_id: 's1' }),
        expense(2500, { payment_condition: 'Credito', invoice_number: 'F-002', supplier_id: 's2' }),
        expense(500, { payment_condition: 'Cheque', invoice_number: 'F-001', supplier_id: 's1' }),
      ]
      expect(calcTotalCxP(list)).toBe(3000)
    })
  })

  describe('calcDisponibleNeto', () => {
    it('cash − cxp − transitos', () => {
      expect(calcDisponibleNeto(100000, 30000, 5000)).toBe(65000)
    })
  })

  describe('calcTotalIncurrido', () => {
    it('excluye depósitos', () => {
      const list = [deposit(100000), expense(30000), expense(20500)]
      expect(calcTotalIncurrido(list)).toBe(50500)
    })
  })

  describe('calcBudgetSpent', () => {
    it('suma transacciones por categoría', () => {
      const list = [
        expense(1000, { budget_category_id: 'cat-A' }),
        expense(2000, { budget_category_id: 'cat-A' }),
        expense(500, { budget_category_id: 'cat-B' }),
      ]
      expect(calcBudgetSpent(list, 'cat-A')).toBe(3000)
      expect(calcBudgetSpent(list, 'cat-B')).toBe(500)
    })
  })

  describe('calcCxPDetails', () => {
    it('lista pendientes con monto restante', () => {
      const list = [
        expense(1000, {
          payment_condition: 'Credito 30 dias',
          invoice_number: 'F-001',
          supplier_id: 's1',
          supplier: { id: 's1', name: 'Proveedor X' } as TransactionWithRelations['supplier'],
        }),
        expense(300, { payment_condition: 'Cheque', invoice_number: 'F-001', supplier_id: 's1' }),
      ]
      const details = calcCxPDetails(list)
      expect(details).toHaveLength(1)
      expect(details[0].pending).toBe(700)
      expect(details[0].supplierName).toBe('Proveedor X')
    })

    it('omite los completamente pagados', () => {
      const list = [
        expense(500, { payment_condition: 'Credito', invoice_number: 'F-001', supplier_id: 's1' }),
        expense(500, { payment_condition: 'Cheque', invoice_number: 'F-001', supplier_id: 's1' }),
      ]
      expect(calcCxPDetails(list)).toHaveLength(0)
    })
  })
})
