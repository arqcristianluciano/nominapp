import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'

// Mock @/lib/supabase ANTES de importar el service.
// exportAllToZip llama a supabase.from(table).select('*') por cada entidad
// y espera {data, error}. Mockeamos un builder cuya cadena .select() resuelve
// directamente al thenable {data, error}.
const fromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

import { EXPORTABLE_ENTITIES, exportAllToZip, rowsToCsv, triggerBackup } from './exportService'

interface SupabaseResponse {
  data: unknown
  error: unknown
}

/**
 * Construye un builder cuya cadena .select('*') resuelve a {data, error}.
 * El service sólo usa: supabase.from(table).select('*').
 */
function buildBuilder(response: SupabaseResponse) {
  return {
    select: vi.fn().mockResolvedValue(response),
  }
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('rowsToCsv', () => {
  it('con array vacío retorna string vacío', () => {
    expect(rowsToCsv([])).toBe('')
  })

  it('incluye la union de keys de todas las filas como header (en orden de aparición)', () => {
    // Fila 1 introduce a,b; fila 2 introduce c. La union ordenada es a,b,c.
    const csv = rowsToCsv([
      { a: 1, b: 2 },
      { a: 3, c: 4 },
    ])

    // CRLF entre líneas y trailing CRLF al final.
    expect(csv).toBe('a,b,c\r\n1,2,\r\n3,,4\r\n')
    // Sanity: contiene todas las columnas.
    expect(csv.startsWith('a,b,c\r\n')).toBe(true)
    expect(csv).toContain('\r\n')
    // Celdas faltantes quedan como string vacío (no "undefined").
    expect(csv).not.toContain('undefined')
  })

  it('escapa valores con coma, comillas o saltos de línea con dobles comillas (RFC 4180)', () => {
    const csv = rowsToCsv([
      {
        plain: 'sin escape',
        comma: 'a,b',
        quote: 'di "hola"',
        newline: 'line1\nline2',
        crlf: 'l1\r\nl2',
      },
    ])

    // Header sin escape (las keys no llevan caracteres especiales).
    expect(csv.startsWith('plain,comma,quote,newline,crlf\r\n')).toBe(true)
    // La coma fuerza comillas envolventes.
    expect(csv).toContain('"a,b"')
    // Las comillas internas se duplican.
    expect(csv).toContain('"di ""hola"""')
    // El newline interno se preserva dentro de la celda entrecomillada.
    expect(csv).toContain('"line1\nline2"')
    // CRLF dentro de una celda también se entrecomilla.
    expect(csv).toContain('"l1\r\nl2"')
  })

  it('no escapa valores sin caracteres especiales', () => {
    const csv = rowsToCsv([{ a: 'hello', b: 42, c: true }])
    expect(csv).toBe('a,b,c\r\nhello,42,true\r\n')
    // Nada está entre comillas dobles.
    expect(csv).not.toContain('"')
  })

  it('preserva UTF-8: caracteres acentuados / ñ no se corrompen', () => {
    const csv = rowsToCsv([{ nombre: 'José Niño', ciudad: 'Asunción' }])
    expect(csv).toContain('José Niño')
    expect(csv).toContain('Asunción')
    // El carácter "ñ" sigue siendo "ñ" (no Mojibake).
    expect(csv.includes('ñ')).toBe(true)
  })

  it('mapea null/undefined a celda vacía y serializa objetos/arrays/Date', () => {
    const csv = rowsToCsv([{ a: null, b: undefined, c: { x: 1 }, d: [1, 2], e: new Date('2026-05-21T00:00:00Z') }])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('a,b,c,d,e')
    // null y undefined -> vacío; objeto/array -> JSON entrecomillado por las comas.
    expect(lines[1]).toBe(',,"{""x"":1}","[1,2]",2026-05-21T00:00:00.000Z')
  })
})

describe('EXPORTABLE_ENTITIES', () => {
  it('es un arreglo no vacío de entidades { table, filename }', () => {
    expect(Array.isArray(EXPORTABLE_ENTITIES)).toBe(true)
    expect(EXPORTABLE_ENTITIES.length).toBeGreaterThan(0)
    for (const entity of EXPORTABLE_ENTITIES) {
      expect(typeof entity.table).toBe('string')
      expect(entity.table.length).toBeGreaterThan(0)
      expect(typeof entity.filename).toBe('string')
      expect(entity.filename.endsWith('.csv')).toBe(true)
    }
  })

  it('no tiene tables duplicadas', () => {
    const tables = EXPORTABLE_ENTITIES.map((e) => e.table)
    const unique = new Set(tables)
    expect(unique.size).toBe(tables.length)
  })
})

describe('triggerBackup', () => {
  it('retorna { ok: false } con un mensaje explicativo (placeholder)', async () => {
    const result = await triggerBackup()
    expect(result.ok).toBe(false)
    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(0)
  })
})

describe('exportAllToZip', () => {
  it('genera un Blob ZIP que contiene al menos un CSV (más el README)', async () => {
    // Mockeamos UNA sola entidad para mantener el test acotado: supabase.from
    // se resuelve con una fila simple y exportAllToZip debe armar el ZIP.
    fromMock.mockImplementation(() =>
      buildBuilder({
        data: [{ id: 1, nombre: 'Niño' }],
        error: null,
      }),
    )

    const summary = await exportAllToZip([{ table: 'companies', filename: 'companies.csv' }])

    expect(summary.totalRows).toBe(1)
    expect(summary.entities).toHaveLength(1)
    expect(summary.entities[0]).toMatchObject({
      table: 'companies',
      filename: 'companies.csv',
      rows: 1,
    })
    expect(summary.zipFilename).toMatch(/^nominapp-export-\d{8}-\d{6}\.zip$/)
    expect(fromMock).toHaveBeenCalledWith('companies')
  })

  it('omite entidades vacías del ZIP pero las reporta en el summary', async () => {
    // Dos entidades: la primera con filas, la segunda vacía.
    const responses: SupabaseResponse[] = [
      { data: [{ id: 1, x: 'a' }], error: null },
      { data: [], error: null },
    ]
    fromMock.mockImplementation(() => buildBuilder(responses.shift()!))

    const summary = await exportAllToZip([
      { table: 'companies', filename: 'companies.csv' },
      { table: 'projects', filename: 'projects.csv' },
    ])

    expect(summary.totalRows).toBe(1)
    expect(summary.entities).toHaveLength(2)
    expect(summary.entities[0].rows).toBe(1)
    expect(summary.entities[1].rows).toBe(0)
    expect(summary.entities[1].error).toBeUndefined()
  })

  it('reporta el error cuando supabase devuelve {error}', async () => {
    fromMock.mockImplementation(() => buildBuilder({ data: null, error: { message: 'rls denied' } }))

    const summary = await exportAllToZip([{ table: 'companies', filename: 'companies.csv' }])

    expect(summary.totalRows).toBe(0)
    expect(summary.entities[0]).toMatchObject({
      table: 'companies',
      filename: 'companies.csv',
      rows: 0,
      error: 'rls denied',
    })
  })

  it('el ZIP resultante incluye el CSV con header y datos en UTF-8', async () => {
    // Espiamos Blob para capturar el Uint8Array y validar el contenido real
    // del ZIP usando fflate.unzipSync.
    const originalBlob = globalThis.Blob
    let capturedBytes: Uint8Array | null = null
    class SpyBlob extends originalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        // El primer parte que pasa exportAllToZip es el Uint8Array de zipSync.
        const first = parts[0] as Uint8Array
        capturedBytes = first
      }
    }
    globalThis.Blob = SpyBlob as unknown as typeof Blob

    try {
      fromMock.mockImplementation(() =>
        buildBuilder({
          data: [{ id: 'c1', nombre: 'Niño SA', monto: 1000 }],
          error: null,
        }),
      )

      await exportAllToZip([{ table: 'companies', filename: 'companies.csv' }])

      expect(capturedBytes).not.toBeNull()
      const unzipped = unzipSync(capturedBytes!)
      // Debe contener el CSV de la entidad + el README.
      expect(Object.keys(unzipped).sort()).toEqual(['README.txt', 'companies.csv'])

      const csv = strFromU8(unzipped['companies.csv'])
      expect(csv.startsWith('id,nombre,monto\r\n')).toBe(true)
      // UTF-8 round-trip a través del ZIP.
      expect(csv).toContain('Niño SA')
    } finally {
      globalThis.Blob = originalBlob
    }
  })
})
