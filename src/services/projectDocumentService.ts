import { supabase } from '@/lib/supabase'
import type { ProjectDocument, ProjectDocumentType } from '@/types/database'

const BUCKET = 'project-documents'
const SIGNED_URL_EXPIRES_SEC = 60 * 60 // 1 hora

/** Tipos de documento disponibles con etiqueta en español. */
export const PROJECT_DOC_TYPES: { value: ProjectDocumentType; label: string }[] = [
  { value: 'plano', label: 'Plano' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'permiso', label: 'Permiso' },
  { value: 'otro', label: 'Otro' },
]

/** Tamaño máximo por archivo: 50 MB. */
const MAX_FILE_BYTES = 50 * 1024 * 1024

/**
 * Valida tipo MIME y tamaño antes de subir.
 * Acepta PDF, imágenes comunes, Office y archivos genéricos.
 * Lanza Error en español si el archivo no pasa.
 */
export function validateDocumentFile(file: File): void {
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`El archivo pesa ${mb} MB. El máximo permitido es 50 MB.`)
  }
  // Rechazar ejecutables obvios por extensión
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const blocked = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'dmg', 'app']
  if (blocked.includes(ext)) {
    throw new Error(`Tipo de archivo no permitido: .${ext}. Use PDF, imagen, Word, Excel o ZIP.`)
  }
}

export const projectDocumentService = {
  // ─────────────────────────────────────────────────────────────────────────
  // Listar documentos de un proyecto
  // ─────────────────────────────────────────────────────────────────────────

  async listByProject(projectId: string): Promise<ProjectDocument[]> {
    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Subir un documento: Storage + fila en DB
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sube el archivo al bucket y crea la fila en project_documents.
   * Si la inserción en DB falla, elimina el archivo del bucket (rollback).
   */
  async upload(
    projectId: string,
    file: File,
    options?: {
      docType?: ProjectDocumentType
      uploadedBy?: string
      displayName?: string
    },
  ): Promise<ProjectDocument> {
    validateDocumentFile(file)

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`

    // 1. Subir a Storage
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
    if (uploadError) throw uploadError

    // 2. Insertar fila en DB; si falla, hacer rollback del archivo
    const { data, error: dbError } = await supabase
      .from('project_documents')
      .insert({
        project_id: projectId,
        name: options?.displayName ?? file.name,
        storage_path: storagePath,
        doc_type: options?.docType ?? null,
        size_bytes: file.size,
        uploaded_by: options?.uploadedBy ?? null,
      })
      .select()
      .single()

    if (dbError) {
      // Rollback: intentar eliminar el archivo ya subido
      await supabase.storage.from(BUCKET).remove([storagePath])
      throw dbError
    }

    return data as ProjectDocument
  },

  // ─────────────────────────────────────────────────────────────────────────
  // URL firmada para ver / descargar
  // ─────────────────────────────────────────────────────────────────────────

  async getSignedUrl(storagePath: string, expiresInSec: number = SIGNED_URL_EXPIRES_SEC): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSec)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('No se pudo generar el enlace de descarga.')
    return data.signedUrl
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Eliminar: Storage + fila en DB
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Borra el archivo del bucket y luego elimina la fila de la tabla.
   * Si el borrado en Storage falla, no toca la DB (lanzará el error).
   */
  async delete(id: string, storagePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath])
    if (storageError) throw storageError

    const { error: dbError } = await supabase.from('project_documents').delete().eq('id', id)
    if (dbError) throw dbError
  },
}
