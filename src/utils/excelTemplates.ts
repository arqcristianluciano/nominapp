// Plantillas Excel descargables para importar datos en NominApp.
// Cada funcion genera un workbook, lo escribe a un Blob y dispara la descarga
// creando un <a> temporal en el DOM. Usa la libreria `xlsx` ya instalada.
//
// La libreria `xlsx` se carga dinamicamente (lazy-load) para no incluirla en
// el bundle inicial; solo se descarga cuando el usuario ejecuta una accion
// de exportacion/importacion.

import type * as XLSXType from 'xlsx'

const BOLD_HEADER_STYLE = { font: { bold: true } }

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * Construye una hoja a partir de una matriz de filas (la primera es el header)
 * y aplica negrita a las celdas del header via la propiedad `s`.
 */
function buildSheetWithBoldHeader(
  XLSX: typeof XLSXType,
  rows: (string | number)[][],
): XLSXType.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const headerLength = rows[0]?.length ?? 0
  for (let c = 0; c < headerLength; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    const cell = ws[addr] as XLSXType.CellObject | undefined
    if (cell) {
      cell.s = BOLD_HEADER_STYLE
    }
  }
  return ws
}

/**
 * Dispara la descarga del workbook como archivo .xlsx usando Blob + <a download>.
 */
function downloadWorkbook(
  XLSX: typeof XLSXType,
  wb: XLSXType.WorkBook,
  filename: string,
): void {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([out], { type: XLSX_MIME })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Genera y descarga la plantilla para importar Presupuesto de obra.
 * Columnas: Capitulo, Codigo Partida, Descripcion, Unidad, Cantidad, Precio Unitario.
 */
export async function downloadBudgetTemplate(): Promise<void> {
  const XLSX = await import('xlsx')
  const rows: (string | number)[][] = [
    ['Capitulo', 'Codigo Partida', 'Descripcion', 'Unidad', 'Cantidad', 'Precio Unitario'],
    ['1. Preliminares', '1.1', 'Replanteo y nivelacion del terreno', 'm2', 120, 8.5],
    ['1. Preliminares', '1.2', 'Limpieza y desmonte del area', 'm2', 120, 5],
    ['2. Movimiento de tierra', '2.1', 'Excavacion manual hasta 1.50 m', 'm3', 35, 22.75],
    ['3. Concreto', '3.1', 'Concreto premezclado f c=210 kg/cm2', 'm3', 18, 185],
  ]
  const ws = buildSheetWithBoldHeader(XLSX, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto')
  downloadWorkbook(XLSX, wb, 'plantilla_presupuesto.xlsx')
}

/**
 * Genera y descarga la plantilla para importar Nomina (payroll).
 * Columnas: Contratista, Cedula, Categoria, Cantidad, Precio, Total.
 */
export async function downloadPayrollTemplate(): Promise<void> {
  const XLSX = await import('xlsx')
  const rows: (string | number)[][] = [
    ['Contratista', 'Cedula', 'Categoria', 'Cantidad', 'Precio', 'Total'],
    ['Juan Perez', 'V-12345678', 'Albanil', 8, 15, 120],
    ['Maria Gonzalez', 'V-23456789', 'Ayudante', 8, 10, 80],
    ['Carlos Ramirez', 'V-34567890', 'Maestro de obra', 8, 25, 200],
  ]
  const ws = buildSheetWithBoldHeader(XLSX, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Nomina')
  downloadWorkbook(XLSX, wb, 'plantilla_nomina.xlsx')
}

/**
 * Genera y descarga la plantilla para importar presupuesto Mercado.
 * El formato usa filas-header por categoria (Ajustes, Equipos, Mano de Obra, Materiales)
 * seguidas de partidas con: Codigo, Descripcion, Unidad, Cantidad, Precio Unitario.
 */
export async function downloadMercadoTemplate(): Promise<void> {
  const XLSX = await import('xlsx')
  const rows: (string | number)[][] = [
    ['Codigo', 'Descripcion', 'Unidad', 'Cantidad', 'Precio Unitario'],
    ['MANO DE OBRA', '', '', '', ''],
    ['MO-001', 'Albanil de primera', 'jornada', 10, 30],
    ['MO-002', 'Ayudante de albanil', 'jornada', 10, 18],
    ['MATERIALES', '', '', '', ''],
    ['MT-001', 'Cemento gris 42.5 kg', 'saco', 50, 12.5],
    ['MT-002', 'Arena lavada', 'm3', 8, 28],
    ['EQUIPOS', '', '', '', ''],
    ['EQ-001', 'Mezcladora 1 saco', 'hora', 20, 6],
    ['AJUSTES', '', '', '', ''],
    ['AJ-001', 'Ajuste por desperdicio', 'global', 1, 150],
  ]
  const ws = buildSheetWithBoldHeader(XLSX, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Mercado')
  downloadWorkbook(XLSX, wb, 'plantilla_mercado.xlsx')
}
