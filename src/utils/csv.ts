/**
 * Utilidades CSV (estándar RFC 4180): separador coma, comillas dobles, escape
 * duplicando `"`, y entrecomillado de valores con coma, comilla o salto de línea.
 */

type CsvCell = string | number | null | undefined

/** Escapa un valor para una celda CSV. */
export function sanitizeCsvCell(value: CsvCell): string {
  const str = value == null ? '' : String(value)
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

/** Serializa filas a texto CSV con BOM UTF-8 y saltos CRLF. */
export function rowsToCsv(rows: ReadonlyArray<ReadonlyArray<CsvCell>>): string {
  return '﻿' + rows.map((row) => row.map(sanitizeCsvCell).join(',')).join('\r\n')
}

/** Genera un CSV a partir de filas y dispara su descarga en el navegador. */
export function downloadCsv(filename: string, rows: ReadonlyArray<ReadonlyArray<CsvCell>>): void {
  const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
