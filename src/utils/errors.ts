/** Traduce errores técnicos comunes de la base de datos a lenguaje claro. */
function translateDbError(message: string): string {
  if (/row-level security|permission denied/i.test(message)) {
    return 'Tu usuario no tiene permiso para realizar esta acción. Inicia sesión con un usuario con más permisos (por ejemplo, el administrador) e inténtalo de nuevo.'
  }
  // Errores de negocio con prefijo tipo "CODIGO: mensaje" (lanzados con RAISE
  // desde la base de datos): se muestra solo el mensaje claro, sin el código.
  const businessError = message.match(
    /^(MONTH_CLOSED|NOT_AUTHORIZED|NOT_AUTHENTICATED|INSUFFICIENT_STOCK|OUT_REQUIRES_PARTIDA|NOT_AUTHORIZED_OVERRIDE|EXCEEDS_PERIOD_CAP):\s*(.+)$/s,
  )
  if (businessError) return businessError[2]
  return message
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return translateDbError(error.message)
  if (typeof error === 'string') return translateDbError(error)
  if (error && typeof error === 'object' && 'message' in error) {
    return translateDbError(String((error as { message: unknown }).message))
  }
  return String(error)
}
