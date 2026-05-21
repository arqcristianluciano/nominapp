import { supabase } from '@/lib/supabase'

export interface AttendanceRecord {
  id: string
  project_id: string
  date: string
  contractor_id: string
  workers_count: number
  hours_worked: number
  activity: string
  notes: string | null
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  contractor?: { id: string; name: string; specialty: string }
}

export type AttendanceFormData = Omit<AttendanceRecord, 'id' | 'created_at' | 'contractor'>

const PHOTO_BUCKET = 'attendance_photos'
const PHOTO_SIGNED_URL_EXPIRES_SEC = 60 * 60 // 1 hour

export const attendanceService = {
  async getByProject(projectId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*, contractor:contractors(id,name,specialty)')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getByDate(projectId: string, date: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*, contractor:contractors(id,name,specialty)')
      .eq('project_id', projectId)
      .eq('date', date)
    if (error) throw error
    return data ?? []
  },

  async create(record: AttendanceFormData): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert({ ...record, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('attendance_records').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Sube una foto al bucket `attendance_photos` bajo `<userId>/<projectId>/<timestamp>-<name>`.
   * Devuelve el path (storage key) para guardarlo en `attendance_records.photo_url`.
   * El path empieza con `userId` para cumplir con la policy RLS (folder por usuario).
   */
  async uploadPhoto(projectId: string, file: File): Promise<string> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    const userId = userData?.user?.id
    if (!userId) throw new Error('Usuario no autenticado')

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${userId}/${projectId}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, file, { contentType: file.type || 'image/jpeg', upsert: false })
    if (error) throw error
    return filePath
  },

  /**
   * Genera una URL firmada (privada) para ver una foto del bucket.
   */
  async getPhotoUrl(
    filePath: string,
    expiresInSec: number = PHOTO_SIGNED_URL_EXPIRES_SEC,
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(filePath, expiresInSec)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('No signed URL returned')
    return data.signedUrl
  },

  async deletePhoto(filePath: string): Promise<void> {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([filePath])
    if (error) throw error
  },

  summarizeByDate(records: AttendanceRecord[]): Record<string, { total_workers: number; total_hours: number }> {
    return records.reduce<Record<string, { total_workers: number; total_hours: number }>>((acc, r) => {
      if (!acc[r.date]) acc[r.date] = { total_workers: 0, total_hours: 0 }
      acc[r.date].total_workers += r.workers_count
      acc[r.date].total_hours += r.hours_worked
      return acc
    }, {})
  },
}
