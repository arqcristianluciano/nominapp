import { useState } from 'react'
import { useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { AttendancePageHeader } from '@/components/features/attendance/AttendancePageSections'
import { AttendanceSummaryCards } from '@/components/features/attendance/AttendanceSummaryCards'
import { AttendanceForm } from '@/components/features/attendance/AttendanceForm'
import { AttendanceHistoryTable } from '@/components/features/attendance/AttendanceHistoryTable'
import { useAttendancePage } from '@/hooks/useAttendancePage'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function downloadAttendanceTemplate(): void {
  const rows: (string | number)[][] = [
    ['Fecha', 'Contratista', 'Hora entrada', 'Hora salida', 'Horas trabajadas'],
    ['2026-05-21', 'Juan Perez', '07:00', '16:00', 8],
    ['2026-05-21', 'Maria Gonzalez', '07:30', '15:30', 7.5],
    ['2026-05-21', 'Carlos Ramirez', '08:00', '17:00', 8],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const headerLength = rows[0]?.length ?? 0
  for (let c = 0; c < headerLength; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    const cell = ws[addr] as XLSX.CellObject | undefined
    if (cell) cell.s = { font: { bold: true } }
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([out], { type: XLSX_MIME })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_asistencia.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function AttendanceImportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-app-surface rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-app-text">Importar asistencia desde Excel</h2>
          </div>
          <button onClick={onClose} className="text-app-subtle hover:text-app-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Formato esperado (columnas A-E):</p>
              <button
                onClick={downloadAttendanceTemplate}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                title="Descargar plantilla de ejemplo"
              >
                <Download className="w-3 h-3" /> Descargar plantilla
              </button>
            </div>
            <p>A: Fecha (YYYY-MM-DD) - B: Contratista - C: Hora entrada - D: Hora salida - E: Horas trabajadas</p>
            <div className="bg-white border border-blue-100 rounded overflow-hidden mt-1">
              <table className="w-full text-[11px] text-blue-900">
                <thead>
                  <tr className="bg-blue-100/60 text-blue-700">
                    <th className="px-2 py-1 text-left font-semibold">A - Fecha</th>
                    <th className="px-2 py-1 text-left font-semibold">B - Contratista</th>
                    <th className="px-2 py-1 text-center font-semibold">C - Entrada</th>
                    <th className="px-2 py-1 text-center font-semibold">D - Salida</th>
                    <th className="px-2 py-1 text-right font-semibold">E - Horas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-blue-100">
                    <td className="px-2 py-1">2026-05-21</td>
                    <td className="px-2 py-1">Juan Perez</td>
                    <td className="px-2 py-1 text-center">07:00</td>
                    <td className="px-2 py-1 text-center">16:00</td>
                    <td className="px-2 py-1 text-right">8</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="px-2 py-1">2026-05-21</td>
                    <td className="px-2 py-1">Maria Gonzalez</td>
                    <td className="px-2 py-1 text-center">07:30</td>
                    <td className="px-2 py-1 text-center">15:30</td>
                    <td className="px-2 py-1 text-right">7.5</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-blue-600">
              <li>El nombre del contratista debe coincidir con uno ya registrado en el proyecto.</li>
              <li>Las horas trabajadas deben ser numericas (ej: 8, 7.5).</li>
            </ul>
          </div>

          <div
            onClick={() => alert('Pronto disponible')}
            className="border-2 border-dashed border-app-border rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
          >
            <Upload className="w-8 h-8 text-app-subtle mx-auto mb-3" />
            <p className="text-sm text-app-muted">Arrastra tu archivo Excel aqui</p>
            <p className="text-xs text-app-subtle mt-1">o haz click para seleccionar (.xlsx, .xls)</p>
            <p className="text-[11px] text-amber-600 mt-2">Carga de archivos: pronto disponible</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-app-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AsistenciaPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects } = useProjectStore()
  const project = projects.find((p) => p.id === projectId)
  const [showImportModal, setShowImportModal] = useState(false)
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
      <AttendancePageHeader projectId={projectId ?? ''} projectName={project?.name ?? 'Proyecto'} onRegister={openForm} />

      <div className="flex justify-end">
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Importar asistencia
        </button>
      </div>

      <AttendanceSummaryCards
        todayWorkers={todayWorkers}
        todayHours={todayHours}
        totalRecords={records.length}
      />

      {showForm && (
        <AttendanceForm
          form={form}
          contractors={contractors}
          saving={saving}
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

      {showImportModal && <AttendanceImportModal onClose={() => setShowImportModal(false)} />}
    </div>
  )
}
