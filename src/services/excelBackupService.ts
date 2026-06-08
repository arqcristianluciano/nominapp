/**
 * Servicio de respaldo en Excel.
 *
 * Genera un archivo .xlsx con una hoja por área del sistema.
 * Cada hoja tiene encabezados en español y todos los datos disponibles.
 * Usa `exportToExcel` (xlsx) ya presente en el proyecto.
 * No requiere cambios en la base de datos.
 */

import { supabase } from '@/lib/supabase'
import { exportToExcel, type ExcelSheet } from '@/utils/excelExport'

// ─── helpers ──────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>

async function fetchAll(table: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`[${table}] ${error.message}`)
  return (data ?? []) as Row[]
}

/** Convierte una fila cruda en ExcelRow: aplana objetos/arrays a JSON string. */
function flatten(rows: Row[]): Record<string, string | number | null | undefined>[] {
  return rows.map((row) => {
    const out: Record<string, string | number | null | undefined> = {}
    for (const [key, val] of Object.entries(row)) {
      if (val === null || val === undefined || typeof val === 'string' || typeof val === 'number') {
        out[key] = val as string | number | null | undefined
      } else if (typeof val === 'boolean') {
        out[key] = val ? 'Sí' : 'No'
      } else {
        // Objetos / arrays anidados → JSON compacto para que quede legible en Excel
        try {
          out[key] = JSON.stringify(val)
        } catch {
          out[key] = String(val)
        }
      }
    }
    return out
  })
}

/** Construye una hoja para exportToExcel, renombrando columnas si se indica. */
function sheet(name: string, rows: Row[], columnMap?: Record<string, string>): ExcelSheet {
  const flat = flatten(rows)
  if (!columnMap) return { name, rows: flat }

  // Renombra las keys según el mapa (solo las que aparezcan en el mapa)
  const renamed = flat.map((row) => {
    const out: Record<string, string | number | null | undefined> = {}
    for (const [key, val] of Object.entries(row)) {
      const label = columnMap[key] ?? key
      out[label] = val
    }
    return out
  })
  return { name, rows: renamed }
}

// ─── definición de hojas ──────────────────────────────────────────────────────

/** Nombre del archivo: incluye fecha y hora para identificar el respaldo. */
function buildFilename(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `nominapp-respaldo-${date}-${time}.xlsx`
}

// ─── función principal ────────────────────────────────────────────────────────

/**
 * Descarga todos los datos del sistema y genera un Excel de respaldo.
 * Devuelve un resumen indicando cuántas filas se exportaron por hoja.
 */
export interface BackupSheetResult {
  name: string
  rows: number
  error?: string
}

export interface BackupSummary {
  filename: string
  sheets: BackupSheetResult[]
  totalRows: number
}

