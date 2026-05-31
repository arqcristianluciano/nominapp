import type { MercadoCategory, ParsedMercadoLine } from '@/types/mercadoBudget'
import { parseExcelNumber, readExcelRowsFromFile, rowToCells } from '@/utils/excel'

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

function isCategoryHeader(cells: string[]): MercadoCategory | null {
  for (const cell of cells.slice(0, 3)) {
    if (!cell) continue
    const cat = detectCategory(cell)
    if (cat) return cat
  }
  return null
}

export async function parseMercadoExcel(file: File): Promise<ParsedMercadoLine[]> {
  let rows: unknown[][]
  try {
    rows = await readExcelRowsFromFile(file)
  } catch (err) {
    // Propagar mensajes especificos (tamano, filas, hojas) y solo enmascarar errores genericos.
    const msg = err instanceof Error ? err.message : ''
    if (
      msg.startsWith('Archivo demasiado grande') ||
      msg.startsWith('Demasiadas filas') ||
      msg.startsWith('El archivo no contiene hojas')
    ) {
      throw err
    }
    throw new Error('No se pudo leer el archivo. Verifique que sea un Excel válido.')
  }

  const lines: ParsedMercadoLine[] = []
  let currentCategory: MercadoCategory | null = null
  let sortOrder = 0

  for (const row of rows) {
    const cells = rowToCells(row)
    const [colA, colB, colC, colD, colE] = cells

    if (!colA && !colB && !colC) continue

    // Primero: si tiene unidad + cantidad válida, es un ítem — nunca un header.
    // Esto evita que descripciones como "Ajuste de nivelación" sean tomadas como header.
    const qty = parseExcelNumber(colD)
    const isLineItem = !!colC && qty > 0

    if (!isLineItem) {
      const cat = isCategoryHeader(cells)
      if (cat) currentCategory = cat
      continue
    }

    if (!currentCategory) continue

    const price = parseExcelNumber(colE)

    lines.push({
      category: currentCategory,
      code: colA || null,
      description: colB || colA,
      unit: colC,
      budgeted_quantity: qty,
      budgeted_unit_price: isNaN(price) ? 0 : price,
      budgeted_total: qty * (isNaN(price) ? 0 : price),
      sort_order: ++sortOrder,
    })
  }

  return lines
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
    { total_ajustes: 0, total_equipos: 0, total_mano_obra: 0, total_materiales: 0 },
  )
}
