export async function readExcelRowsFromFile(file: File): Promise<unknown[][]> {
  const MAX_BYTES = 20 * 1024 * 1024
  if (file.size > MAX_BYTES) throw new Error('Archivo demasiado grande (max 20 MB)')
  const buffer = await file.arrayBuffer()
  return readExcelRowsFromBuffer(buffer)
}

export async function readExcelRowsFromBuffer(buffer: ArrayBuffer | Uint8Array): Promise<unknown[][]> {
  const XLSX = await import('xlsx')
  let wb: ReturnType<typeof XLSX.read> | null = XLSX.read(buffer, { type: 'array' })
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('El archivo no contiene hojas')
  }
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  // Liberar referencia al workbook para ayudar al GC en archivos grandes.
  wb = null
  const MAX_ROWS = 10000
  if (rows.length > MAX_ROWS) throw new Error('Demasiadas filas (max 10000)')
  return rows
}

const FORMULA_PREFIXES = ['=', '+', '-', '@']

/**
 * Neutraliza posibles formulas Excel (CSV injection) anteponiendo un apostrofe.
 * Usar antes de re-exportar valores de texto provenientes del usuario.
 */
export function sanitizeExcelCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.length === 0) return str
  if (FORMULA_PREFIXES.includes(str[0])) return `'${str}`
  return str
}

export function parseExcelNumber(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined || raw === '') return NaN
  if (typeof raw === 'number') return raw
  let s = String(raw).trim()
  // Si la celda viene como formula tipo "=123" o "=-123", ignorar el "=" y leer el resto.
  if (s.startsWith('=')) s = s.slice(1)
  const n = parseFloat(s.replace(/,/g, '.'))
  return n
}

export function rowToCells(row: unknown[], columns = 5): string[] {
  const cells: string[] = []
  for (let i = 0; i < columns; i++) {
    cells.push(String(row[i] ?? '').trim())
  }
  return cells
}

export function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}
