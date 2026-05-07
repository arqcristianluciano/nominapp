import type { QualityControl } from '@/types/database'

export function calcExpectedTestDate(pourDate: string, testAge: string | null): string | null {
  if (!pourDate || !testAge) return null
  const days = parseInt(testAge)
  if (isNaN(days)) return null
  const date = new Date(pourDate)
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('es-DO')
}

export function daysUntilTest(pourDate: string, testAge: string | null): number | null {
  if (!pourDate || !testAge) return null
  const days = parseInt(testAge)
  if (isNaN(days)) return null
  const testDate = new Date(pourDate)
  testDate.setDate(testDate.getDate() + days)
  return Math.ceil((testDate.getTime() - Date.now()) / 86400000)
}

export function getQualityStats(records: QualityControl[]) {
  const passed = records.filter((record) => record.status === 'passed').length
  const failed = records.filter((record) => record.status === 'failed').length
  const pending = records.filter((record) => !record.status).length

  return { passed, failed, pending }
}
