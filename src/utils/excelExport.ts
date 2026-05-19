// Helper genérico para exportar arrays de objetos a XLSX.
// Usa import dinámico de xlsx para no inflar el bundle inicial.

export type ExcelRow = Record<string, string | number | null | undefined>

export interface ExcelSheet {
  name: string
  rows: ExcelRow[]
  header?: string[] // opcional: orden explícito de columnas
}

export async function exportToExcel(filename: string, sheets: ExcelSheet[]): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const ws = sheet.header
      ? XLSX.utils.json_to_sheet(sheet.rows, { header: sheet.header })
      : XLSX.utils.json_to_sheet(sheet.rows)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31)) // límite de Excel
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
