import type { BudgetCategory, BudgetItem } from '@/types/database'

type CategoryLike = Pick<BudgetCategory, 'code' | 'sort_order'>
type ItemLike = Pick<BudgetItem, 'code'>

/**
 * Identificador de la partida usado como prefijo de las subpartidas.
 *
 * Se toma el primer token del `code` de la categoría — por ejemplo `"1"` en
 * `"1 - PRELIMINARES"` o `"T2"` en `"T2 - EXCAVACION"` — para que el prefijo
 * coincida siempre con el número de partida que ve el usuario y con los
 * códigos de las subpartidas ya existentes. Si el código no contiene dígitos
 * se usa el `sort_order` como respaldo.
 */
export function partidaPrefix(category: CategoryLike): string {
  const firstToken = category.code?.trim().split(/\s+/)[0] ?? ''
  if (firstToken && /\d/.test(firstToken)) return firstToken
  return String(category.sort_order)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Mayor sufijo numérico entre las subpartidas que ya siguen el patrón
 * `"<prefijo>.<número>"` de la partida. Devuelve 0 si ninguna lo sigue.
 */
export function maxBudgetItemSuffix(category: CategoryLike, items: ItemLike[]): number {
  const prefix = partidaPrefix(category)
  const pattern = new RegExp(`^${escapeRegExp(prefix)}\\.(\\d+)$`)
  let max = 0
  for (const item of items) {
    const code = item.code?.trim()
    if (!code) continue
    const match = pattern.exec(code)
    if (match) {
      const value = parseInt(match[1], 10)
      if (value > max) max = value
    }
  }
  return max
}

/** Sufijo numérico final de un código, o null si no termina en número. */
function trailingNumber(code: string | null | undefined): number | null {
  const match = code?.trim().match(/(\d+)\s*$/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Siguiente código consecutivo para una nueva subpartida: `"<prefijo>.<n>"`.
 *
 * `n` se calcula como el mayor sufijo numérico existente que ya sigue el
 * patrón `"<prefijo>.<número>"` + 1. Si ninguna subpartida sigue ese patrón
 * (p. ej. todas tienen el código vacío tras una importación) se usa la
 * cantidad de subpartidas + 1. De esta forma la numeración es siempre
 * consecutiva y nunca colisiona aunque se borren filas intermedias.
 */
export function nextBudgetItemCode(category: CategoryLike, items: ItemLike[]): string {
  const prefix = partidaPrefix(category)
  const max = maxBudgetItemSuffix(category, items)
  const next = max > 0 ? max + 1 : items.length + 1
  return `${prefix}.${next}`
}

/**
 * Asigna códigos consecutivos a subpartidas que se van a importar y que no
 * traen código, continuando desde el mayor código existente de cada partida.
 * Los códigos que ya vengan definidos (p. ej. del Excel) se respetan, pero
 * avanzan el contador para que los autogenerados que sigan no colisionen.
 *
 * Es una función pura: no muta la entrada y requiere que cada ítem ya tenga
 * resuelto su `budget_category_id`.
 */
export function assignImportCodes<T extends { code: string | null; budget_category_id: string }>(
  items: T[],
  categoryById: Map<string, CategoryLike>,
  existingItemsByCategory: Record<string, ItemLike[]> = {},
): T[] {
  const counter = new Map<string, number>()
  const suffixOf = (categoryId: string): number => {
    if (!counter.has(categoryId)) {
      const category = categoryById.get(categoryId)
      const existing = existingItemsByCategory[categoryId] ?? []
      counter.set(categoryId, category ? maxBudgetItemSuffix(category, existing) : 0)
    }
    return counter.get(categoryId) ?? 0
  }

  return items.map((item) => {
    const categoryId = item.budget_category_id
    const existingCode = item.code?.trim()

    if (existingCode) {
      // Respetar el código del Excel; avanzar el contador si su sufijo es mayor.
      const trailing = trailingNumber(existingCode)
      if (trailing !== null && trailing > suffixOf(categoryId)) {
        counter.set(categoryId, trailing)
      }
      return { ...item, code: existingCode }
    }

    const category = categoryById.get(categoryId)
    if (!category) return item // Sin categoría conocida: no se puede numerar.

    const next = suffixOf(categoryId) + 1
    counter.set(categoryId, next)
    return { ...item, code: `${partidaPrefix(category)}.${next}` }
  })
}

/**
 * Código a mostrar para una subpartida: su `code` almacenado si existe, o el
 * código consecutivo calculado por posición (1-based) como respaldo, de modo
 * que las subpartidas sin código se vean igualmente numeradas (1.1, 1.2, …).
 */
export function budgetItemDisplayCode(category: CategoryLike, item: ItemLike, index: number): string {
  const code = item.code?.trim()
  if (code) return code
  return `${partidaPrefix(category)}.${index + 1}`
}
