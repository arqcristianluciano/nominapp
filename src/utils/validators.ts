/**
 * Validators for Dominican Republic specific formats.
 *
 * - Cédula: 11 digits, optionally formatted as XXX-XXXXXXX-X
 * - RNC: 9 or 11 digits, optionally with dashes
 * - Phone: 10 digits (RD), optionally with dashes/parentheses, optional +1 prefix
 * - Email: simple regex validation
 */

/**
 * Strip non-digit characters from a string.
 */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/**
 * Validates a Dominican Republic cédula.
 * Accepts XXX-XXXXXXX-X format with or without dashes.
 * Must be exactly 11 digits.
 */
export function isCedula(s: string): boolean {
  if (typeof s !== 'string') return false
  const trimmed = s.trim()
  if (!trimmed) return false
  // Only digits or digits with dashes allowed
  if (!/^[\d-]+$/.test(trimmed)) return false
  const digits = digitsOnly(trimmed)
  return digits.length === 11
}

/**
 * Validates a Dominican Republic RNC.
 * Accepts 9 or 11 digits, with or without dashes.
 */
export function isRNC(s: string): boolean {
  if (typeof s !== 'string') return false
  const trimmed = s.trim()
  if (!trimmed) return false
  // Only digits or digits with dashes allowed
  if (!/^[\d-]+$/.test(trimmed)) return false
  const digits = digitsOnly(trimmed)
  return digits.length === 9 || digits.length === 11
}

/**
 * Validates a Dominican Republic phone number.
 * Accepts 10 digits with or without dashes/parentheses/spaces,
 * optionally prefixed with +1.
 */
export function isPhone(s: string): boolean {
  if (typeof s !== 'string') return false
  const trimmed = s.trim()
  if (!trimmed) return false
  // Allow digits, dashes, parentheses, spaces, and an optional leading +1
  if (!/^(\+?1[\s-]?)?[\d\s()-]+$/.test(trimmed)) return false
  let digits = digitsOnly(trimmed)
  // If +1 prefix or leading 1, strip it for length check
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }
  return digits.length === 10
}

/**
 * Validates an email using a simple regex.
 */
export function isEmail(s: string): boolean {
  if (typeof s !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/**
 * Longitud mínima exigida a las contraseñas. Debe coincidir con la regla del
 * servidor (Edge Function admin-create-user) y con minimum_password_length en
 * supabase/config.toml.
 */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Valida la fortaleza de una contraseña. Misma regla que aplica el servidor:
 * al menos 8 caracteres, con mayúscula, minúscula y número. Sirve para avisar
 * al usuario en la pantalla ANTES de enviar (el servidor sigue siendo la
 * autoridad final).
 */
export function isStrongPassword(s: string): boolean {
  if (typeof s !== 'string') return false
  return s.length >= MIN_PASSWORD_LENGTH && /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)
}
