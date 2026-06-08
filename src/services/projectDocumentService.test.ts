import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @/lib/supabase ANTES de importar el service.
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

import { projectDocumentService, validateDocumentFile } from './projectDocumentService'

const BUCKET = 'project-documents'
const TABLE = 'project_documents'
const PROJECT_ID = 'proj-111'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFile(name = 'plano.pdf', content = 'pdf', type = 'application/pdf'): File {
  if (typeof File !== 'undefined') {
    return new File([content], name, { type })
  }
  return { name, size: content.length, type } as unknown as File
}

function stubFile(opts: { name?: string; size?: number; type?: string } = {}): File {
  const { name = 'doc.bin', size = 100, type = 'application/octet-stream' } = opts
  return { name, size, type } as unknown as File
}

function mockStorageUpload(error: unknown = null) {
  const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'ignored' }, error })
  storageFromMock.mockReturnValueOnce({ upload: uploadMock })
  return { uploadMock }
}

function mockStorageRemove(error: unknown = null) {
  const removeMock = vi.fn().mockResolvedValue({ data: null, error })
  storageFromMock.mockReturnValueOnce({ remove: removeMock })
  return { removeMock }
}

function mockCreateSignedUrl(data: { signedUrl: string } | null, error: unknown = null) {
  const createSignedUrlMock = vi.fn().mockResolvedValue({ data, error })
  storageFromMock.mockReturnValueOnce({ createSignedUrl: createSignedUrlMock })
  return { createSignedUrlMock }
}

function mockInsertChain(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error })
  const selectMock = vi.fn().mockReturnValue({ single: singleMock })
  const insertMock = vi.fn().mockReturnValue({ select: selectMock })
  fromMock.mockReturnValueOnce({ insert: insertMock })
  return { insertMock, selectMock, singleMock }
}

function mockListChain(data: unknown, error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ select: selectMock })
  return { selectMock, eqMock, orderMock }
}

function mockDeleteChain(error: unknown = null) {
  const eqMock = vi.fn().mockResolvedValue({ data: null, error })
  const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockReturnValueOnce({ delete: deleteMock })
  return { deleteMock, eqMock }
}

beforeEach(() => {
  fromMock.mockReset()
  storageFromMock.mockReset()
})

// ─── validateDocumentFile ────────────────────────────────────────────────────

describe('validateDocumentFile', () => {
  it('acepta un PDF de tamaño normal', () => {
    const file = stubFile({ name: 'plano.pdf', size: 1024, type: 'application/pdf' })
    expect(() => validateDocumentFile(file)).not.toThrow()
  })

  it('rechaza un archivo mayor a 50 MB', () => {
    const file = stubFile({ name: 'gigante.pdf', size: 50 * 1024 * 1024 + 1 })
    expect(() => validateDocumentFile(file)).toThrow('50 MB')
  })

  it('rechaza un ejecutable .exe', () => {
    const file = stubFile({ name: 'virus.exe', size: 100, type: 'application/x-msdownload' })
    expect(() => validateDocumentFile(file)).toThrow('no permitido')
  })

  it('acepta imagen PNG', () => {
    const file = stubFile({ name: 'foto.png', size: 2048, type: 'image/png' })
    expect(() => validateDocumentFile(file)).not.toThrow()
  })
})

// ─── projectDocumentService.upload ──────────────────────────────────────────

