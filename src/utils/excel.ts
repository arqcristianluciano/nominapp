export async function readExcelRowsFromFile(file: File): Promise<unknown[][]> {
  const buffer = await file.arrayBuffer()
  return readExcelRowsFromBuffer(buffer)
}

export async function readExcelRowsFromBuffer(
  buffer: ArrayBuffer | Uint8Array,
): Promise<unknown[][]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
}

export function parseExcelNumber(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined || raw === '') return NaN
  if (typeof raw === 'number') return raw
  const n = parseFloat(String(raw).replace(/,/g, '.'))
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
