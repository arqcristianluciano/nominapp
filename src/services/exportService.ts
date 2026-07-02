import { strToU8, zipSync } from 'fflate'
import { supabase } from '@/lib/supabase'

/**
 * Servicio de exportación masiva de datos.
 *
 * - `exportAllToZip` descarga todos los datos del backend, genera un CSV por
 *   entidad y los empaqueta en un único ZIP que se descarga al navegador.
 * - Los CSVs siguen el estándar RFC 4180: separador coma, comillas dobles,
 *   escape de comillas duplicando `"`, valores con `\n`, `,` o `"` se entrecomillan.
 * - Las columnas se extraen dinámicamente de las filas devueltas (union de keys).
 *   Si una tabla está vacía, se omite el CSV correspondiente.
 *
 * Nota: el backup real de la base de datos requiere credenciales `service_role`
 * (no disponibles en el cliente). Por eso `triggerBackup()` es un placeholder
 * que delega en la UI mostrar el aviso al usuario.
 */

export interface ExportableEntity {
  /** Nombre de la tabla en Supabase. */
  table: string
  /** Etiqueta usada para el nombre del archivo CSV. */
  filename: string
}

export const EXPORTABLE_ENTITIES: ExportableEntity[] = [
  { table: 'companies', filename: 'companies.csv' },
  { table: 'projects', filename: 'projects.csv' },
  { table: 'contractors', filename: 'contractors.csv' },
  { table: 'suppliers', filename: 'suppliers.csv' },
  { table: 'bank_accounts', filename: 'bank_accounts.csv' },
  { table: 'budget_categories', filename: 'budget_categories.csv' },
  { table: 'budget_items', filename: 'budget_items.csv' },
  { table: 'price_list_items', filename: 'price_list_items.csv' },
  { table: 'payroll_periods', filename: 'payroll_periods.csv' },
  { table: 'labor_line_items', filename: 'labor_line_items.csv' },
  { table: 'material_invoices', filename: 'material_invoices.csv' },
  { table: 'indirect_costs', filename: 'indirect_costs.csv' },
  { table: 'payment_distributions', filename: 'payment_distributions.csv' },
  { table: 'transactions', filename: 'transactions.csv' },
  { table: 'quality_control', filename: 'quality_control.csv' },
  { table: 'adjustment_contracts', filename: 'adjustment_contracts.csv' },
  { table: 'contract_partidas', filename: 'contract_partidas.csv' },
  { table: 'contract_cortes', filename: 'contract_cortes.csv' },
  { table: 'contract_adelantos', filename: 'contract_adelantos.csv' },
  { table: 'contractor_loans', filename: 'contractor_loans.csv' },
  { table: 'loan_deductions', filename: 'loan_deductions.csv' },
  { table: 'attendance_records', filename: 'attendance_records.csv' },
  { table: 'inventory_items', filename: 'inventory_items.csv' },
  { table: 'inventory_movements', filename: 'inventory_movements.csv' },
  { table: 'purchase_requisitions', filename: 'purchase_requisitions.csv' },
  { table: 'purchase_quotes', filename: 'purchase_quotes.csv' },
  { table: 'materials_catalog', filename: 'materials_catalog.csv' },
  { table: 'schedule_tasks', filename: 'schedule_tasks.csv' },
  { table: 'bitacora_entries', filename: 'bitacora_entries.csv' },
]

export interface ExportEntityResult {
  table: string
  filename: string
  rows: number
  error?: string
}

export interface ExportSummary {
  zipFilename: string
  entities: ExportEntityResult[]
  totalRows: number
}

type Primitive = string | number | boolean | null | undefined
type Row = Record<string, unknown>

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str: string
  let isText = false
  if (typeof value === 'string') {
    str = value
    isText = true
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    str = String(value)
  } else if (value instanceof Date) {
    str = value.toISOString()
  } else {
    // Objetos / arrays se serializan a JSON.
    try {
      str = JSON.stringify(value)
    } catch {
      str = String(value)
    }
    isText = true
  }
  // Anti-inyección de fórmulas (CSV injection): Excel/Sheets ejecutan celdas de
  // TEXTO que empiezan con = + - @ tab o retorno. Se antepone un apóstrofe. No
  // se aplica a números (vienen como number), así que "-5" numérico no se toca.
  if (isText && str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  const needsQuote = /[",\n\r]/.test(str)
  if (!needsQuote) return str
  return `"${str.replace(/"/g, '""')}"`
}

function collectColumns(rows: Row[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        order.push(key)
      }
    }
  }
  return order
}