export async function exportBackupToExcel(): Promise<BackupSummary> {
  const results: BackupSheetResult[] = []
  const sheets: ExcelSheet[] = []

  /** Helper interno: carga una tabla y agrega la hoja; captura errores por tabla. */
  async function addSheet(sheetName: string, table: string, columnMap?: Record<string, string>) {
    try {
      const rows = await fetchAll(table)
      const excelSheet = sheet(sheetName, rows, columnMap)
      sheets.push(excelSheet)
      results.push({ name: sheetName, rows: rows.length })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Hoja vacía con aviso de error para que el archivo igual se genere
      sheets.push({ name: sheetName, rows: [{ Error: msg }] })
      results.push({ name: sheetName, rows: 0, error: msg })
    }
  }

  // ── 1. Proyectos ────────────────────────────────────────────────────────────
  await addSheet('Proyectos', 'projects', {
    id: 'ID',
    company_id: 'Empresa ID',
    name: 'Nombre',
    code: 'Código',
    location: 'Ubicación',
    status: 'Estado',
    dt_percent: '% DT',
    admin_percent: '% Administración',
    transport_percent: '% Transporte',
    planning_fee: 'Honorario planificación',
    created_at: 'Creado',
    updated_at: 'Actualizado',
  })

  // ── 2. Proveedores ──────────────────────────────────────────────────────────
  await addSheet('Proveedores', 'suppliers', {
    id: 'ID',
    name: 'Nombre',
    rnc: 'RNC',
    contact_phone: 'Teléfono',
    bank_name: 'Banco',
    bank_account: 'Cuenta bancaria',
    tipo_cuenta: 'Tipo de cuenta',
    payment_terms: 'Condición de pago',
    is_active: 'Activo',
    created_at: 'Creado',
    updated_at: 'Actualizado',
  })

  // ── 3. Contratistas ─────────────────────────────────────────────────────────
  await addSheet('Contratistas', 'contractors', {
    id: 'ID',
    name: 'Nombre',
    specialty: 'Especialidad',
    cedula: 'Cédula',
    phone: 'Teléfono',
    bank_name: 'Banco',
    bank_account: 'Cuenta bancaria',
    payment_method: 'Método de pago',
    is_active: 'Activo',
    notes: 'Notas',
    parent_contractor_id: 'Contratista padre ID',
    created_at: 'Creado',
    updated_at: 'Actualizado',
  })

  // ── 4. Nóminas (períodos) ───────────────────────────────────────────────────
  await addSheet('Nóminas', 'payroll_periods', {
    id: 'ID',
    project_id: 'Proyecto ID',
    period_number: 'No. período',
    report_date: 'Fecha reporte',
    reported_by: 'Reportado por',
    status: 'Estado',
    total_labor: 'Total mano de obra',
    total_materials: 'Total materiales',
    total_indirect: 'Total indirectos',
    grand_total: 'Total general',
    notes: 'Notas',
    created_at: 'Creado',
    approved_at: 'Aprobado',
    approved_by: 'Aprobado por',
  })

  // ── 5. Ítems de mano de obra ────────────────────────────────────────────────
  await addSheet('Mano de obra', 'labor_line_items', {
    id: 'ID',
    payroll_period_id: 'Nómina ID',
    contractor_id: 'Contratista ID',
    description: 'Descripción',
    quantity: 'Cantidad',
    unit: 'Unidad',
    unit_price: 'Precio unitario',
    subtotal: 'Subtotal',
    is_advance: 'Es adelanto',
    is_advance_deduction: 'Es descuento adelanto',
    sort_order: 'Orden',
    notes: 'Notas',
    budget_category_id: 'Capítulo ID',
    budget_item_id: 'Partida ID',
    created_by: 'Creado por',
  })

  // ── 6. Distribución de pagos ────────────────────────────────────────────────
  await addSheet('Distribución de pagos', 'payment_distributions', {
    id: 'ID',
    payroll_period_id: 'Nómina ID',
    bank_account_id: 'Cuenta bancaria ID',
    amount: 'Monto',
    payment_method: 'Método de pago',
    beneficiary: 'Beneficiario',
    beneficiary_type: 'Tipo beneficiario',
    beneficiary_doc: 'Doc. beneficiario',
    bank_name: 'Banco',
    bank_account: 'Cuenta',
    check_number: 'No. cheque',
    status: 'Estado',
    instructions: 'Instrucciones',
    completed_at: 'Completado',
  })

  // ── 7. Préstamos ────────────────────────────────────────────────────────────
  await addSheet('Préstamos', 'contractor_loans', {
    id: 'ID',
    contractor_id: 'Contratista ID',
    principal: 'Capital',
    interest_rate: 'Tasa de interés %',
    installments: 'No. cuotas',
    installment_amount: 'Monto cuota',
    disbursed_date: 'Fecha desembolso',
    status: 'Estado',
    frecuencia: 'Frecuencia',
    disbursement_account_id: 'Cuenta desembolso ID',
    notes: 'Notas',
    created_at: 'Creado',
  })

  // ── 8. Cuotas de préstamos ──────────────────────────────────────────────────
  await addSheet('Cuotas', 'loan_installments', {
    id: 'ID',
    loan_id: 'Préstamo ID',
    numero_cuota: 'No. cuota',
    fecha_pago_programada: 'Fecha programada',
    monto: 'Monto',
    estado: 'Estado',
    fecha_pago_real: 'Fecha de pago real',
    payroll_period_id: 'Nómina ID',
  })

  // ── 9. Inventario – ítems ───────────────────────────────────────────────────
  await addSheet('Inventario', 'inventory_items', {
    id: 'ID',
    project_id: 'Proyecto ID',
    name: 'Nombre',
    unit: 'Unidad',
    current_stock: 'Stock actual',
    min_stock: 'Stock mínimo',
    unit_cost: 'Costo unitario',
    material_catalog_id: 'Catálogo ID',
    created_at: 'Creado',
  })

  // ── 10. Movimientos de inventario ───────────────────────────────────────────
  await addSheet('Mov. inventario', 'inventory_movements', {
    id: 'ID',
    item_id: 'Ítem ID',
    project_id: 'Proyecto ID',
    type: 'Tipo',
    quantity: 'Cantidad',
    date: 'Fecha',
    supplier_id: 'Proveedor ID',
    notes: 'Notas',
    budget_item_id: 'Partida ID',
    budget_category_id: 'Capítulo ID',
    unit_cost: 'Costo unitario',
    created_by: 'Creado por',
    created_at: 'Creado',
  })

  // ── 11. Cubicaciones – contratos ────────────────────────────────────────────
  await addSheet('Cubicaciones', 'adjustment_contracts', {
    id: 'ID',
    project_id: 'Proyecto ID',
    contractor_id: 'Contratista ID',
    signed_date: 'Fecha firma',
    retention_percent: 'Retención %',
    notes: 'Notas',
    created_at: 'Creado',
  })

  // ── 12. Partidas de cubicación ──────────────────────────────────────────────
  await addSheet('Partidas cubicación', 'contract_partidas', {
    id: 'ID',
    contract_id: 'Contrato ID',
    description: 'Descripción',
    unit: 'Unidad',
    unit_price: 'Precio unitario',
    agreed_quantity: 'Cantidad acordada',
    sort_order: 'Orden',
  })

  // ── 13. Cortes de cubicación ────────────────────────────────────────────────
  await addSheet('Cortes cubicación', 'contract_cortes', {
    id: 'ID',
    contract_id: 'Contrato ID',
    partida_id: 'Partida ID',
    cut_number: 'No. corte',
    cut_date: 'Fecha corte',
    measured_quantity: 'Cantidad medida',
    amount: 'Monto',
    retention_amount: 'Retención',
    status: 'Estado',
    notes: 'Notas',
    approved_by: 'Aprobado por',
    linked_payroll_id: 'Nómina ID',
    created_at: 'Creado',
  })

  // ── 14. Presupuesto – capítulos ─────────────────────────────────────────────
  await addSheet('Presupuesto capítulos', 'budget_categories', {
    id: 'ID',
    project_id: 'Proyecto ID',
    code: 'Código',
    name: 'Nombre',
    sort_order: 'Orden',
    budgeted_amount: 'Monto presupuestado',
    start_date: 'Inicio',
    end_date: 'Fin',
  })

  // ── 15. Presupuesto – partidas ──────────────────────────────────────────────
  await addSheet('Presupuesto partidas', 'budget_items', {
    id: 'ID',
    budget_category_id: 'Capítulo ID',
    code: 'Código',
    description: 'Descripción',
    unit: 'Unidad',
    quantity: 'Cantidad',
    unit_price: 'Precio unitario',
    sort_order: 'Orden',
    notes: 'Notas',
    start_date: 'Inicio',
    end_date: 'Fin',
  })

  // ── 16. Transacciones ───────────────────────────────────────────────────────
  await addSheet('Transacciones', 'transactions', {
    id: 'ID',
    project_id: 'Proyecto ID',
    date: 'Fecha',
    budget_category_id: 'Capítulo ID',
    budget_item_id: 'Partida ID',
    description: 'Descripción',
    supplier_id: 'Proveedor ID',
    quantity: 'Cantidad',
    unit_price: 'Precio unitario',
    total: 'Total',
    payment_condition: 'Condición pago',
    invoice_number: 'No. factura',
    check_number: 'No. cheque',
    bank: 'Banco',
    cashed_date: 'Fecha cobro',
    payroll_period_id: 'Nómina ID',
    notes: 'Notas',
    created_at: 'Creado',
  })

  // ── 17. Control de calidad ──────────────────────────────────────────────────
  await addSheet('Control de calidad', 'quality_control', {
    id: 'ID',
    project_id: 'Proyecto ID',
    element: 'Elemento',
    pour_date: 'Fecha colada',
    test_date: 'Fecha ensayo',
    test_age: 'Edad ensayo',
    actual_resistance: 'Resistencia real',
    expected_resistance: 'Resistencia esperada',
    concrete_supplier: 'Proveedor concreto',
    laboratory: 'Laboratorio',
    status: 'Resultado',
    notes: 'Notas',
  })

  // ── 18. Bitácora ────────────────────────────────────────────────────────────
  await addSheet('Bitácora', 'bitacora_entries', {
    id: 'ID',
    project_id: 'Proyecto ID',
    date: 'Fecha',
    weather: 'Clima',
    temp_c: 'Temperatura °C',
    work_summary: 'Resumen de trabajos',
    workforce_count: 'Personal',
    equipment: 'Equipos',
    visitors: 'Visitantes',
    incidents: 'Incidentes',
    notes: 'Notas',
    created_by: 'Creado por',
    created_at: 'Creado',
  })

  // ── Generar y descargar el archivo ──────────────────────────────────────────
  const filename = buildFilename()
  await exportToExcel(filename, sheets)

  const totalRows = results.reduce((sum, r) => sum + r.rows, 0)
  return { filename, sheets: results, totalRows }
}
