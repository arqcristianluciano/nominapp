import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { attendanceService, type AttendanceRecord, type AttendanceFormData } from '@/services/attendanceService'
import { contractorService } from '@/services/contractorService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { Contractor } from '@/types/database'
import { ATTENDANCE_PAGE_SIZE, EMPTY_ATTENDANCE_FORM } from '@/components/features/attendance/attendanceConfig'
import { AttendancePageHeader } from '@/components/features/attendance/AttendancePageSections'
import { AttendanceSummaryCards } from '@/components/features/attendance/AttendanceSummaryCards'
import { AttendanceForm } from '@/components/features/attendance/AttendanceForm'
import { AttendanceHistoryTable } from '@/components/features/attendance/AttendanceHistoryTable'

export default function AsistenciaPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
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
    setLoading(true)
    try {
      const [recs, conts] = await Promise.all([
        attendanceService.getByProject(projectId!),
        contractorService.getAll(),
      ])
      setRecords(recs)
      setContractors(conts)
    } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { loadAll() }, [loadAll])

  const filtered = useMemo(() => {
    if (!filterDate) return records
    return records.filter((r) => r.date === filterDate)
  }, [records, filterDate])

  const totalPages = Math.ceil(filtered.length / ATTENDANCE_PAGE_SIZE)
  const paged = filtered.slice(page * ATTENDANCE_PAGE_SIZE, (page + 1) * ATTENDANCE_PAGE_SIZE)

  const summary = useMemo(() => attendanceService.summarizeByDate(records), [records])
  const todayStr = new Date().toISOString().split('T')[0]

  async function handleAdd() {
    if (!form.contractor_id || !form.activity.trim()) return
    setSaving(true)
    try {
      await attendanceService.create({ ...form, project_id: projectId! })
      setShowForm(false)
      setForm({ ...EMPTY_ATTENDANCE_FORM })
      await loadAll()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    await attendanceService.delete(deleteId)
    setDeleteId(null)
    await loadAll()
  }

  const todaySummary = summary[todayStr]

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <AttendancePageHeader projectId={projectId!} projectName={project?.name ?? 'Proyecto'} onRegister={() => setShowForm(true)} />

      <AttendanceSummaryCards
        todayWorkers={todaySummary?.total_workers ?? 0}
        todayHours={todaySummary?.total_hours ?? 0}
        totalRecords={records.length}
      />

      {showForm && (
        <AttendanceForm
          form={form}
          contractors={contractors}
          saving={saving}
          onChange={setForm}
          onCancel={() => setShowForm(false)}
          onSave={handleAdd}
        />
      )}

      <AttendanceHistoryTable
        records={paged}
        loading={loading}
        filterDate={filterDate}
        page={page}
        totalPages={totalPages}
        onFilterDate={(date) => { setFilterDate(date); setPage(0) }}
        onPrev={() => setPage((value) => Math.max(0, value - 1))}
        onNext={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
        onDelete={setDeleteId}
      />

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar registro"
        message="¿Eliminar este registro de asistencia?"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
