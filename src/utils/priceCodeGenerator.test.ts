import { describe, it, expect } from 'vitest'
import type { PriceListItem } from '@/types/database'
import { generatePriceCode } from './priceCodeGenerator'
import { PRICE_LIST_CATEGORY_VALUES, PRICE_LIST_CATEGORY_PREFIX } from '@/constants/priceListCategories'

/** Build a minimal PriceListItem for fixtures. */
function item(partial: Partial<PriceListItem>): PriceListItem {
  return {
    id: crypto.randomUUID(),
    project_id: 'p1',
    category: 'material',
    code: null,
    description: 'x',
    unit: 'UND',
    unit_price: 0,
    ...partial,
  }
}

describe('generatePriceCode', () => {
  it('produces the canonical prefix and a zero-padded sequence for every category', () => {
    for (const category of PRICE_LIST_CATEGORY_VALUES) {
      const code = generatePriceCode(category, [])
      expect(code).toBe(`${PRICE_LIST_CATEGORY_PREFIX[category]}-001`)
    }
  })

  it('increments only within the same category', () => {
    const existing = [
      item({ code: 'MO-001', category: 'labor' }),
      item({ code: 'MO-002', category: 'labor' }),
      item({ code: 'AJ-005', category: 'adjustment' }),
    ]
    expect(generatePriceCode('labor', existing)).toBe('MO-003')
    // Adjustment must NOT be derailed by the labor codes — this is the case
    // from the original bug report (an "Ajuste" row showing an "MO-" code).
    expect(generatePriceCode('adjustment', existing)).toBe('AJ-006')
    expect(generatePriceCode('material', existing)).toBe('MAT-001')
  })

  it('ignores items without a code', () => {
    const existing = [item({ code: null, category: 'labor' })]
    expect(generatePriceCode('labor', existing)).toBe('MO-001')
  })
})
