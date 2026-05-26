import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @/lib/supabase ANTES de importar el service.
// Mockeamos tanto supabase.from (DB) como supabase.storage (Storage),
// siguiendo el patrón establecido en loanService.test.ts / transactionService.test.ts:
// cada test arma la cadena que el método del service espera.
const fromMock = vi.fn()
const storageFromMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    storage: {
      from: (...args: unknown[]) => storageFromMock(...args),
    },
  },
}))

import { userDocumentsService } from './userDocumentsService'

const BUCKET = 'user_documents'
const TABLE = 'user_documents'

/**
 * Helper: cadena supabase.storage.from(BUCKET).upload(path, file) → {data?, error}.
 * Devuelve también los mocks para poder afirmar argumentos.
 */
function mockStorageUpload(error: unknown = null) {
  const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'ignored' }, error })
  storageFromMock.mockReturnValueOnce({ upload: uploadMock })
  return { uploadMock }
}

/**
 * Helper: cadena supabase.storage.from(BUCKET).remove([path]) → {data?, error}.
 */
function mockStorageRemove(error: unknown = null) {
  const removeMock = vi.fn().mockResolvedValue({ data: null, error })
  storageFromMock.mockReturnValueOnce({ remove: removeMock })
  return { removeMock }
}

/**
 * Helper: cadena supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn) → {data, error}.
 */
function mockCreateSignedUrl(
  data: { signedUrl: string } | null,
  error: unknown = null,
) {
  const createSignedUrlMock = vi.fn().mockResolvedValue({ data, error })
  storageFromMock.mockReturnValueOnce({ createSignedUrl: createSignedUrlMock })
  return { createSignedUrlMock }
}

/**
 * Helper: cadena supabase.from(TABLE).insert(payload).select().single() → {data, error}.
 */
function mockInsertChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const insertMock = vi.fn().mockReturnValue({ select: selectMock })
  fromMock.mockReturnValueOnce({ insert: insertMock })
  return { insertMock, selectMock, singleMock }
}

/**
 * Helper: cadena supabase.from(TABLE).select('*').eq('user_id', id).order('uploaded_at', ...) → {data, error}.
 */
function mockListChain(data: unknown, error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock, orderMock }
}

/**
 * Helper: cadena supabase.from(TABLE).delete().eq('id', id) → {data?, error}.
 */
function mockDeleteChain(error: unknown = null) {
  const eqMock = vi.fn().mockResolvedValue({ data: null, error })
  const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ delete: deleteMock })
  return { deleteMock, eqMock }
}

/**
 * Crea un File falso. Node no tiene `File` global en todas las versiones;
 * pero vitest+vite lo polyfillean. Si no, casteamos un objeto mínimo.
 */
function makeFile(name = 'cedula.pdf', content = 'pdf-bytes'): File {
  // Intento usar el File real (Vitest 4 trae Web APIs en entorno node moderno).
  if (typeof File !== 'undefined') {
    return new File([content], name, { type: 'application/pdf' })
  }
  // Fallback: objeto mínimo casteado.
  return { name, size: content.length, type: 'application/pdf' } as unknown as File
}

/**
 * Stub mínimo de File con `size`, `type` y `name` controlables, casteado a File.
 * Útil para probar la validación (tamaño/MIME) sin construir Blobs reales gigantes.
 */
function stubFile(
  opts: { name?: string; size?: number; type?: string } = {},
): File {
  const { name = 'archivo.bin', size = 10, type = 'application/octet-stream' } = opts
  return { name, size, type } as unknown as File
}

beforeEach(() => {
  fromMock.mockReset()
  storageFromMock.mockReset()
})

