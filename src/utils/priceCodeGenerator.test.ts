import { describe, it, expect } from 'vitest'
import { generateBudgetItemCode, generatePriceCode } from './priceCodeGenerator'
import type { PriceListItem } from '@/types/database'

describe('generateBudgetItemCode', () => {
  it('sugiere el siguiente número de la secuencia del capítulo', () => {
    const items = [{ code: '1.1' }, { code: '1.2' }, { code: '1.3' }, { code: '1.4' }]
    expect(generateBudgetItemCode(1, items)).toBe('1.5')
  })

  it('usa el orden del capítulo como prefijo, no un valor ajeno', () => {
    // Subpartidas de otro capítulo no deben afectar la secuencia.
    const items = [{ code: '3.1' }, { code: '3.2' }]
    expect(generateBudgetItemCode(1, items)).toBe('1.1')
  })

  it('empieza en .1 cuando el capítulo está vacío', () => {
    expect(generateBudgetItemCode(5, [])).toBe('5.1')
  })

  it('ignora códigos nulos o con formato distinto', () => {
    const items = [{ code: null }, { code: 'X' }, { code: '2.7' }]
    expect(generateBudgetItemCode(2, items)).toBe('2.8')
  })
})

describe('generatePriceCode', () => {
  it('genera código por categoría con prefijo y secuencia', () => {
    const items = [
      { id: '1', project_id: 'p', category: 'labor', code: 'MO-001', description: '', unit: '', unit_price: 0 },
    ] as PriceListItem[]
    expect(generatePriceCode('labor', items)).toBe('MO-002')
    expect(generatePriceCode('adjustment', items)).toBe('AJ-001')
  })
})
