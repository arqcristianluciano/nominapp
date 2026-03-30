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
  created_at: string
  contractor?: { id: string; name: string; specialty: string }
}

export type AttendanceFormData = Omit<AttendanceRecord, 'id' | 'created_at' | 'contractor'>

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

  summarizeByDate(records: AttendanceRecord[]): Record<string, { total_workers: number; total_hours: number }> {
    return records.reduce<Record<string, { total_workers: number; total_hours: number }>>((acc, r) => {
      if (!acc[r.date]) acc[r.date] = { total_workers: 0, total_hours: 0 }
      acc[r.date].total_workers += r.workers_count
      acc[r.date].total_hours += r.hours_worked
      return acc
    }, {})
  },
}
