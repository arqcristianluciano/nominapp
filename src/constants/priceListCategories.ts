import type { PriceListCategory } from '@/types/database'

/**
 * Single source of truth for the price-list categories.
 *
 * IMPORTANT: every value here must also be allowed by the database CHECK
 * constraint on `price_list_items.category` (see `supabase-schema.sql` and
 * migration `053_price_list_allow_adjustment.sql`). If the two drift apart,
 * inserting a price of the missing category fails silently — which is exactly
 * the bug that motivated centralizing this list. The test
 * `priceListCategories.test.ts` guards that the schema and this list agree.
 */
export const PRICE_LIST_CATEGORIES: { value: PriceListCategory; label: string }[] = [
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Mano de obra' },
  { value: 'equipment', label: 'Equipo' },
  { value: 'adjustment', label: 'Ajuste' },
]

/** Just the category values, in canonical order. */
export const PRICE_LIST_CATEGORY_VALUES: PriceListCategory[] = PRICE_LIST_CATEGORIES.map((c) => c.value)

/** Short code prefix used when auto-generating a price code per category. */
export const PRICE_LIST_CATEGORY_PREFIX: Record<PriceListCategory, string> = {
  material: 'MAT',
  labor: 'MO',
  equipment: 'EQ',
  adjustment: 'AJ',
}
