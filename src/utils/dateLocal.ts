export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseDateLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Formatea una fecha para mostrar (es-DO) sin correrse un día.
 *
 * Las columnas de solo fecha ("YYYY-MM-DD") se interpretan como medianoche UTC
 * con `new Date(...)`, y al mostrarlas en una zona detrás de UTC (RD es UTC-4)
 * retroceden al día anterior. Se fija el mediodía local para esas fechas; las
 * marcas de tiempo completas (con hora) se muestran tal cual.
 */
export function formatDateDMY(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return ''
  const s = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  const date = new Date(s)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-DO', options)
}
