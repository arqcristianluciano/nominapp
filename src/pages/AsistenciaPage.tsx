import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { AttendancePageHeader } from '@/components/features/attendance/AttendancePageSections'
import { AttendanceSummaryCards } from '@/components/features/attendance/AttendanceSummaryCards'
import { AttendanceForm } from '@/components/features/attendance/AttendanceForm'
import { AttendanceHistoryTable } from '@/components/features/attendance/AttendanceHistoryTable'
import { useAttendancePage } from '@/hooks/useAttendancePage'

// Nota: se retiró el botón "Importar asistencia". Abría una ventana con
// plantilla de Excel, pero la carga real no existía (solo avisaba "pronto
// disponible") y la plantilla pedía columnas —hora de entrada/salida— que la
// app no guarda. Se ocultó para no prometer algo que no funciona. Cuando la
// importación esté lista y alineada con los campos reales, se vuelve a mostrar.

export default function AsistenciaPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const {
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
    todayWorkers,
    todayHours,
    openForm,
    closeForm,
    setForm,
    setDeleteId,
    handleAdd,
    handleDelete,
    handleFilterDate,
    handlePrevPage,
    handleNextPage,
  } = useAttendancePage(projectId)

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <AttendancePageHeader
        projectId={projectId ?? ''}
        projectName={project?.name ?? 'Proyecto'}
        onRegister={openForm}
      />

      <AttendanceSummaryCards todayWorkers={todayWorkers} todayHours={todayHours} totalRecords={records.length} />

      {showForm && (
        <AttendanceForm
          form={form}
          contractors={contractors}
          saving={saving}
          projectId={projectId}
          onChange={setForm}
          onCancel={closeForm}
          onSave={handleAdd}
        />
      )}

      <AttendanceHistoryTable
        records={pagedRecords}
        loading={loading}
        filterDate={filterDate}
        page={page}
        totalPages={totalPages}
        onFilterDate={handleFilterDate}
        onPrev={handlePrevPage}
        onNext={handleNextPage}
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
