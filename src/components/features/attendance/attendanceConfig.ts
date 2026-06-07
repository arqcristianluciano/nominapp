import type { AttendanceFormData } from '@/services/attendanceService'
import { todayISO } from '@/utils/dateLocal'

export const ATTENDANCE_PAGE_SIZE = 10

export const EMPTY_ATTENDANCE_FORM: Omit<AttendanceFormData, 'project_id'> = {
  date: todayISO(),
  contractor_id: '',
  workers_count: 1,
  hours_worked: 8,
  activity: '',
  notes: '',
  photo_url: null,
  latitude: null,
  longitude: null,
}