describe('userDocumentsService.upload', () => {
  it('sube a path "${userId}/..." y persiste fila en DB (camino feliz)', async () => {
    const file = makeFile('cedula.pdf')
    const userId = 'user-123'

    const { uploadMock } = mockStorageUpload()
    const inserted = {
      id: 'doc-1',
      user_id: userId,
      doc_type: 'cedula',
      file_path: `${userId}/algo.pdf`,
      display_name: 'cedula.pdf',
      uploaded_at: '2026-05-21T00:00:00Z',
    }
    const { insertMock, selectMock, singleMock } = mockInsertChain(inserted)

    const result = await userDocumentsService.upload(userId, file, 'cedula')

    // Storage: bucket correcto + path prefijado por userId
    expect(storageFromMock).toHaveBeenCalledWith(BUCKET)
    expect(uploadMock).toHaveBeenCalledTimes(1)
    const [uploadedPath, uploadedFile] = uploadMock.mock.calls[0]
    expect(typeof uploadedPath).toBe('string')
    expect(uploadedPath.startsWith(`${userId}/`)).toBe(true)
    expect(uploadedPath).toContain('cedula.pdf')
    expect(uploadedFile).toBe(file)

    // DB: insert al table correcto con los campos esperados (incluyendo el mismo path subido)
    expect(fromMock).toHaveBeenCalledWith(TABLE)
    expect(insertMock).toHaveBeenCalledTimes(1)
    const insertPayload = insertMock.mock.calls[0][0]
    expect(insertPayload).toMatchObject({
      user_id: userId,
      doc_type: 'cedula',
      file_path: uploadedPath,
      display_name: 'cedula.pdf',
    })
    expect(selectMock).toHaveBeenCalledTimes(1)
    expect(singleMock).toHaveBeenCalledTimes(1)

    expect(result).toEqual(inserted)
  })

  it('usa displayName explícito cuando se pasa, en lugar de file.name', async () => {
    const file = makeFile('foto-original.jpg')
    const userId = 'user-xyz'
    mockStorageUpload()
    const { insertMock } = mockInsertChain({
      id: 'doc-2',
      user_id: userId,
      doc_type: 'passport',
      file_path: `${userId}/x.jpg`,
      display_name: 'Mi Pasaporte',
      uploaded_at: '2026-05-21T00:00:00Z',
    })

    await userDocumentsService.upload(userId, file, 'passport', 'Mi Pasaporte')

    expect(insertMock.mock.calls[0][0]).toMatchObject({
      user_id: userId,
      doc_type: 'passport',
      display_name: 'Mi Pasaporte',
    })
  })

  it('si Storage.upload falla, propaga el error y NO toca la DB', async () => {
    const file = makeFile('x.pdf')
    const userId = 'user-err'
    const storageErr = { message: 'storage boom' }
    mockStorageUpload(storageErr)
    // No registramos mockInsertChain: si el service intentara llamar from(), fromMock
    // devolvería undefined y reventaría con TypeError. Verificamos abajo que no se llamó.

    await expect(
      userDocumentsService.upload(userId, file, 'cedula'),
    ).rejects.toEqual(storageErr)

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('si DB insert falla, hace rollback del archivo en Storage', async () => {
    const file = makeFile('rollback.pdf')
    const userId = 'user-rb'
    const dbErr = { message: 'insert boom' }

    const { uploadMock } = mockStorageUpload()
    mockInsertChain(null, dbErr)
    const { removeMock } = mockStorageRemove() // rollback esperado

    await expect(
      userDocumentsService.upload(userId, file, 'contract'),
    ).rejects.toEqual(dbErr)

    // Capturamos el path que efectivamente se subió y verificamos que rollback usa el mismo.
    const uploadedPath = uploadMock.mock.calls[0][0]
    expect(removeMock).toHaveBeenCalledTimes(1)
    expect(removeMock).toHaveBeenCalledWith([uploadedPath])

    // El bucket usado tanto para upload como para remove debe ser el correcto.
    // storageFromMock se llamó 2 veces: 1 para upload, 1 para remove.
    expect(storageFromMock).toHaveBeenNthCalledWith(1, BUCKET)
    expect(storageFromMock).toHaveBeenNthCalledWith(2, BUCKET)
  })

  // ---- Validación de upload (hardening) ----------------------------------

  it('rechaza un archivo mayor a 10 MB con el error de tamaño y NO sube ni toca la DB', async () => {
    const tooBig = stubFile({
      name: 'enorme.pdf',
      size: 10 * 1024 * 1024 + 1, // 10 MB + 1 byte
      type: 'application/pdf',
    })

    await expect(
      userDocumentsService.upload('user-1', tooBig, 'cedula'),
    ).rejects.toThrow('El archivo supera el límite de 10 MB')

    // Falla antes de tocar Storage o DB.
    expect(storageFromMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rechaza un MIME no permitido con el error de tipo y NO sube ni toca la DB', async () => {
    const evil = stubFile({
      name: 'virus.exe',
      size: 1024,
      type: 'application/x-msdownload',
    })

    await expect(
      userDocumentsService.upload('user-1', evil, 'other'),
    ).rejects.toThrow('Tipo de archivo no permitido')

    expect(storageFromMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('acepta image/png y sube con un path SANITIZADO (sin espacios ni caracteres especiales)', async () => {
    const userId = 'user-png'
    const file = stubFile({ name: 'mi foto (1).png', size: 2048, type: 'image/png' })

    const { uploadMock } = mockStorageUpload()
    mockInsertChain({
      id: 'doc-png',
      user_id: userId,
      doc_type: 'other',
      file_path: `${userId}/x.png`,
      display_name: 'mi foto (1).png',
      uploaded_at: '2026-05-21T00:00:00Z',
    })

    await userDocumentsService.upload(userId, file, 'other')

    expect(uploadMock).toHaveBeenCalledTimes(1)
    const uploadedPath = uploadMock.mock.calls[0][0] as string

    // Prefijado por userId.
    expect(uploadedPath.startsWith(`${userId}/`)).toBe(true)
    // El nombre original "mi foto (1).png" se sanitiza a "mi_foto__1_.png".
    expect(uploadedPath).toContain('mi_foto__1_.png')
    // El segmento del nombre de archivo no contiene espacios ni caracteres ilegales.
    const fileSegment = uploadedPath.slice(uploadedPath.indexOf('/') + 1)
    expect(fileSegment).not.toMatch(/[^a-zA-Z0-9._-]/)
    expect(fileSegment).not.toContain(' ')
  })

  it('acepta application/pdf y sube el archivo', async () => {
    const userId = 'user-pdf'
    const file = stubFile({ name: 'contrato.pdf', size: 4096, type: 'application/pdf' })

    const { uploadMock } = mockStorageUpload()
    mockInsertChain({
      id: 'doc-pdf',
      user_id: userId,
      doc_type: 'contract',
      file_path: `${userId}/x.pdf`,
      display_name: 'contrato.pdf',
      uploaded_at: '2026-05-21T00:00:00Z',
    })

    await userDocumentsService.upload(userId, file, 'contract')

    expect(storageFromMock).toHaveBeenCalledWith(BUCKET)
    expect(uploadMock).toHaveBeenCalledTimes(1)
    const [uploadedPath, uploadedFile] = uploadMock.mock.calls[0]
    expect((uploadedPath as string).startsWith(`${userId}/`)).toBe(true)
    expect(uploadedPath).toContain('contrato.pdf')
    expect(uploadedFile).toBe(file)
  })
})

describe('userDocumentsService.list', () => {
  it('filtra por user_id, ordena por uploaded_at desc y retorna las filas', async () => {
    const rows = [
      {
        id: 'd1',
        user_id: 'u1',
        doc_type: 'cedula',
        file_path: 'u1/a.pdf',
        display_name: 'a.pdf',
        uploaded_at: '2026-05-20T00:00:00Z',
      },
      {
        id: 'd2',
        user_id: 'u1',
        doc_type: 'contract',
        file_path: 'u1/b.pdf',
        display_name: 'b.pdf',
        uploaded_at: '2026-05-10T00:00:00Z',
      },
    ]
    const { selectMock, eqMock, orderMock } = mockListChain(rows)

    const result = await userDocumentsService.list('u1')

    expect(fromMock).toHaveBeenCalledWith(TABLE)
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqMock).toHaveBeenCalledWith('user_id', 'u1')
    expect(orderMock).toHaveBeenCalledWith('uploaded_at', { ascending: false })
    expect(result).toEqual(rows)
  })

  it('cuando data viene null retorna [] sin romper', async () => {
    mockListChain(null)
    const result = await userDocumentsService.list('u-empty')
    expect(result).toEqual([])
  })

  it('propaga el error de supabase', async () => {
    mockListChain(null, { message: 'list boom' })
    await expect(userDocumentsService.list('u1')).rejects.toEqual({ message: 'list boom' })
  })
})

describe('userDocumentsService.getDownloadUrl', () => {
  it('retorna la signed URL usando el bucket correcto y el expiry por defecto (1h)', async () => {
    const { createSignedUrlMock } = mockCreateSignedUrl({
      signedUrl: 'https://example.com/signed-url',
    })

    const url = await userDocumentsService.getDownloadUrl('u1/file.pdf')

    expect(storageFromMock).toHaveBeenCalledWith(BUCKET)
    expect(createSignedUrlMock).toHaveBeenCalledWith('u1/file.pdf', 60 * 60)
    expect(url).toBe('https://example.com/signed-url')
  })

  it('respeta el expiresInSec que se pasa explícitamente', async () => {
    const { createSignedUrlMock } = mockCreateSignedUrl({
      signedUrl: 'https://example.com/short',
    })

    await userDocumentsService.getDownloadUrl('u1/file.pdf', 30)

    expect(createSignedUrlMock).toHaveBeenCalledWith('u1/file.pdf', 30)
  })

  it('propaga error de createSignedUrl', async () => {
    mockCreateSignedUrl(null, { message: 'sign boom' })
    await expect(userDocumentsService.getDownloadUrl('u1/x.pdf')).rejects.toEqual({
      message: 'sign boom',
    })
  })

  it('lanza error si no viene signedUrl en la respuesta', async () => {
    // data presente pero sin signedUrl (caso defensivo del service).
    mockCreateSignedUrl({ signedUrl: '' })
    await expect(userDocumentsService.getDownloadUrl('u1/x.pdf')).rejects.toThrow(
      /No signed URL/i,
    )
  })
})

describe('userDocumentsService.delete', () => {
  it('borra Storage y luego la fila en DB filtrando por id', async () => {
    const { removeMock } = mockStorageRemove()
    const { deleteMock, eqMock } = mockDeleteChain()

    await userDocumentsService.delete('doc-1', 'u1/file.pdf')

    // Storage primero
    expect(storageFromMock).toHaveBeenCalledWith(BUCKET)
    expect(removeMock).toHaveBeenCalledWith(['u1/file.pdf'])

    // DB después
    expect(fromMock).toHaveBeenCalledWith(TABLE)
    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(eqMock).toHaveBeenCalledWith('id', 'doc-1')
  })

  it('si Storage.remove falla, propaga el error y NO toca la DB', async () => {
    mockStorageRemove({ message: 'storage del boom' })
    // No registramos delete chain: si el service intentara llamar from(), reventaría.

    await expect(userDocumentsService.delete('doc-1', 'u1/x.pdf')).rejects.toEqual({
      message: 'storage del boom',
    })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('si DB delete falla, propaga el error (Storage ya borrado)', async () => {
    mockStorageRemove() // storage ok
    mockDeleteChain({ message: 'db del boom' })

    await expect(userDocumentsService.delete('doc-1', 'u1/x.pdf')).rejects.toEqual({
      message: 'db del boom',
    })
  })
})
