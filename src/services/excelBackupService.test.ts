import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const fromMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

// exportToExcel: interceptamos para no intentar escribir el archivo en tests.
const exportToExcelMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/utils/excelExport', () => ({
  exportToExcel: (...args: unknown[]) => exportToExcelMock(...args),
}))

import { exportBackupToExcel } from './excelBackupService'

function buildBuilder(data: unknown, error: unknown = null) {
  // fetchAll ahora pagina con .select('*').range(...). El mock entrega los datos
  // en la primera pagina; como el lote es < 1000, el bucle termina tras una pagina.
  return { select: vi.fn().mockReturnValue({ range: vi.fn().mockResolvedValue({ data, error }) }) }
}

// ─── tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  fromMock.mockReset()
  exportToExcelMock.mockReset().mockResolvedValue(undefined)
})

describe('exportBackupToExcel', () => {
  it('llama a exportToExcel y devuelve un summary con la lista de hojas', async () => {
    // Todas las tablas devuelven una fila vacía para simplificar.
    fromMock.mockImplementation(() => buildBuilder([{ id: '1', name: 'Demo' }]))

    const summary = await exportBackupToExcel()

    expect(exportToExcelMock).toHaveBeenCalledOnce()
    // El filename sigue el patrón nominapp-respaldo-YYYYMMDD-HHmm.xlsx
    expect(summary.filename).toMatch(/^nominapp-respaldo-\d{8}-\d{4}\.xlsx$/)
    // Debe haber múltiples hojas
    expect(summary.sheets.length).toBeGreaterThan(0)
    // Total de filas debe ser positivo (cada tabla devuelve 1 fila en el mock)
    expect(summary.totalRows).toBeGreaterThan(0)
  })

  it('incluye las hojas esperadas por nombre', async () => {
    fromMock.mockImplementation(() => buildBuilder([]))

    const summary = await exportBackupToExcel()

    const names = summary.sheets.map((s) => s.name)
    expect(names).toContain('Proyectos')
    expect(names).toContain('Proveedores')
    expect(names).toContain('Contratistas')
    expect(names).toContain('Nóminas')
    expect(names).toContain('Mano de obra')
    expect(names).toContain('Distribución de pagos')
    expect(names).toContain('Préstamos')
    expect(names).toContain('Cuotas')
    expect(names).toContain('Inventario')
    expect(names).toContain('Mov. inventario')
    expect(names).toContain('Cubicaciones')
    expect(names).toContain('Partidas cubicación')
    expect(names).toContain('Cortes cubicación')
    expect(names).toContain('Presupuesto capítulos')
    expect(names).toContain('Presupuesto partidas')
    expect(names).toContain('Transacciones')
    expect(names).toContain('Control de calidad')
    expect(names).toContain('Bitácora')
  })

  it('reporta error por hoja si supabase falla en una tabla', async () => {
    // Todas las tablas fallan.
    fromMock.mockImplementation(() => buildBuilder(null, { message: 'permission denied' }))

    const summary = await exportBackupToExcel()

    // Debe haber al menos un resultado con error
    const withErrors = summary.sheets.filter((s) => s.error)
    expect(withErrors.length).toBeGreaterThan(0)
    expect(withErrors[0].rows).toBe(0)
    // El Excel igual se genera (con hojas de error)
    expect(exportToExcelMock).toHaveBeenCalledOnce()
  })

  it('totalRows suma solo hojas sin error', async () => {
    let callCount = 0
    fromMock.mockImplementation(() => {
      callCount++
      // Primera tabla: 2 filas; resto: vacías.
      return buildBuilder(callCount === 1 ? [{ id: '1' }, { id: '2' }] : [])
    })

    const summary = await exportBackupToExcel()

    // La primera hoja tiene 2 filas, el resto 0.
    expect(summary.sheets[0].rows).toBe(2)
    expect(summary.totalRows).toBe(2)
  })

  it('pasa los encabezados en español a exportToExcel', async () => {
    fromMock.mockImplementation(() => buildBuilder([{ id: '1', name: 'Test', rnc: '123' }]))

    await exportBackupToExcel()

    const [filename, sheets] = exportToExcelMock.mock.calls[0] as [string, { name: string; rows: unknown[] }[]]
    expect(typeof filename).toBe('string')
    // Los nombres de las hojas deben estar en español
    const sheetNames = sheets.map((s) => s.name)
    expect(sheetNames).toContain('Proyectos')
    // Las columnas del primer sheet deben usar las labels del mapa
    const proyectosSheet = sheets.find((s) => s.name === 'Proyectos')
    expect(proyectosSheet).toBeDefined()
    if (proyectosSheet && proyectosSheet.rows.length > 0) {
      const firstRow = proyectosSheet.rows[0] as Record<string, unknown>
      // 'name' → 'Nombre' por el columnMap de Proyectos
      expect(Object.keys(firstRow)).toContain('Nombre')
      expect(Object.keys(firstRow)).not.toContain('name')
    }
  })
})
