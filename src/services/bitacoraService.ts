import { supabase } from '@/lib/supabase'

export interface BitacoraEntry {
  id: string
  project_id: string
  date: string
  weather: string
  temp_c: number | null
  work_summary: string
  workforce_count: number
  equipment: string | null
  visitors: string | null
  incidents: string | null
  notes: string | null
  photo_url: string | null
  created_by: string
  created_at: string
}

export type BitacoraFormData = Omit<BitacoraEntry, 'id' | 'created_at'>

/** Fila de la tabla bitacora_photos (migración 077). */
export interface BitacoraPhoto {
  id: string
  bitacora_id: string
  storage_path: string
  uploaded_at: string
}

/** Foto pendiente de subir (solo vive en memoria del form). */
export interface PendingPhoto {
  /** URL local (object URL) para la preview antes de guardar. */
  localUrl: string
  file: File
}

const PHOTO_BUCKET = 'bitacora-photos'
const PHOTO_SIGNED_URL_EXPIRES_SEC = 60 * 60 // 1 hour

/** Tamaño máximo permitido por foto: 10 MB. */
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
/** Tipos MIME aceptados. */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/**
 * Valida tipo y tamaño de un archivo de foto.
 * Lanza un Error con mensaje en español si falla.
 */
export function validatePhotoFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    throw new Error(`Tipo de archivo no permitido: ${file.type || 'desconocido'}. Use JPG, PNG o WebP.`)
  }
  if (file.size > MAX_PHOTO_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`La foto pesa ${mb} MB. El máximo permitido es 10 MB.`)
  }
  // TODO: Si se agrega una utilidad de compresión al proyecto (p.ej. browser-image-compression),
  // invocarla aquí antes de devolver el control al caller.
}

export const bitacoraService = {
  // ─────────────────────────────────────────────────────────────────────────
  // CRUD de entradas
  // ─────────────────────────────────────────────────────────────────────────

  async getByProject(projectId: string): Promise<BitacoraEntry[]> {
    const { data, error } = await supabase
      .from('bitacora_entries')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async create(entry: BitacoraFormData): Promise<BitacoraEntry> {
    const { data, error } = await supabase
      .from('bitacora_entries')
      .insert({ ...entry, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, entry: Partial<BitacoraFormData>): Promise<void> {
    const { error } = await supabase.from('bitacora_entries').update(entry).eq('id', id)
    if (error) throw error
  },

  /**
   * Borra el registro de bitácora.  Las fotos de `bitacora_photos` se
   * eliminan en cascada por la FK ON DELETE CASCADE.  Los archivos del
   * bucket deben eliminarse con `deletePhotoFiles` antes de llamar a esta
   * función (ya que el bucket no tiene cascada automática).
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('bitacora_entries').delete().eq('id', id)
    if (error) throw error
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Fotos en tabla bitacora_photos
  // ─────────────────────────────────────────────────────────────────────────

  /** Obtiene todas las fotos de un registro desde la tabla relacional. */
  async getPhotos(bitacoraId: string): Promise<BitacoraPhoto[]> {
    const { data, error } = await supabase
      .from('bitacora_photos')
      .select('*')
      .eq('bitacora_id', bitacoraId)
      .order('uploaded_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  /** Inserta una fila en bitacora_photos después de subir el archivo al bucket. */
  async addPhotoRecord(bitacoraId: string, storagePath: string): Promise<BitacoraPhoto> {
    const { data, error } = await supabase
      .from('bitacora_photos')
      .insert({ bitacora_id: bitacoraId, storage_path: storagePath })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Elimina una fila de bitacora_photos (la fila de la tabla, no el archivo). */
  async removePhotoRecord(photoId: string): Promise<void> {
    const { error } = await supabase.from('bitacora_photos').delete().eq('id', photoId)
    if (error) throw error
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Storage (bucket bitacora-photos)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sube una foto al bucket `bitacora-photos` bajo `<projectId>/<timestamp>-<name>`.
   * Devuelve el storage path.  Lanza Error si el archivo no pasa la validación.
   */
  async uploadPhoto(projectId: string, file: File): Promise<string> {
    validatePhotoFile(file)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${projectId}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, file, { contentType: file.type || 'image/jpeg', upsert: false })
    if (error) throw error
    return filePath
  },

  /**
   * Genera una URL firmada (privada) para ver una foto del bucket.
   */
  async getPhotoUrl(filePath: string, expiresInSec: number = PHOTO_SIGNED_URL_EXPIRES_SEC): Promise<string> {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(filePath, expiresInSec)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('No signed URL returned')
    return data.signedUrl
  },

  /** Elimina un archivo del bucket (por su storage_path). */
  async deletePhoto(filePath: string): Promise<void> {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([filePath])
    if (error) throw error
  },

  /**
   * Elimina varios archivos del bucket de una vez.
   * Usado al borrar un registro completo para limpiar sus fotos del storage.
   * Ignora errores individuales para no bloquear la operación principal.
   */
  async deletePhotoFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) return
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths)
    if (error) throw error
  },
}
