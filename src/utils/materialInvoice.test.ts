import { describe, it, expect } from 'vitest'
import { sumInvoiceItems, buildInvoiceSummary } from './materialInvoice'

describe('sumInvoiceItems', () => {
  it('suma los montos de los items', () => {
    expect(sumInvoiceItems([{ amount: 100 }, { amount: 250.5 }, { amount: 0.25 }])).toBe(350.75)
  })

  it('devuelve 0 sin items', () => {
    expect(sumInvoiceItems([])).toBe(0)
  })

  it('redondea a 2 decimales (sin errores de punto flotante)', () => {
    expect(sumInvoiceItems([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3)
  })

  it('tolera montos no numericos tratandolos como 0', () => {
    expect(sumInvoiceItems([{ amount: NaN }, { amount: 50 }])).toBe(50)
  })
})

describe('buildInvoiceSummary', () => {
  it('une las descripciones con coma', () => {
    expect(buildInvoiceSummary([{ description: 'CEMENTO' }, { description: 'ARENA' }])).toBe('CEMENTO, ARENA')
  })

  it('ignora descripciones vacias o con solo espacios', () => {
    expect(buildInvoiceSummary([{ description: 'CEMENTO' }, { description: '  ' }, { description: '' }])).toBe(
      'CEMENTO',
    )
  })

  it('trunca resumenes muy largos con elipsis', () => {
    const items = Array.from({ length: 50 }, () => ({ description: 'MATERIAL' }))
    const summary = buildInvoiceSummary(items, 40)
    expect(summary.length).toBeLessThanOrEqual(40)
    expect(summary.endsWith('…')).toBe(true)
  })
})
