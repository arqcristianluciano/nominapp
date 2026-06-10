/** Traduce errores técnicos comunes de la base de datos a lenguaje claro. */
function translateDbError(message: string): string {
  if (/row-level security|permission denied/i.test(message)) {
    return 'Tu usuario no tiene permiso para realizar esta acción. Inicia sesión con un usuario con más permisos (por ejemplo, el administrador) e inténtalo de nuevo.'
  }
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
