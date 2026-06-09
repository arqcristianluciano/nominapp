/**
 * Utilidades CSV (estándar RFC 4180): separador coma, comillas dobles, escape
 * duplicando `"`, y entrecomillado de valores con coma, comilla o salto de línea.
 */

type CsvCell = string | number | null | undefined

/**
 * Neutraliza la "inyeccion de formulas" en CSV: si una celda de TEXTO empieza con
 * un caracter que Excel/Sheets interpretaria como formula (= + - @, tab o retorno),
 * se le antepone un apostrofo para que se trate como texto. No se tocan los numeros
 * (incluidos negativos), que llegan como `number`, por lo que no se corrompen datos.
 */
function neutralizeFormula(value: CsvCell): string {
  if (typeof value !== 'string') return value == null ? '' : String(value)
  // Si parece un numero (ej. "-50.00", "+3"), se deja igual.
  if (/^[+-]?\d/.test(value)) return value
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

/** Escapa un valor para una celda CSV (incluye proteccion contra inyeccion de formulas). */
export function sanitizeCsvCell(value: CsvCell): string {
  const str = neutralizeFormula(value)
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
