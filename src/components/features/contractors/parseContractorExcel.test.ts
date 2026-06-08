import { describe, it, expect } from 'vitest'
import { parseContractorRows } from './parseContractorExcel'

describe('parseContractorRows', () => {
  it('parsea una fila válida con todos los campos', () => {
    const rows = [
      ['Nombre', 'Especialidad', 'Cédula', 'Teléfono', 'Banco', 'Número de cuenta', 'Método de pago'],
      ['Juan Pérez', 'Albanilería', '001-1234567-8', '809-555-1001', 'Banco Popular', '111222333444', 'transferencia'],
    ]
    const { rows: result } = parseContractorRows(rows)
    expect(result).toHaveLength(1)
    expect(result[0].valid).toBe(true)
    expect(result[0].name).toBe('Juan Pérez')
    expect(result[0].specialty).toBe('Albanilería')
    expect(result[0].cedula).toBe('001-1234567-8')
    expect(result[0].bank_account).toBe('111222333444')
    expect(result[0].payment_method).toBe('transfer')
  })

  it('acepta "efectivo" y lo mapea a "cash"', () => {
    const rows = [['María López', '', '', '', '', '', 'efectivo']]
    const { rows: result } = parseContractorRows(rows)
    expect(result[0].valid).toBe(true)
    expect(result[0].payment_method).toBe('cash')
  })

  it('acepta "cheque" y lo mapea a "check"', () => {
    const rows = [['Carlos Díaz', '', '', '', '', '', 'cheque']]
    const { rows: result } = parseContractorRows(rows)
    expect(result[0].valid).toBe(true)
    expect(result[0].payment_method).toBe('check')
  })

  it('acepta "cash", "check", "transfer" directamente en inglés', () => {
    for (const [raw, expected] of [
      ['cash', 'cash'],
      ['check', 'check'],
      ['transfer', 'transfer'],
    ] as const) {
      const rows = [['Contratista A', '', '', '', '', '', raw]]
      const { rows: result } = parseContractorRows(rows)
      expect(result[0].valid).toBe(true)
      expect(result[0].payment_method).toBe(expected)
    }
  })

  it('marca como inválida una fila sin nombre', () => {
    const rows = [['', 'Albanilería', '', '', '', '', '']]
    const { rows: result } = parseContractorRows(rows)
    expect(result[0].valid).toBe(false)
    expect(result[0].error).toMatch(/nombre/i)
  })

  it('marca como inválida si el número de cuenta tiene letras', () => {
    const rows = [['Pedro Ruiz', '', '', '', 'Banco', 'ABC-123', '']]
    const { rows: result } = parseContractorRows(rows)
    expect(result[0].valid).toBe(false)
    expect(result[0].error).toMatch(/dígitos/i)
  })

  it('marca como inválido un método de pago desconocido', () => {
    const rows = [['Ana Torres', '', '', '', '', '', 'bitcoin']]
    const { rows: result } = parseContractorRows(rows)
    expect(result[0].valid).toBe(false)
    expect(result[0].error).toMatch(/no válido/i)
  })

  it('ignora la fila de encabezado y filas vacías', () => {
    const rows = [
      ['Nombre', 'Especialidad', 'Cédula', 'Teléfono', 'Banco', 'Número de cuenta', 'Método de pago'],
      ['', '', '', '', '', '', ''],
      ['Contratista A', 'Plomería', '', '', '', '', ''],
    ]
    const { rows: result } = parseContractorRows(rows)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Contratista A')
  })

  it('acepta fila solo con nombre (todos los opcionales vacíos)', () => {
    const rows = [['Solo Nombre', '', '', '', '', '', '']]
    const { rows: result } = parseContractorRows(rows)
    expect(result[0].valid).toBe(true)
    expect(result[0].specialty).toBeNull()
    expect(result[0].cedula).toBeNull()
    expect(result[0].bank_account).toBeNull()
    expect(result[0].payment_method).toBeNull()
  })

  it('parsea múltiples filas, válidas e inválidas', () => {
    const rows = [
      ['Nombre', 'Especialidad', 'Cédula', 'Teléfono', 'Banco', 'Número de cuenta', 'Método de pago'],
      ['Contratista A', 'Electricidad', '', '', '', '', 'efectivo'],
      ['Contratista B', '', '', '', '', 'ABC', ''], // cuenta inválida
      ['', '', '', '', '', '', ''], // vacía
      ['Contratista C', '', '', '', '', '', 'cash'],
    ]
    const { rows: result } = parseContractorRows(rows)
    expect(result).toHaveLength(3)
    expect(result[0].valid).toBe(true)
    expect(result[1].valid).toBe(false)
    expect(result[2].valid).toBe(true)
  })

  it('normaliza variantes de método de pago ignorando acentos y mayúsculas (Transferencia, TRANSFERENCIA)', () => {
    for (const variant of ['Transferencia', 'TRANSFERENCIA', 'transf']) {
      const rows = [['Contratista', '', '', '', '', '', variant]]
      const { rows: result } = parseContractorRows(rows)
      expect(result[0].valid).toBe(true)
      expect(result[0].payment_method).toBe('transfer')
    }
  })
})
