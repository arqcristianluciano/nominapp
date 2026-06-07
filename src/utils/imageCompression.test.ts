/**
 * Tests para compressImageFile.
 *
 * El entorno de test es Node (sin DOM/canvas). Verificamos:
 *   - PDFs y archivos no-imagen se devuelven sin cambios.
 *   - Si createImageBitmap no existe (Node), devuelve el original (fallback).
 *   - Si createImageBitmap lanza, devuelve el original (fallback de error).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { compressImageFile } from './imageCompression'

function makeFile(name: string, type: string, content = 'data'): File {
  return new File([content], name, { type })
}

describe('compressImageFile – archivos no-imagen', () => {
  it('devuelve el mismo File para un PDF', async () => {
    const pdf = makeFile('doc.pdf', 'application/pdf')
    const result = await compressImageFile(pdf)
    expect(result).toBe(pdf)
  })

  it('devuelve el mismo File para un archivo de texto', async () => {
    const txt = makeFile('data.txt', 'text/plain')
    const result = await compressImageFile(txt)
    expect(result).toBe(txt)
  })

  it('devuelve el mismo File para application/octet-stream', async () => {
    const bin = makeFile('file.bin', 'application/octet-stream')
    const result = await compressImageFile(bin)
    expect(result).toBe(bin)
  })
})

describe('compressImageFile – fallback cuando canvas no está disponible (Node)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('devuelve el File original si createImageBitmap no existe en el entorno', async () => {
    // En Node, createImageBitmap no existe; la función debe atrapar el ReferenceError
    // y devolver el original.
    const img = makeFile('foto.jpg', 'image/jpeg')
    const result = await compressImageFile(img)
    // Debe devolver el original (fallback de error)
    expect(result).toBe(img)
  })

  it('devuelve el File original si createImageBitmap lanza', async () => {
    // Simula un entorno donde createImageBitmap existe pero falla
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('not supported')))
    const img = makeFile('foto.png', 'image/png')
    const result = await compressImageFile(img)
    expect(result).toBe(img)
  })
})

describe('compressImageFile – parámetros de calidad y tamaño', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('devuelve el original si createImageBitmap falla (imagen HEIC)', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('HEIC not supported')))
    const heic = makeFile('foto.heic', 'image/heic')
    const result = await compressImageFile(heic)
    expect(result).toBe(heic)
  })
})
