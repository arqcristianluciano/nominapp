import type { PriceListCategory, PriceListItem } from '@/types/database'

const PREFIX: Record<PriceListCategory, string> = {
  material:   'MAT',
  labor:      'MO',
  equipment:  'EQ',
  adjustment: 'AJ',
}

export function generatePriceCode(
  category: PriceListCategory,
  items: PriceListItem[],
): string {
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
