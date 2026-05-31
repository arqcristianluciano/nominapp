import type { Supplier } from '@/types/database'

/**
 * Normaliza un nombre de proveedor para poder compararlo:
 * recorta espacios de los extremos, colapsa espacios internos y pasa a
 * minúsculas. Así "Cemento  GRIS " y "cemento gris" se consideran iguales.
 */
export function normalizeSupplierName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Busca un proveedor existente cuyo nombre coincida con `name`, ignorando
 * mayúsculas/minúsculas y diferencias de espacios. Devuelve el proveedor
 * encontrado o `undefined` si no hay coincidencia.
 */
export function findSupplierByName(suppliers: Supplier[], name: string): Supplier | undefined {
  const target = normalizeSupplierName(name)
  if (!target) return undefined
  return suppliers.find((s) => normalizeSupplierName(s.name) === target)
}
