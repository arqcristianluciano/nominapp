import type { AttendanceFormData } from '@/services/attendanceService'

export const ATTENDANCE_PAGE_SIZE = 10

export const EMPTY_ATTENDANCE_FORM: Omit<AttendanceFormData, 'project_id'> = {
  date: new Date().toISOString().split('T')[0],
  contractor_id: '',
  workers_count: 1,
  hours_worked: 8,
  activity: '',
  notes: '',
}
