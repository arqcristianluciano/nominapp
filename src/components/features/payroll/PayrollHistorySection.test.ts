import { describe, expect, it } from 'vitest'
import { describeItemEdit } from './payrollHistoryUtils'

describe('describeItemEdit', () => {
  it('mapea el kind de la metadata a un texto legible', () => {
    expect(describeItemEdit({ kind: 'labor_item' })).toBe('partida de mano de obra')
    expect(describeItemEdit({ kind: 'material_invoice' })).toBe('factura de materiales')
  })

  it('devuelve null para metadata desconocida, vacía o ausente', () => {
    expect(describeItemEdit({ kind: 'otro' })).toBeNull()
    expect(describeItemEdit({})).toBeNull()
    expect(describeItemEdit(null)).toBeNull()
    expect(describeItemEdit(undefined)).toBeNull()
  })
})
