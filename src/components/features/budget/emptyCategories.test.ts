import { describe, expect, it } from 'vitest'
import { findEmptyCategories } from './emptyCategories'
import type { BudgetCategory, BudgetItem } from '@/types/database'

function makeCategory(over: Partial<BudgetCategory> & { id: string }): BudgetCategory {
  return {
    id: over.id,
    project_id: over.project_id ?? 'p1',
    code: over.code ?? over.id,
    name: over.name ?? over.id,
    sort_order: over.sort_order ?? 1,
    budgeted_amount: over.budgeted_amount ?? 0,
    start_date: over.start_date ?? null,
    end_date: over.end_date ?? null,
  }
}

function makeItem(categoryId: string): BudgetItem {
  return {
    id: `${categoryId}-item`,
    budget_category_id: categoryId,
    code: null,
    description: 'x',
    unit: 'u',
    quantity: 1,
    unit_price: 1,
    sort_order: 0,
    notes: null,
    start_date: null,
    end_date: null,
  }
}

const noSpent = () => 0

describe('findEmptyCategories', () => {
  it('marca como vacía la partida sin subpartidas, sin monto y sin gasto', () => {
    const empty = makeCategory({ id: 'empty' })
    const result = findEmptyCategories([empty], {}, noSpent)
    expect(result).toEqual([empty])
  })

  it('trata la entrada faltante en itemsByCategory como sin subpartidas', () => {
    const a = makeCategory({ id: 'a' })
    const b = makeCategory({ id: 'b' })
    // 'b' no aparece en el mapa => debe considerarse vacía igualmente.
    const result = findEmptyCategories([a, b], { a: [] }, noSpent)
    expect(result.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('excluye partidas que tienen subpartidas', () => {
    const withItems = makeCategory({ id: 'withItems' })
    const result = findEmptyCategories([withItems], { withItems: [makeItem('withItems')] }, noSpent)
    expect(result).toEqual([])
  })

  it('excluye partidas con monto presupuestado > 0 (suma global manual)', () => {
    const lumpSum = makeCategory({ id: 'lump', budgeted_amount: 50000 })
    const result = findEmptyCategories([lumpSum], {}, noSpent)
    expect(result).toEqual([])
  })

  it('excluye partidas con gasto registrado para no orfanar transacciones', () => {
    const spentOne = makeCategory({ id: 'spent' })
    const spentByCategory = (id: string) => (id === 'spent' ? 1234 : 0)
    const result = findEmptyCategories([spentOne], {}, spentByCategory)
    expect(result).toEqual([])
  })

  it('separa correctamente vacías de no vacías en un set mixto', () => {
    const cats = [
      makeCategory({ id: 'preliminares' }), // vacía
      makeCategory({ id: 'estructura' }), // con subpartidas
      makeCategory({ id: 'muros', budgeted_amount: 1000 }), // con monto
      makeCategory({ id: 'pisos' }), // con gasto
      makeCategory({ id: 'pintura' }), // vacía
    ]
    const itemsByCategory = { estructura: [makeItem('estructura')] }
    const spentByCategory = (id: string) => (id === 'pisos' ? 999 : 0)

    const result = findEmptyCategories(cats, itemsByCategory, spentByCategory)
    expect(result.map((c) => c.id)).toEqual(['preliminares', 'pintura'])
  })

  it('coacciona budgeted_amount string "0" a vacío (datos crudos de la BD)', () => {
    const raw = makeCategory({ id: 'raw' })
    // Simula numeric devuelto como string por el driver.
    ;(raw as unknown as { budgeted_amount: string }).budgeted_amount = '0'
    const result = findEmptyCategories([raw], {}, noSpent)
    expect(result.map((c) => c.id)).toEqual(['raw'])
  })
})
