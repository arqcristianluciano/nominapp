import { supabase } from '@/lib/supabase'

export interface ScheduleTask {
  id: string
  project_id: string
  name: string
  start_date: string
  end_date: string
  progress: number
  color: string
  notes: string | null
  created_at: string
}

export type ScheduleTaskFormData = Omit<ScheduleTask, 'id' | 'created_at'>

export const scheduleService = {
  async getByProject(projectId: string): Promise<ScheduleTask[]> {
    const { data, error } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async create(task: ScheduleTaskFormData): Promise<ScheduleTask> {
    const { data, error } = await supabase
      .from('schedule_tasks')
      .insert({ ...task, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, task: Partial<ScheduleTaskFormData>): Promise<void> {
    const { error } = await supabase.from('schedule_tasks').update(task).eq('id', id)
    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('schedule_tasks').delete().eq('id', id)
    if (error) throw error
  },

  getOverallProgress(tasks: ScheduleTask[]): number {
    if (!tasks.length) return 0
    return Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
  },

  getDelayedTasks(tasks: ScheduleTask[]): ScheduleTask[] {
    const today = new Date().toISOString().split('T')[0]
    return tasks.filter((t) => t.end_date < today && t.progress < 100)
  },
}
