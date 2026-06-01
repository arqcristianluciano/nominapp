import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PRICE_LIST_CATEGORIES, PRICE_LIST_CATEGORY_VALUES, PRICE_LIST_CATEGORY_PREFIX } from './priceListCategories'

/**
 * These tests guard against the class of bug where the UI offers a price
 * category that the database CHECK constraint does not allow, so saving that
 * category fails silently. They keep the in-app constant, the code-prefix map
 * and the SQL schema in agreement.
 */
describe('price-list category consistency', () => {
  it('has a code prefix for every category', () => {
    for (const value of PRICE_LIST_CATEGORY_VALUES) {
      expect(PRICE_LIST_CATEGORY_PREFIX[value], `missing prefix for ${value}`).toBeTruthy()
    }
  })

  it('has unique values and labels', () => {
    const values = PRICE_LIST_CATEGORIES.map((c) => c.value)
    const labels = PRICE_LIST_CATEGORIES.map((c) => c.label)
    expect(new Set(values).size).toBe(values.length)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('every UI category is allowed by the price_list_items CHECK in supabase-schema.sql', () => {
    const schema = readFileSync(resolve(process.cwd(), 'supabase-schema.sql'), 'utf8')
    // Scope to the price_list_items table block (the file has another
    // `category` CHECK for mercado_budget_lines with different values).
    const table = schema.match(/create table[^;]*price_list_items\s*\([\s\S]*?\);/i)
    expect(table, 'price_list_items table not found in supabase-schema.sql').toBeTruthy()
    const match = table![0].match(/category text not null check \(category in \(([^)]*)\)\)/i)
    expect(match, 'price_list_items category CHECK not found in supabase-schema.sql').toBeTruthy()
    const allowed = match![1].split(',').map((s) => s.trim().replace(/'/g, ''))
    for (const value of PRICE_LIST_CATEGORY_VALUES) {
      expect(allowed, `category "${value}" missing from DB CHECK constraint`).toContain(value)
    }
  })
})
