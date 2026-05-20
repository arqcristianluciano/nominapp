import type { BudgetCategory, BudgetItem } from '@/types/database'
import { normalizeText, parseExcelNumber, rowToCells } from '@/utils/excel'

export interface NewCategoryDraft {
  key: string
  code: string
  name: string
  sort_order: number
}

export interface ParsedItem {
  newCategoryKey: string | null
  categoryId: string | null
  categoryName: string
  isNewCategory: boolean
  code: string
  description: string
  unit: string
  quantity: number
  unit_price: number
  valid: boolean
  error?: string
}

export interface ImportPayload {
  newCategories: NewCategoryDraft[]
  items: (Omit<BudgetItem, 'id' | 'budget_category_id'> & {
    budget_category_id: string | null
    new_category_key: string | null
  })[]
}

function isExcelHeaderRow(colA: string, colB: string) {
  const a = normalizeText(colA)
  const b = normalizeText(colB)
  return (
    (a === 'codigo' || a === 'cod.' || a === 'cod') &&
    (b === 'descripcion' || b === 'desc.' || b === 'desc')
  )
}

function matchExistingCategory(categories: BudgetCategory[], name: string): BudgetCategory | null {
  const target = normalizeText(name)
  if (!target) return null
  return categories.find((c) => normalizeText(c.name) === target) ?? null
}

export function parseRows(
  rows: unknown[][],
  categories: BudgetCategory[],
): { items: ParsedItem[]; newCategories: NewCategoryDraft[] } {
  const items: ParsedItem[] = []
  const newCategories = new Map<string, NewCategoryDraft>()
  let nextSortOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0)

  type ChapterCtx = {
    id: string | null
    key: string | null
    name: string
    isNew: boolean
  }
  let chapter: ChapterCtx | null = null

  for (const row of rows) {
    const [colA, colB, colC, colD, colE] = rowToCells(row)
    if (!colA && !colB) continue
    if (isExcelHeaderRow(colA, colB)) continue

    const qty = parseExcelNumber(colD)
    const price = parseExcelNumber(colE)
    const looksLikeSubpartida = !!colC && !isNaN(qty) && qty > 0

    if (!looksLikeSubpartida) {
      const name = (colB || colA).trim()
      if (!name) continue

      const existing = matchExistingCategory(categories, name)
      if (existing) {
        chapter = { id: existing.id, key: null, name: existing.name, isNew: false }
      } else {
        const key = normalizeText(name)
        if (!newCategories.has(key)) {
          nextSortOrder += 1
          newCategories.set(key, {
            key,
            code: colA ? `${colA} - ${name.toUpperCase()}` : name,
            name,
            sort_order: nextSortOrder,
          })
        }
        chapter = { id: null, key, name, isNew: true }
      }
      continue
    }

    if (!chapter) {
      items.push({
        newCategoryKey: null,
        categoryId: null,
        categoryName: 'Sin partida',
        isNewCategory: false,
        code: colA,
        description: colB,
        unit: colC,
        quantity: qty,
        unit_price: isNaN(price) ? 0 : price,
        valid: false,
        error: 'No se detectó partida principal',
      })
      continue
    }

    items.push({
      newCategoryKey: chapter.key,
      categoryId: chapter.id,
      categoryName: chapter.name,
      isNewCategory: chapter.isNew,
      code: colA,
      description: colB,
      unit: colC,
      quantity: qty,
      unit_price: isNaN(price) ? 0 : price,
      valid: true,
    })
  }

  return { items, newCategories: Array.from(newCategories.values()) }
}
