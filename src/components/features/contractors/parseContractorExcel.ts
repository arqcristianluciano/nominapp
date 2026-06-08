import { normalizeText, rowToCells } from '@/utils/excel'

export type PaymentMethod = 'cash' | 'check' | 'transfer'

export interface ParsedContractorRow {
  /** Fila original (1-based para mostrar en mensajes). */
  rowIndex: number
  name: string
  specialty: string | null
  cedula: string | null
  phone: string | null
  bank_name: string | null
  bank_account: string | null
  payment_method: PaymentMethod | null
  valid: boolean
  error?: string
}

export interface ContractorImportResult {
  rows: ParsedContractorRow[]
}

/** Valores que la columna "Método de pago" puede traer desde Excel (normalizado). */
const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  efectivo: 'cash',
  cash: 'cash',
  cheque: 'check',
  check: 'check',
  transferencia: 'transfer',
  transfer: 'transfer',
  transf: 'transfer',
}

/**
 * Detecta si una fila es la fila de encabezados (primera columna normalizada es "nombre").
 */
function isHeaderRow(colA: string): boolean {
  return normalizeText(colA) === 'nombre'
}

/**
 * Parsea las filas crudas leídas por readExcelRowsFromFile en una lista
 * de contratistas candidatos con sus validaciones.
 *
 * Columnas esperadas (A–G):
 *   A: Nombre *  B: Especialidad  C: Cédula  D: Teléfono  E: Banco  F: Número de cuenta  G: Método de pago
 */
export function parseContractorRows(rows: unknown[][]): ContractorImportResult {
  const result: ParsedContractorRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const cells = rowToCells(rows[i], 7)
    const [colA, colB, colC, colD, colE, colF, colG] = cells

    // Saltar filas completamente vacías.
    if (!colA && !colB && !colC) continue
    // Saltar fila de encabezado.
    if (isHeaderRow(colA)) continue

    const name = colA.trim()
    const specialty = colB.trim() || null
    const cedula = colC.trim() || null
    const phone = colD.trim() || null
    const bank_name = colE.trim() || null
    const bank_account_raw = colF.trim()
    const payment_method_raw = normalizeText(colG)

    // Validación: nombre obligatorio.
    if (!name) {
      result.push({
        rowIndex: i + 1,
        name: '',
        specialty,
        cedula,
        phone,
        bank_name,
        bank_account: null,
        payment_method: null,
        valid: false,
        error: 'El nombre es obligatorio',
      })
      continue
    }

    // Validación: número de cuenta solo dígitos (si viene).
    const bank_account = bank_account_raw || null
    if (bank_account && !/^\d+$/.test(bank_account)) {
      result.push({
        rowIndex: i + 1,
        name,
        specialty,
        cedula,
        phone,
        bank_name,
        bank_account,
        payment_method: null,
        valid: false,
        error: 'El número de cuenta debe contener solo dígitos',
      })
      continue
    }

    // Método de pago (opcional; si no viene se deja null y el servicio usará 'cash' por defecto).
    let payment_method: PaymentMethod | null = null
    if (payment_method_raw) {
      const mapped = PAYMENT_METHOD_MAP[payment_method_raw]
      if (!mapped) {
        result.push({
          rowIndex: i + 1,
          name,
          specialty,
          cedula,
          phone,
          bank_name,
          bank_account,
          payment_method: null,
          valid: false,
          error: `Método de pago "${colG}" no válido. Use "efectivo", "cheque" o "transferencia"`,
        })
        continue
      }
      payment_method = mapped
    }

    result.push({
      rowIndex: i + 1,
      name,
      specialty,
      cedula,
      phone,
      bank_name,
      bank_account,
      payment_method,
      valid: true,
    })
  }

  return { rows: result }
}
