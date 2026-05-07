import { useCallback, useEffect, useMemo, useState } from 'react'
import { attendanceService, type AttendanceFormData, type AttendanceRecord } from '@/services/attendanceService'
import { contractorService } from '@/services/contractorService'
import type { Contractor } from '@/types/database'
import { ATTENDANCE_PAGE_SIZE, EMPTY_ATTENDANCE_FORM } from '@/components/features/attendance/attendanceConfig'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'

interface UseAttendancePageResult {
  records: AttendanceRecord[]
  contractors: Contractor[]
  loading: boolean
  showForm: boolean
  form: Omit<AttendanceFormData, 'project_id'>
  deleteId: string | null
  saving: boolean
  page: number
  filterDate: string
  totalPages: number
  pagedRecords: AttendanceRecord[]
  todayWorkers: number
  todayHours: number
  openForm: () => void
  closeForm: () => void
  setForm: (next: Omit<AttendanceFormData, 'project_id'>) => void
  setDeleteId: (recordId: string | null) => void
  handleAdd: () => Promise<void>
  handleDelete: () => Promise<void>
  handleFilterDate: (date: string) => void
  handlePrevPage: () => void
  handleNextPage: () => void
}

export function useAttendancePage(projectId: string | undefined): UseAttendancePageResult {
  const { error } = useToast()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<AttendanceFormData, 'project_id'>>({ ...EMPTY_ATTENDANCE_FORM })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const [filterDate, setFilterDate] = useState('')

  const loadAll = useCallback(async () => {
    if (!projectId) {
      setRecords([])
      setContractors([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [attendanceRecords, contractorsList] = await Promise.all([
        attendanceService.getByProject(projectId),
        contractorService.getAll(),
      ])
      setRecords(attendanceRecords)
      setContractors(contractorsList)
    } catch (loadError) {
      error(`No se pudo cargar asistencia: ${getErrorMessage(loadError)}`)
    } finally {
      setLoading(false)
    }
  }, [error, projectId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const filteredRecords = useMemo(() => {
    if (!filterDate) return records
    return records.filter((record) => record.date === filterDate)
  }, [records, filterDate])

  const totalPages = Math.ceil(filteredRecords.length / ATTENDANCE_PAGE_SIZE)
  const pagedRecords = filteredRecords.slice(page * ATTENDANCE_PAGE_SIZE, (page + 1) * ATTENDANCE_PAGE_SIZE)

  const todaySummary = useMemo(() => {
    const summaryByDate = attendanceService.summarizeByDate(records)
    const today = new Date().toISOString().split('T')[0]
    return summaryByDate[today]
  }, [records])

  const openForm = useCallback(() => setShowForm(true), [])
  const closeForm = useCallback(() => setShowForm(false), [])

  const handleFilterDate = useCallback((date: string) => {
    setFilterDate(date)
    setPage(0)
  }, [])

  const handlePrevPage = useCallback(() => {
    setPage((value) => Math.max(0, value - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setPage((value) => Math.min(totalPages - 1, value + 1))
  }, [totalPages])

  const handleAdd = useCallback(async () => {
    if (!projectId || !form.contractor_id || !form.activity.trim()) return

    setSaving(true)
    try {
      await attendanceService.create({ ...form, project_id: projectId })
      setShowForm(false)
      setForm({ ...EMPTY_ATTENDANCE_FORM })
      await loadAll()
    } catch (saveError) {
      error(`No se pudo registrar asistencia: ${getErrorMessage(saveError)}`)
    } finally {
      setSaving(false)
    }
  }, [error, form, loadAll, projectId])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      await attendanceService.delete(deleteId)
      setDeleteId(null)
      await loadAll()
    } catch (deleteError) {
      error(`No se pudo eliminar asistencia: ${getErrorMessage(deleteError)}`)
    }
  }, [deleteId, error, loadAll])

  return {
    records,
    contractors,
    loading,
    showForm,
    form,
    deleteId,
    saving,
    page,
    filterDate,
    totalPages,
    pagedRecords,
    todayWorkers: todaySummary?.total_workers ?? 0,
    todayHours: todaySummary?.total_hours ?? 0,
    openForm,
    closeForm,
    setForm,
    setDeleteId,
    handleAdd,
    handleDelete,
    handleFilterDate,
    handlePrevPage,
    handleNextPage,
  }
}
