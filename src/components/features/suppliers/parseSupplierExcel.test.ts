import { describe, it, expect } from 'vitest'
import { parseSupplierRows } from './parseSupplierExcel'

describe('parseSupplierRows', () => {
  it('parsea una fila válida con todos los campos', () => {
    const rows = [
      ['Nombre', 'RNC', 'Teléfono', 'Banco', 'Número de cuenta', 'Tipo de cuenta', 'Condiciones de pago'],
      ['Materiales SA', '123456789', '809-555-0001', 'Banco Popular', '123456789012', 'ahorros', 'Credito por Factura'],
    ]
    const { rows: result } = parseSupplierRows(rows)
    expect(result).toHaveLength(1)
    expect(result[0].valid).toBe(true)
    expect(result[0].name).toBe('Materiales SA')
    expect(result[0].rnc).toBe('123456789')
    expect(result[0].bank_account).toBe('123456789012')
    expect(result[0].tipo_cuenta).toBe('ahorros')
    expect(result[0].payment_terms).toBe('Credito por Factura')
  })

  it('acepta "corriente" como tipo de cuenta', () => {
    const rows = [['Proveedor X', '', '', '', '', 'corriente', '']]
    const { rows: result } = parseSupplierRows(rows)
    expect(result[0].valid).toBe(true)
    expect(result[0].tipo_cuenta).toBe('corriente')
  })

  it('normaliza variantes de tipo de cuenta (Ahorros, AHORROS, ahorro)', () => {
    for (const variant of ['Ahorros', 'AHORROS', 'ahorro']) {
      const rows = [['Proveedor', '', '', '', '', variant, '']]
      const { rows: result } = parseSupplierRows(rows)
      expect(result[0].valid).toBe(true)
      expect(result[0].tipo_cuenta).toBe('ahorros')
    }
  })

  it('marca como inválida una fila sin nombre', () => {
    const rows = [['', '123456789', '', '', '', '', '']]
    const { rows: result } = parseSupplierRows(rows)
    expect(result[0].valid).toBe(false)
    expect(result[0].error).toMatch(/nombre/i)
  })

  it('marca como inválida si el número de cuenta tiene letras', () => {
    const rows = [['Proveedor Y', '', '', 'Banco', 'ABC-123', 'ahorros', '']]
    const { rows: result } = parseSupplierRows(rows)
    expect(result[0].valid).toBe(false)
    expect(result[0].error).toMatch(/dígitos/i)
  })

  it('marca como inválido un tipo de cuenta desconocido', () => {
    const rows = [['Proveedor Z', '', '', '', '', 'plazo_fijo', '']]
    const { rows: result } = parseSupplierRows(rows)
    expect(result[0].valid).toBe(false)
    expect(result[0].error).toMatch(/no válido/i)
  })

  it('ignora la fila de encabezado y filas vacías', () => {
    const rows = [
      ['Nombre', 'RNC', 'Teléfono', 'Banco', 'Número de cuenta', 'Tipo de cuenta', 'Condiciones de pago'],
      ['', '', '', '', '', '', ''],
      ['Proveedor A', '', '', '', '', '', ''],
    ]
    const { rows: result } = parseSupplierRows(rows)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Proveedor A')
  })

  it('acepta fila sin campos opcionales (solo nombre)', () => {
    const rows = [['Solo Nombre', '', '', '', '', '', '']]
    const { rows: result } = parseSupplierRows(rows)
    expect(result[0].valid).toBe(true)
    expect(result[0].rnc).toBeNull()
    expect(result[0].bank_account).toBeNull()
    expect(result[0].tipo_cuenta).toBeNull()
  })

  it('parsea múltiples filas correctamente', () => {
    const rows = [
      ['Nombre', 'RNC', 'Teléfono', 'Banco', 'Número de cuenta', 'Tipo de cuenta', 'Condiciones de pago'],
      ['Proveedor A', '', '', '', '', '', ''],
      ['Proveedor B', '987654321', '809-555-9999', 'Reservas', '000111222333', 'corriente', 'Pago Cash'],
      ['', '', '', '', '', '', ''],
      ['Proveedor C', '', '', '', '12abc', '', ''],
    ]
    const { rows: result } = parseSupplierRows(rows)
    expect(result).toHaveLength(3)
    expect(result[0].valid).toBe(true)
    expect(result[1].valid).toBe(true)
    expect(result[2].valid).toBe(false)
  })
})
