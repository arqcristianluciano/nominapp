import { describe, it, expect } from 'vitest'
import type { Supplier } from '@/types/database'
import { normalizeSupplierName, findSupplierByName } from './supplierMatch'

function makeSupplier(name: string, overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    rnc: null,
    contact_phone: null,
    bank_account: null,
    bank_name: null,
    tipo_cuenta: null,
    payment_terms: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('normalizeSupplierName', () => {
  it('recorta los espacios de los extremos', () => {
    expect(normalizeSupplierName('  Ferretería Central  ')).toBe('ferretería central')
  })

  it('colapsa espacios internos múltiples', () => {
    expect(normalizeSupplierName('Cemento   GRIS')).toBe('cemento gris')
  })

  it('pasa todo a minúsculas', () => {
    expect(normalizeSupplierName('PROVEEDOR XYZ')).toBe('proveedor xyz')
  })

  it('una cadena vacía o de solo espacios queda vacía', () => {
    expect(normalizeSupplierName('   ')).toBe('')
    expect(normalizeSupplierName('')).toBe('')
  })
})

describe('findSupplierByName', () => {
  const suppliers = [
    makeSupplier('Ferretería Central'),
    makeSupplier('Cemento Gris'),
    makeSupplier('Arena Procesada SRL'),
  ]

  it('encuentra una coincidencia exacta', () => {
    expect(findSupplierByName(suppliers, 'Cemento Gris')?.name).toBe('Cemento Gris')
  })

  it('ignora mayúsculas/minúsculas', () => {
    expect(findSupplierByName(suppliers, 'cemento gris')?.name).toBe('Cemento Gris')
    expect(findSupplierByName(suppliers, 'FERRETERÍA CENTRAL')?.name).toBe('Ferretería Central')
  })

  it('ignora espacios de extremos e internos', () => {
    expect(findSupplierByName(suppliers, '  Cemento   Gris ')?.name).toBe('Cemento Gris')
  })

  it('devuelve undefined cuando no hay coincidencia', () => {
    expect(findSupplierByName(suppliers, 'Bloques del Este')).toBeUndefined()
  })

  it('devuelve undefined para un nombre vacío o de solo espacios', () => {
    expect(findSupplierByName(suppliers, '')).toBeUndefined()
    expect(findSupplierByName(suppliers, '   ')).toBeUndefined()
  })

  it('también detecta proveedores inactivos (para evitar duplicarlos)', () => {
    const withInactive = [...suppliers, makeSupplier('Bloques del Sur', { is_active: false })]
    expect(findSupplierByName(withInactive, 'bloques del sur')?.is_active).toBe(false)
  })
})