/** Convierte un arreglo de filas en un CSV (RFC 4180, separador coma). */
export function rowsToCsv(rows: Row[]): string {
  if (rows.length === 0) return ''
  const columns = collectColumns(rows)
  const header = columns.map(escapeCell).join(',')
  const lines = rows.map((row) => columns.map((col) => escapeCell(row[col] as Primitive | object)).join(','))
  // CRLF para máxima compatibilidad con Excel.
  return [header, ...lines].join('\r\n') + '\r\n'
}

async function fetchTable(table: string): Promise<{ rows: Row[]; error?: string }> {
  try {
    // Supabase limita cada consulta a ~1000 filas por defecto. Sin paginar, el
    // "respaldo" se cortaba en silencio: se recorre por páginas hasta traerlo todo.
    const PAGE = 1000
    const all: Row[] = []
    let from = 0
    for (;;) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + PAGE - 1)
      if (error) return { rows: all, error: error.message }
      const batch = (data ?? []) as Row[]
      all.push(...batch)
      if (batch.length < PAGE) break
      from += PAGE
    }
    return { rows: all }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { rows: [], error: message }
  }
}

/** BOM UTF-8 para que Excel abra los CSV con acentos correctos. */
const UTF8_BOM = '﻿'

function buildZipFilename(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `nominapp-export-${date}-${time}.zip`
}

function triggerDownload(filename: string, blob: Blob): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Liberar el objeto blob al siguiente tick.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Descarga todas las entidades configuradas y arma un ZIP con un CSV por tabla.
 * Devuelve un resumen con totales y eventuales errores por tabla.
 */
export async function exportAllToZip(entities: ExportableEntity[] = EXPORTABLE_ENTITIES): Promise<ExportSummary> {
  const results: ExportEntityResult[] = []
  const files: Record<string, Uint8Array> = {}

  for (const entity of entities) {
    const { rows, error } = await fetchTable(entity.table)
    if (error) {
      results.push({ table: entity.table, filename: entity.filename, rows: 0, error })
      continue
    }
    if (rows.length === 0) {
      results.push({ table: entity.table, filename: entity.filename, rows: 0 })
      continue
    }
    const csv = rowsToCsv(rows)
    // BOM al inicio para que Excel reconozca UTF-8 (acentos y ñ correctos).
    files[entity.filename] = strToU8(UTF8_BOM + csv)
    results.push({ table: entity.table, filename: entity.filename, rows: rows.length })
  }

  // README con el resumen del export para que quede claro qué incluye el ZIP.
  const readme = buildReadme(results)
  files['README.txt'] = strToU8(readme)

  const zipped = zipSync(files, { level: 6 })
  // zipSync devuelve un Uint8Array cuyo .buffer es ArrayBuffer; lo pasamos
  // tal cual al Blob (el constructor acepta Uint8Array como BlobPart).
  const blob = new Blob([zipped as unknown as BlobPart], { type: 'application/zip' })
  const zipFilename = buildZipFilename()
  triggerDownload(zipFilename, blob)

  const totalRows = results.reduce((sum, r) => sum + r.rows, 0)
  return { zipFilename, entities: results, totalRows }
}

function buildReadme(results: ExportEntityResult[]): string {
  const generated = new Date().toISOString()
  const lines: string[] = [
    'NominAPP - Export masivo',
    `Generado: ${generated}`,
    '',
    'Cada CSV corresponde a una tabla del sistema. Encoding UTF-8, separador coma',
    'y comillas dobles para escapar valores (RFC 4180). Las tablas vacías se',
    'omiten del ZIP.',
    '',
    'Resumen por tabla:',
  ]
  for (const r of results) {
    const status = r.error ? `ERROR: ${r.error}` : `${r.rows} filas`
    lines.push(`- ${r.table}: ${status}`)
  }
  return lines.join('\r\n') + '\r\n'
}

/**
 * Backup real de la BD: requiere credenciales `service_role` o pg_dump del lado
 * servidor, lo cual no es seguro hacer desde el navegador. Esta función queda
 * como punto de extensión para invocar una Edge Function que dispare el dump;
 * por ahora retorna un mensaje informativo que la UI muestra al usuario.
 */
export async function triggerBackup(): Promise<{ ok: false; message: string }> {
  return {
    ok: false,
    message:
      'El backup completo de la base de datos requiere credenciales de servidor. ' +
      'Pídele a un administrador que ejecute pg_dump desde Supabase o configure ' +
      'una Edge Function de backup. Mientras tanto, usá "Exportar todo a CSV" ' +
      'como respaldo lógico.',
  }
}
