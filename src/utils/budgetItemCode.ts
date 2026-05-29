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
  const pattern = new RegExp(`^${escapeRegExp(prefix)}\\.(\\d+)$`)

  let maxSuffix = 0
  let matched = false
  for (const item of items) {
    const code = item.code?.trim()
    if (!code) continue
    const match = pattern.exec(code)
    if (match) {
      matched = true
      const value = parseInt(match[1], 10)
      if (value > maxSuffix) maxSuffix = value
    }
  }

  const next = matched ? maxSuffix + 1 : items.length + 1
  return `${prefix}.${next}`
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
