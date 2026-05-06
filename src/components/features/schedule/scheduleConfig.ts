import type { ScheduleTaskFormData } from '@/services/scheduleService'

export const SCHEDULE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6']

export const EMPTY_SCHEDULE_FORM: Omit<ScheduleTaskFormData, 'project_id'> = {
  name: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  progress: 0,
  color: '#3b82f6',
  notes: '',
}
