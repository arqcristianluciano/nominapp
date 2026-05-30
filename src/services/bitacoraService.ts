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

const PHOTO_BUCKET = 'bitacora-photos'
const PHOTO_SIGNED_URL_EXPIRES_SEC = 60 * 60 // 1 hour

export const bitacoraService = {
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

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('bitacora_entries').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Sube una foto al bucket `bitacora-photos` bajo `<projectId>/<timestamp>-<name>`.
   * Devuelve el path (storage key) para guardarlo en `bitacora_entries.photo_url`.
   */
  async uploadPhoto(projectId: string, file: File): Promise<string> {
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

  async deletePhoto(filePath: string): Promise<void> {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([filePath])
    if (error) throw error
  },
}
