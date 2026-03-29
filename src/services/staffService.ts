import { supabase } from '@/lib/supabase'
import type { StaffMember } from '@/types/database'

export const staffService = {
  async getAll() {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return data as StaffMember[]
  },

  async create(staff: { name: string; role?: string }) {
    const { data, error } = await supabase
      .from('staff_members')
      .insert(staff)
      .select()
      .single()
    if (error) throw error
    return data as StaffMember
  },
}
