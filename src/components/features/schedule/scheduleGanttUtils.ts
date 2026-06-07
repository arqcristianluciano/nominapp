import type { ScheduleTask } from '@/services/scheduleService'

export interface GanttMonth {
  label: string
  left: number
  width: number
}

export interface GanttInfo {
  minDate: Date
  totalDays: number
  months: GanttMonth[]
}

/**
 * Build Gantt timeline info from a list of tasks.
 * Accepts all tasks (including subtasks) to compute the full date range.
 */
export function buildGanttInfo(tasks: ScheduleTask[]): GanttInfo | null {
  if (!tasks.length) return null
  const allDates = tasks.flatMap((task) => [new Date(task.start_date), new Date(task.end_date)])
  const minDate = new Date(Math.min(...allDates.map((date) => date.getTime())))
  const maxDate = new Date(Math.max(...allDates.map((date) => date.getTime())))
  minDate.setDate(1)
  maxDate.setMonth(maxDate.getMonth() + 1, 0)
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 1

  const months: GanttMonth[] = []
  const cursor = new Date(minDate)
  while (cursor <= maxDate) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const startOffset = Math.max(0, Math.ceil((monthStart.getTime() - minDate.getTime()) / 86400000))
    const endOffset = Math.min(totalDays - 1, Math.ceil((monthEnd.getTime() - minDate.getTime()) / 86400000))
    months.push({
      label: monthStart.toLocaleDateString('es-DO', { month: 'short', year: '2-digit' }),
      left: (startOffset / totalDays) * 100,
      width: ((endOffset - startOffset + 1) / totalDays) * 100,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return { minDate, totalDays, months }
}

export function getTodayLeft(ganttInfo: GanttInfo | null, today: string): string | null {
  if (!ganttInfo) return null
  const todayOffset = Math.ceil((new Date(today).getTime() - ganttInfo.minDate.getTime()) / 86400000)
  return `${(todayOffset / ganttInfo.totalDays) * 100}%`
}
