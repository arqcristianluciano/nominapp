import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import type { AttendanceRecord } from '@/services/attendanceService'

interface Props {
  records: AttendanceRecord[]
  loading: boolean
  filterDate: string
  page: number
  totalPages: number
  onFilterDate: (date: string) => void
  onPrev: () => void
  onNext: () => void
  onDelete: (recordId: string) => void
}

export function AttendanceHistoryTable({
  records,
  loading,
  filterDate,
  page,
  totalPages,
  onFilterDate,
  onPrev,
  onNext,
  onDelete,
}: Props) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-app-border flex items-center gap-3">
        <h3 className="font-semibold text-app-text text-sm flex-1">Historial de asistencia</h3>
        <input type="date" value={filterDate} onChange={(e) => onFilterDate(e.target.value)} className="px-3 py-1.5 text-xs border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {filterDate && <button onClick={() => onFilterDate('')} className="text-xs text-blue-600 hover:underline">Limpiar</button>}
      </div>
      {loading ? <div className="text-center py-8 text-app-muted text-sm">Cargando...</div> : records.length === 0 ? <div className="text-center py-8 text-app-muted text-sm">Sin registros.</div> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-app-hover/50 text-xs text-app-muted">
                <th className="text-left px-4 py-2.5 font-medium">Fecha</th><th className="text-left px-4 py-2.5 font-medium">Contratista</th><th className="text-left px-4 py-2.5 font-medium">Actividad</th><th className="text-center px-4 py-2.5 font-medium">Trabajadores</th><th className="text-center px-4 py-2.5 font-medium">Horas</th><th className="text-center px-4 py-2.5 font-medium">H-H</th><th className="px-4 py-2.5" />
              </tr></thead>
              <tbody className="divide-y divide-app-border">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-app-hover/50">
                    <td className="px-4 py-3 text-app-text whitespace-nowrap">{new Date(record.date + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-app-text">{record.contractor?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-app-text">{record.activity}</td>
                    <td className="px-4 py-3 text-center font-semibold text-app-text">{record.workers_count}</td>
                    <td className="px-4 py-3 text-center text-app-text">{record.hours_worked}h</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{record.workers_count * record.hours_worked}</td>
                    <td className="px-4 py-3"><button onClick={() => onDelete(record.id)} className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between px-4 py-2.5 border-t border-app-border"><span className="text-xs text-app-muted">Pág. {page + 1} de {totalPages}</span><div className="flex gap-1"><button onClick={onPrev} disabled={page === 0} className="p-1.5 rounded hover:bg-app-hover text-app-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><button onClick={onNext} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-app-hover text-app-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>}
        </>
      )}
    </div>
  )
}
