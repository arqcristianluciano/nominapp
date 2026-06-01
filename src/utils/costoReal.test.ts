import { describe, expect, it } from 'vitest'
import {
  INVENTORY_OUT_TYPE,
  inventoryOutCost,
  laborLineCost,
  materialInvoiceCost,
  resolveImputedCategory,
  transactionCost,
} from './costoReal'

describe('costoReal extractores de monto', () => {
  it('laborLineCost = cantidad × precio unitario', () => {
    expect(laborLineCost({ quantity: 5, unit_price: 1000 })).toBe(5000)
  })

  it('materialInvoiceCost = monto', () => {
    expect(materialInvoiceCost({ amount: 3000 })).toBe(3000)
  })

  it('inventoryOutCost = cantidad × costo unitario', () => {
    expect(inventoryOutCost({ quantity: 4, unit_cost: 100 })).toBe(400)
  })

  it('transactionCost = total', () => {
    expect(transactionCost({ total: 1500 })).toBe(1500)
  })

  it('trata null/undefined como 0', () => {
    expect(laborLineCost({ quantity: null, unit_price: 1000 })).toBe(0)
    expect(materialInvoiceCost({ amount: null })).toBe(0)
    expect(inventoryOutCost({ quantity: 4, unit_cost: null })).toBe(0)
    expect(transactionCost({ total: null })).toBe(0)
  })

  it('expone el tipo de movimiento de salida de almacén', () => {
    expect(INVENTORY_OUT_TYPE).toBe('out')
  })
})

describe('resolveImputedCategory', () => {
  const itemToCategory = new Map<string, string>([
    ['item-1', 'cat-A'],
    ['item-2', 'cat-B'],
  ])

  it('usa el capítulo imputado directamente cuando existe', () => {
    expect(resolveImputedCategory('cat-X', 'item-1', itemToCategory)).toBe('cat-X')
  })

  it('resuelve el capítulo desde la partida cuando no hay capítulo directo', () => {
    expect(resolveImputedCategory(null, 'item-1', itemToCategory)).toBe('cat-A')
    expect(resolveImputedCategory(undefined, 'item-2', itemToCategory)).toBe('cat-B')
  })

  it('devuelve null cuando no hay capítulo ni partida resoluble', () => {
    expect(resolveImputedCategory(null, null, itemToCategory)).toBeNull()
    expect(resolveImputedCategory(null, 'item-desconocida', itemToCategory)).toBeNull()
  })
})
