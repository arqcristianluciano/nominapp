import { memo, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon, ImageOff, MapPin, Trash2 } from 'lucide-react'
import { attendanceService, type AttendanceRecord } from '@/services/attendanceService'
import { useToast } from '@/components/ui/Toast'
import { parseDateLocal } from '@/utils/dateLocal'

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

function formatDate(date: string): string {
  return parseDateLocal(date).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function buildMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`
}

function PhotoLink({ path, label }: { path: string; label?: string }) {
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const { error: toastError } = useToast()
  async function handleClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const url = await attendanceService.getPhotoUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.warn('[AttendanceHistoryTable] photo url failed', err)
      setFailed(true)
      toastError('No se pudo abrir la foto.')
    } finally {
      setLoading(false)
    }
  }
  if (failed) {
    return (
      <span className="flex items-center gap-1 text-xs text-app-subtle" title="No se pudo cargar la foto">
        <ImageOff className="w-3.5 h-3.5" />
        <span>{label ? 'Foto no disponible' : 'No disponible'}</span>
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
      title="Ver foto"
    >
      <ImageIcon className="w-3.5 h-3.5" />
      {label && <span>{label}</span>}
    </button>
  )
}

interface AttendanceRowProps {
  record: AttendanceRecord
  onDelete: (recordId: string) => void
}

function AttendanceTableRowComponent({ record, onDelete }: AttendanceRowProps) {
  return (
    <tr className="hover:bg-app-hover/50">
      <td className="px-4 py-3 text-app-text whitespace-nowrap">{formatDate(record.date)}</td>
      <td className="px-4 py-3 text-app-text">{record.contractor?.name ?? '—'}</td>
      <td className="px-4 py-3 text-app-text">{record.activity}</td>
      <td className="px-4 py-3 text-center font-semibold text-app-text">{record.workers_count}</td>
      <td className="px-4 py-3 text-center text-app-text">{record.hours_worked}h</td>
      <td className="px-4 py-3 text-center font-semibold text-blue-600">
        {record.workers_count * record.hours_worked}
      </td>
      <td className="px-4 py-3 text-center">
        {record.photo_url ? (
          <div className="flex items-center justify-center">
            <PhotoLink path={record.photo_url} />
          </div>
        ) : (
          <span className="text-app-subtle text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {record.latitude != null && record.longitude != null ? (
          <a
            href={buildMapsUrl(record.latitude, record.longitude)}
            target="_blank"
            rel="noreferrer"
            title={`${record.latitude}, ${record.longitude}`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700 inline" />
          </a>
        ) : (
          <span className="text-app-subtle text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(record.id)}
          className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}
AttendanceTableRowComponent.displayName = 'AttendanceTableRow'
const AttendanceTableRow = memo(AttendanceTableRowComponent)

function AttendanceMobileCardComponent({ record, onDelete }: AttendanceRowProps) {
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-app-muted">{formatDate(record.date)}</p>
          <p className="font-semibold text-app-text text-sm truncate">{record.contractor?.name ?? '—'}</p>
          <p className="text-xs text-app-muted line-clamp-2">{record.activity}</p>
        </div>
        <button
          onClick={() => onDelete(record.id)}
          className="p-1.5 text-app-subtle hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
          aria-label="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-app-hover/40 rounded-lg px-2 py-1.5">
          <p className="text-[10px] text-app-subtle uppercase">Trab.</p>
          <p className="font-semibold text-app-text">{record.workers_count}</p>
        </div>
        <div className="bg-app-hover/40 rounded-lg px-2 py-1.5">
          <p className="text-[10px] text-app-subtle uppercase">Horas</p>
          <p className="font-semibold text-app-text">{record.hours_worked}h</p>
        </div>
        <div className="bg-app-hover/40 rounded-lg px-2 py-1.5">
          <p className="text-[10px] text-app-subtle uppercase">H-H</p>
          <p className="font-semibold text-blue-600">{record.workers_count * record.hours_worked}</p>
        </div>
      </div>

      {(record.photo_url || (record.latitude != null && record.longitude != null)) && (
        <div className="flex items-center gap-3 pt-1">
          {record.photo_url && <PhotoLink path={record.photo_url} label="Foto" />}
          {record.latitude != null && record.longitude != null && (
            <a
              href={buildMapsUrl(record.latitude, record.longitude)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" /> Ubicación
            </a>
          )}
        </div>
      )}
    </div>
  )
}
AttendanceMobileCardComponent.displayName = 'AttendanceMobileCard'
const AttendanceMobileCard = memo(AttendanceMobileCardComponent)

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
      <div className="px-4 py-3 border-b border-app-border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <h3 className="font-semibold text-app-text text-sm flex-1">Historial de asistencia</h3>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => onFilterDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-app-border rounded-lg bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filterDate && (
            <button onClick={() => onFilterDate('')} className="text-xs text-blue-600 hover:underline">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-app-muted text-sm">Cargando...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-app-muted text-sm">Sin registros.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-app-hover/50 text-xs text-app-muted">
                  <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium">Contratista</th>
                  <th className="text-left px-4 py-2.5 font-medium">Actividad</th>
                  <th className="text-center px-4 py-2.5 font-medium">Trabajadores</th>
                  <th className="text-center px-4 py-2.5 font-medium">Horas</th>
                  <th className="text-center px-4 py-2.5 font-medium">H-H</th>
                  <th className="text-center px-4 py-2.5 font-medium">Foto</th>
                  <th className="text-center px-4 py-2.5 font-medium">Ubic.</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {records.map((record) => (
                  <AttendanceTableRow key={record.id} record={record} onDelete={onDelete} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-app-border">
            {records.map((record) => (
              <AttendanceMobileCard key={record.id} record={record} onDelete={onDelete} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-app-border">
              <span className="text-xs text-app-muted">
                Pág. {page + 1} de {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={onPrev}
                  disabled={page === 0}
                  className="p-1.5 rounded hover:bg-app-hover text-app-muted disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onNext}
                  disabled={page === totalPages - 1}
                  className="p-1.5 rounded hover:bg-app-hover text-app-muted disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
