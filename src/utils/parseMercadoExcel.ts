import * as XLSX from 'xlsx'
import type { MercadoCategory, ParsedMercadoLine } from '@/types/mercadoBudget'

const CATEGORY_KEYWORDS: Array<[string, MercadoCategory]> = [
  ['mano de obra', 'MANO_DE_OBRA'],
  ['mano_de_obra', 'MANO_DE_OBRA'],
  ['ajuste', 'AJUSTES'],
  ['equipo', 'EQUIPOS'],
  ['material', 'MATERIALES'],
]

function detectCategory(text: string): MercadoCategory | null {
  const lower = text.toLowerCase().trim()
  for (const [keyword, cat] of CATEGORY_KEYWORDS) {
    if (lower.includes(keyword)) return cat
  }
  return null
}

function parseNumber(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, '.'))
  return isNaN(n) ? 0 : n
}

function isCategoryHeader(cells: string[]): MercadoCategory | null {
  for (const cell of cells.slice(0, 3)) {
    if (!cell) continue
    const cat = detectCategory(cell)
    if (cat) return cat
  }
  return null
}

export function parseMercadoExcel(file: File): Promise<ParsedMercadoLine[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })

        const lines: ParsedMercadoLine[] = []
        let currentCategory: MercadoCategory | null = null
        let sortOrder = 0

        for (const row of raw) {
          const cells: string[] = row.map((v: any) => String(v ?? '').trim())
          const [colA, colB, colC, colD, colE] = cells

          if (!colA && !colB && !colC) continue

          // Primero: si tiene unidad + cantidad válida, es un ítem — nunca un header.
          // Esto evita que descripciones como "Ajuste de nivelación" sean tomadas como header.
          const qty = parseNumber(colD)
          const isLineItem = !!colC && qty > 0

          if (!isLineItem) {
            // Solo buscar categoría en filas que no son ítems
            const cat = isCategoryHeader(cells)
            if (cat) currentCategory = cat
            continue
          }

          if (!currentCategory) continue

          const price = parseNumber(colE)

          lines.push({
            category: currentCategory,
            code: colA || null,
            description: colB || colA,
            unit: colC,
            budgeted_quantity: qty,
            budgeted_unit_price: price,
            budgeted_total: qty * price,
            sort_order: ++sortOrder,
          })
        }

        resolve(lines)
      } catch {
        reject(new Error('No se pudo leer el archivo. Verifique que sea un Excel válido.'))
      }
    }

    reader.onerror = () => reject(new Error('Error al leer el archivo.'))
    reader.readAsBinaryString(file)
  })
}

export function computeBudgetTotals(lines: ParsedMercadoLine[]) {
  return lines.reduce(
    (acc, l) => {
      if (l.category === 'AJUSTES') acc.total_ajustes += l.budgeted_total
      else if (l.category === 'EQUIPOS') acc.total_equipos += l.budgeted_total
      else if (l.category === 'MANO_DE_OBRA') acc.total_mano_obra += l.budgeted_total
      else if (l.category === 'MATERIALES') acc.total_materiales += l.budgeted_total
      return acc
    },
    { total_ajustes: 0, total_equipos: 0, total_mano_obra: 0, total_materiales: 0 }
  )
}
