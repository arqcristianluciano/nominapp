import { normalizeText, rowToCells } from '@/utils/excel'

/** Tipo de cuenta bancaria permitido. */
export type TipoCuenta = 'ahorros' | 'corriente'

export interface ParsedSupplierRow {
  /** Fila original (1-based para mostrar en mensajes). */
  rowIndex: number
  name: string
  rnc: string | null
  contact_phone: string | null
  bank_name: string | null
  bank_account: string | null
  tipo_cuenta: TipoCuenta | null
  payment_terms: string | null
  valid: boolean
  error?: string
}

export interface SupplierImportResult {
  rows: ParsedSupplierRow[]
}

/** Valores que la columna "Tipo de cuenta" puede traer desde Excel (normalizado). */
const TIPO_CUENTA_MAP: Record<string, TipoCuenta> = {
  ahorros: 'ahorros',
  ahorro: 'ahorros',
  savings: 'ahorros',
  corriente: 'corriente',
  corrientes: 'corriente',
  checking: 'corriente',
  current: 'corriente',
}

/**
 * Detecta si una fila es la fila de encabezados (la primera columna normalizada es "nombre").
 */
function isHeaderRow(colA: string): boolean {
  return normalizeText(colA) === 'nombre'
}

/**
 * Parsea las filas crudas leídas por readExcelRowsFromFile en una lista
 * de proveedores candidatos con sus validaciones.
 *
 * Columnas esperadas (A–G):
 *   A: Nombre *  B: RNC  C: Teléfono  D: Banco  E: Número de cuenta  F: Tipo de cuenta  G: Condiciones de pago
 */
export function parseSupplierRows(rows: unknown[][]): SupplierImportResult {
  const result: ParsedSupplierRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const cells = rowToCells(rows[i], 7)
    const [colA, colB, colC, colD, colE, colF, colG] = cells

    // Saltar filas completamente vacías.
    if (!colA && !colB && !colC) continue
    // Saltar fila de encabezado.
    if (isHeaderRow(colA)) continue

    const name = colA.trim()
    const rnc = colB.trim() || null
    const contact_phone = colC.trim() || null
    const bank_name = colD.trim() || null
    const bank_account_raw = colE.trim()
    const tipo_cuenta_raw = normalizeText(colF)
    const payment_terms = colG.trim() || null

    // Validación: nombre obligatorio.
    if (!name) {
      result.push({
        rowIndex: i + 1,
        name: '',
        rnc,
        contact_phone,
        bank_name,
        bank_account: null,
        tipo_cuenta: null,
        payment_terms,
        valid: false,
        error: 'El nombre es obligatorio',
      })
      continue
    }

    // Validación: número de cuenta solo dígitos.
    const bank_account = bank_account_raw || null
    if (bank_account && !/^\d+$/.test(bank_account)) {
      result.push({
        rowIndex: i + 1,
        name,
        rnc,
        contact_phone,
        bank_name,
        bank_account,
        tipo_cuenta: null,
        payment_terms,
        valid: false,
        error: 'El número de cuenta debe contener solo dígitos',
      })
      continue
    }

    // Validación: tipo de cuenta.
    let tipo_cuenta: TipoCuenta | null = null
    if (tipo_cuenta_raw) {
      const mapped = TIPO_CUENTA_MAP[tipo_cuenta_raw]
      if (!mapped) {
        result.push({
          rowIndex: i + 1,
          name,
          rnc,
          contact_phone,
          bank_name,
          bank_account,
          tipo_cuenta: null,
          payment_terms,
          valid: false,
          error: `Tipo de cuenta "${colF}" no válido. Use "ahorros" o "corriente"`,
        })
        continue
      }
      tipo_cuenta = mapped
    }

    result.push({
      rowIndex: i + 1,
      name,
      rnc,
      contact_phone,
      bank_name,
      bank_account,
      tipo_cuenta,
      payment_terms,
      valid: true,
    })
  }

  return { rows: result }
}
