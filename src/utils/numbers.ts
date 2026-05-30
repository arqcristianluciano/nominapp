/**
 * Numeric formatters that tolerate null/undefined inputs.
 *
 * These helpers complement `currency.ts` but are nullable-safe and use the
 * em-dash placeholder ("—") for missing values, which is the convention
 * used across the UI for empty cells.
 */

const EMPTY = '—'

/**
 * Formats a value as a percentage string, e.g. `12.5%`.
 * Returns `"—"` when the value is null or undefined (or not finite).
 *
 * @param value Numeric percentage already expressed in "percent units"
 *              (i.e. `12.5` -> `"12.5%"`, not `0.125`).
 * @param decimals Number of decimal digits to render. Defaults to `1`.
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY
  }
  return `${value.toFixed(decimals)}%`
}

/**
 * Formats a quantity using Dominican Republic separators
 * (comma thousands, dot decimal) without any currency symbol.
 * Returns `"—"` when the value is null or undefined (or not finite).
 *
 * @param value Numeric value to format.
 * @param decimals Number of decimal digits to render. Defaults to `2`.
 */
export function formatQuantity(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY
  }
  return new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
