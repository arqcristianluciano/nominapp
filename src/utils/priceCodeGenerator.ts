import type { PriceListCategory, PriceListItem } from '@/types/database'

const PREFIX: Record<PriceListCategory, string> = {
  material: 'MAT',
  labor: 'MO',
  equipment: 'EQ',
  adjustment: 'AJ',
}

export function generatePriceCode(category: PriceListCategory, items: PriceListItem[]): string {
  const prefix = PREFIX[category]
  const existing = items
    .filter((i) => i.category === category)
    .map((i) => {
      const match = i.code?.match(/(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
  const next = existing.length ? Math.max(...existing) + 1 : 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

// Sugiere el siguiente código de subpartida siguiendo la secuencia "<capítulo>.<n>"
// (ej. con 1.1, 1.2, 1.3, 1.4 existentes devuelve "1.5"). El prefijo es el orden
// del capítulo, que es lo que el usuario ve como número de partida.
export function generateBudgetItemCode(categorySortOrder: number, items: { code: string | null }[]): string {
  const prefix = String(categorySortOrder)
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${escaped}\\.(\\d+)`)
  const numbers = items
    .map((it) => it.code?.match(re))
    .filter((m): m is RegExpMatchArray => m !== null && m !== undefined)
    .map((m) => parseInt(m[1], 10))
  const next = numbers.length ? Math.max(...numbers) + 1 : 1
  return `${prefix}.${next}`
}
