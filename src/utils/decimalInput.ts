/**
 * Helpers for decimal number input/output in the Dominican Republic locale.
 *
 * RD uses comma (",") as decimal separator and dot (".") as thousands separator.
 * Inputs from users may arrive in several formats; this module normalizes them
 * to a JS number, and formats numbers back into the local "1.234,56" form for
 * display in editable inputs.
 *
 * Accepted input formats:
 * - Plain: "1234.56", "1234,56"
 * - US: "1,234.56" (comma thousands, dot decimal)
 * - RD: "1.234,56" (dot thousands, comma decimal)
 * - With surrounding/inner whitespace: " 1 234,56 "
 * - Negative numbers: "-1.234,56"
 *
 * `parseDecimalInput` returns `null` for empty strings or anything that does
 * not represent a finite number.
 */

/**
 * Parse a user-entered decimal string into a JS number.
 *
 * Returns `null` if the string is empty (after trimming) or cannot be parsed
 * as a finite number.
 */
export function parseDecimalInput(s: string): number | null {
  if (typeof s !== 'string') return null

  // Remove all whitespace (regular spaces, tabs, non-breaking spaces, etc.).
  const stripped = s.replace(/\s+/g, '')
  if (stripped === '') return null

  // Only digits, separators (. ,) and an optional leading +/- are allowed.
  if (!/^[+-]?[\d.,]+$/.test(stripped)) return null

  const hasDot = stripped.includes('.')
  const hasComma = stripped.includes(',')

  // Extract the optional sign so we can validate the digit/separator body
  // without it tripping up the regexes below.
  const signMatch = stripped.match(/^[+-]/)
  const sign = signMatch ? signMatch[0] : ''
  const body = sign ? stripped.slice(1) : stripped

  /**
   * Validates a string composed of digit groups separated by `sep` as a
   * well-formed thousands-grouped integer (leading group: 1-3 digits, each
   * subsequent group: exactly 3 digits). Returns the digits-only form, or
   * `null` if malformed.
   */
  const stripThousands = (s: string, sep: '.' | ','): string | null => {
    const escaped = sep === '.' ? '\\.' : ','
    const re = new RegExp(`^\\d{1,3}(?:${escaped}\\d{3})*$`)
    if (!re.test(s)) return null
    return s.split(sep).join('')
  }

  let normalized: string | null

  if (hasDot && hasComma) {
    // Both separators present: the right-most one is the decimal separator,
    // the other is the thousands separator.
    const lastDot = body.lastIndexOf('.')
    const lastComma = body.lastIndexOf(',')
    if (lastComma > lastDot) {
      // RD style: "1.234,56" -> thousands ".", decimal ","
      const commaIdx = body.lastIndexOf(',')
      const intPart = body.slice(0, commaIdx)
      const fracPart = body.slice(commaIdx + 1)
      if (!/^\d+$/.test(fracPart)) return null
      const ints = stripThousands(intPart, '.')
      if (ints === null) return null
      normalized = `${ints}.${fracPart}`
    } else {
      // US style: "1,234.56" -> thousands ",", decimal "."
      const dotIdx = body.lastIndexOf('.')
      const intPart = body.slice(0, dotIdx)
      const fracPart = body.slice(dotIdx + 1)
      if (!/^\d+$/.test(fracPart)) return null
      const ints = stripThousands(intPart, ',')
      if (ints === null) return null
      normalized = `${ints}.${fracPart}`
    }
  } else if (hasComma) {
    // Only commas. A single comma followed by 1-2 digits is treated as the
    // decimal separator ("1234,56"). Otherwise commas must form a well-formed
    // thousands grouping ("1,234" / "1,234,567"); anything else is malformed.
    const parts = body.split(',')
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
      normalized = `${parts[0]}.${parts[1]}`
    } else if (parts.length === 2 && parts[0] === '0' && /^\d+$/.test(parts[1])) {
      // "0,125" nunca es una agrupación de miles válida (ningún número de miles
      // empieza en "0"): es un decimal (0.125). Evita multiplicar por mil.
      normalized = `0.${parts[1]}`
    } else {
      normalized = stripThousands(body, ',')
    }
  } else if (hasDot) {
    // Only dots. A single dot followed by 1-2 digits is treated as the
    // decimal separator ("1234.56"). Otherwise dots must form a well-formed
    // thousands grouping ("1.234" / "1.234.567"); anything else is malformed.
    const parts = body.split('.')
    if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
      normalized = body
    } else if (parts.length === 2 && parts[0] === '0' && /^\d+$/.test(parts[1])) {
      // "0.125" nunca es una agrupación de miles válida: es un decimal (0.125).
      normalized = body
    } else {
      normalized = stripThousands(body, '.')
    }
  } else {
    normalized = body
  }

  if (normalized === null) return null
  normalized = sign + normalized

  // Guard against pathological strings that slipped through (e.g. "-", "+").
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) return null

  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return n
}

/**
 * Format a number for display inside an editable input using the RD locale
 * (e.g. `1234.56` -> `"1.234,56"`).
 *
 * Returns an empty string for `null`/`undefined`/`NaN`/non-finite values so
 * the input can show a blank value. Negative numbers preserve the leading
 * minus sign.
 *
 * Built manually (without `Intl`) so output is stable across Node/browser
 * ICU builds — `Intl.NumberFormat('es-DO', ...)` actually uses US-style
 * separators in some runtimes, which is not what we want here.
 */
export function formatDecimalForInput(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return ''
  if (typeof n !== 'number' || !Number.isFinite(n)) return ''

  const safeDecimals = Math.max(0, Math.floor(decimals))
  const negative = n < 0
  const abs = Math.abs(n)
  const fixed = abs.toFixed(safeDecimals)
  const [intPart, fracPart = ''] = fixed.split('.')

  // Group integer digits in threes from the right with "." as separator.
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  const result = safeDecimals > 0 ? `${grouped},${fracPart}` : grouped
  return negative ? `-${result}` : result
}
