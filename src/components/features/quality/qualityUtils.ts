import type { QualityControl } from '@/types/database'
import { parseDateLocal } from '@/utils/dateLocal'

export function calcExpectedTestDate(pourDate: string, testAge: string | null): string | null {
  if (!pourDate || !testAge) return null
  const days = parseInt(testAge)
  if (isNaN(days)) return null
  // Parse as local date to avoid UTC off-by-one when showing the date.
  const date = parseDateLocal(pourDate)
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('es-DO')
}

export function daysUntilTest(pourDate: string, testAge: string | null): number | null {
  if (!pourDate || !testAge) return null
  const days = parseInt(testAge)
  if (isNaN(days)) return null
  // Parse as local date to avoid UTC off-by-one when computing remaining days.
  const testDate = parseDateLocal(pourDate)
  testDate.setDate(testDate.getDate() + days)
  return Math.ceil((testDate.getTime() - Date.now()) / 86400000)
}

export function getQualityStats(records: QualityControl[]) {
  const passed = records.filter((record) => record.status === 'passed').length
  const failed = records.filter((record) => record.status === 'failed').length
  const pending = records.filter((record) => !record.status).length

  return { passed, failed, pending }
}