describe('projectDocumentService.upload', () => {
  it('sube a path <projectId>/... y persiste fila en DB (camino feliz)', async () => {
    const file = makeFile('plano-general.pdf')

    const { uploadMock } = mockStorageUpload()
    const inserted = {
      id: 'doc-1',
      project_id: PROJECT_ID,
      name: 'plano-general.pdf',
      storage_path: `${PROJECT_ID}/uuid-plano-general.pdf`,
      doc_type: 'plano',
      size_bytes: file.size,
      uploaded_by: 'admin@test.com',
      created_at: '2026-06-08T00:00:00Z',
    }
    const { insertMock } = mockInsertChain(inserted)

    const result = await projectDocumentService.upload(PROJECT_ID, file, {
      docType: 'plano',
      uploadedBy: 'admin@test.com',
    })

    // Storage: bucket correcto + path prefijado por projectId
    expect(storageFromMock).toHaveBeenCalledWith(BUCKET)
    expect(uploadMock).toHaveBeenCalledTimes(1)
    const [uploadedPath, uploadedFile] = uploadMock.mock.calls[0]
    expect(typeof uploadedPath).toBe('string')
    expect(uploadedPath.startsWith(`${PROJECT_ID}/`)).toBe(true)
    expect(uploadedFile).toBe(file)

    // DB: insert a la tabla correcta
    expect(fromMock).toHaveBeenCalledWith(TABLE)
    expect(insertMock).toHaveBeenCalledTimes(1)
    const payload = insertMock.mock.calls[0][0]
    expect(payload).toMatchObject({
      project_id: PROJECT_ID,
      name: 'plano-general.pdf',
      doc_type: 'plano',
      uploaded_by: 'admin@test.com',
    })

    expect(result).toEqual(inserted)
  })

  it('usa displayName explícito cuando se pasa', async () => {
    const file = makeFile('plano_v2.pdf')
    mockStorageUpload()
    const { insertMock } = mockInsertChain({
      id: 'd2',
      project_id: PROJECT_ID,
      name: 'Plano Arquitectónico v2',
      storage_path: `${PROJECT_ID}/x.pdf`,
      doc_type: null,
      size_bytes: file.size,
      uploaded_by: null,
      created_at: '',
    })

    await projectDocumentService.upload(PROJECT_ID, file, { displayName: 'Plano Arquitectónico v2' })

    expect(insertMock.mock.calls[0][0]).toMatchObject({ name: 'Plano Arquitectónico v2' })
  })

  it('si Storage.upload falla, propaga el error y NO toca la DB', async () => {
    const file = makeFile('err.pdf')
    mockStorageUpload({ message: 'storage boom' })

    await expect(projectDocumentService.upload(PROJECT_ID, file)).rejects.toEqual({ message: 'storage boom' })

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('si DB insert falla, hace rollback del archivo en Storage', async () => {
    const file = makeFile('rollback.pdf')
    const { uploadMock } = mockStorageUpload()
    mockInsertChain(null, { message: 'insert boom' })
    const { removeMock } = mockStorageRemove()

    await expect(projectDocumentService.upload(PROJECT_ID, file)).rejects.toEqual({ message: 'insert boom' })

    const uploadedPath = uploadMock.mock.calls[0][0]
    expect(removeMock).toHaveBeenCalledWith([uploadedPath])
    expect(storageFromMock).toHaveBeenNthCalledWith(1, BUCKET)
    expect(storageFromMock).toHaveBeenNthCalledWith(2, BUCKET)
  })

  it('rechaza archivo mayor a 50 MB antes de tocar Storage o DB', async () => {
    const big = stubFile({ name: 'gigante.pdf', size: 50 * 1024 * 1024 + 1 })

    await expect(projectDocumentService.upload(PROJECT_ID, big)).rejects.toThrow('50 MB')

    expect(storageFromMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })
})

// ─── projectDocumentService.listByProject ───────────────────────────────────

describe('projectDocumentService.listByProject', () => {
  it('filtra por project_id y retorna las filas ordenadas por created_at desc', async () => {
    const rows = [
      {
        id: 'd1',
        project_id: PROJECT_ID,
        name: 'plano.pdf',
        storage_path: `${PROJECT_ID}/a.pdf`,
        doc_type: 'plano',
        size_bytes: 1024,
        uploaded_by: null,
        created_at: '2026-06-08T00:00:00Z',
      },
    ]
    const { eqMock, orderMock } = mockListChain(rows)

    const result = await projectDocumentService.listByProject(PROJECT_ID)

    expect(fromMock).toHaveBeenCalledWith(TABLE)
    expect(eqMock).toHaveBeenCalledWith('project_id', PROJECT_ID)
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toEqual(rows)
  })

  it('retorna [] cuando data es null', async () => {
    mockListChain(null)
    const result = await projectDocumentService.listByProject(PROJECT_ID)
    expect(result).toEqual([])
  })

  it('propaga el error de supabase', async () => {
    mockListChain(null, { message: 'list boom' })
    await expect(projectDocumentService.listByProject(PROJECT_ID)).rejects.toEqual({ message: 'list boom' })
  })
})

// ─── projectDocumentService.getSignedUrl ────────────────────────────────────

describe('projectDocumentService.getSignedUrl', () => {
  it('retorna la URL firmada con expiry de 1h por defecto', async () => {
    const { createSignedUrlMock } = mockCreateSignedUrl({ signedUrl: 'https://example.com/signed' })

    const url = await projectDocumentService.getSignedUrl(`${PROJECT_ID}/plano.pdf`)

    expect(storageFromMock).toHaveBeenCalledWith(BUCKET)
    expect(createSignedUrlMock).toHaveBeenCalledWith(`${PROJECT_ID}/plano.pdf`, 60 * 60)
    expect(url).toBe('https://example.com/signed')
  })

  it('respeta el expiresInSec personalizado', async () => {
    const { createSignedUrlMock } = mockCreateSignedUrl({ signedUrl: 'https://example.com/short' })
    await projectDocumentService.getSignedUrl(`${PROJECT_ID}/x.pdf`, 300)
    expect(createSignedUrlMock).toHaveBeenCalledWith(`${PROJECT_ID}/x.pdf`, 300)
  })

  it('propaga error de createSignedUrl', async () => {
    mockCreateSignedUrl(null, { message: 'sign boom' })
    await expect(projectDocumentService.getSignedUrl('p/x.pdf')).rejects.toEqual({ message: 'sign boom' })
  })

  it('lanza error si signedUrl viene vacío', async () => {
    mockCreateSignedUrl({ signedUrl: '' })
    await expect(projectDocumentService.getSignedUrl('p/x.pdf')).rejects.toThrow(/enlace/)
  })
})

// ─── projectDocumentService.delete ──────────────────────────────────────────

describe('projectDocumentService.delete', () => {
  it('borra Storage primero y luego la fila de DB', async () => {
    const { removeMock } = mockStorageRemove()
    const { deleteMock, eqMock } = mockDeleteChain()

    await projectDocumentService.delete('doc-1', `${PROJECT_ID}/plano.pdf`)

    expect(storageFromMock).toHaveBeenCalledWith(BUCKET)
    expect(removeMock).toHaveBeenCalledWith([`${PROJECT_ID}/plano.pdf`])

    expect(fromMock).toHaveBeenCalledWith(TABLE)
    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(eqMock).toHaveBeenCalledWith('id', 'doc-1')
  })

  it('si Storage.remove falla, no toca la DB', async () => {
    mockStorageRemove({ message: 'storage del boom' })

    await expect(projectDocumentService.delete('doc-1', `${PROJECT_ID}/x.pdf`)).rejects.toEqual({
      message: 'storage del boom',
    })

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('si DB delete falla, propaga el error (Storage ya borrado)', async () => {
    mockStorageRemove()
    mockDeleteChain({ message: 'db del boom' })

    await expect(projectDocumentService.delete('doc-1', `${PROJECT_ID}/x.pdf`)).rejects.toEqual({
      message: 'db del boom',
    })
  })
})
