import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ImageIcon,
  Pencil,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { bitacoraService, type BitacoraEntry } from '@/services/bitacoraService'
import { parseDateLocal, todayISO } from '@/utils/dateLocal'
import { WEATHER_OPTIONS } from './bitacoraConfig'

const PAGE_SIZE = 50

function WeatherIcon({ weather }: { weather: string }) {
  const option = WEATHER_OPTIONS.find((item) => item.value === weather)
  if (!option) return null
  const Icon = option.icon
  return <Icon className="w-4 h-4" />
}

function getCurrentWeekRange(): { from: string; to: string } {
  const today = new Date()
  const day = today.getDay() // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: toISO(monday), to: toISO(sunday) }
}

interface Props {
  entries: BitacoraEntry[]
  expandedId: string | null
  onToggleExpand: (entryId: string) => void
  onEdit: (entry: BitacoraEntry) => void
  onDelete: (entryId: string) => void
}

// Fetches a signed URL once per path, shared between thumb and full view.
function useSignedPhotoUrl(path: string): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    void bitacoraService
      .getPhotoUrl(path)
      .then((signed) => {
        if (!cancelled) setUrl(signed)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [path])
  return url
}

function PhotoThumb({ path, alt }: { path: string; alt: string }) {
  const url = useSignedPhotoUrl(path)
  if (!url) {
    return (
      <div className="flex items-center justify-center w-12 h-12 rounded-md border border-app-border bg-app-bg text-app-subtle">
        <ImageIcon className="w-4 h-4" />
      </div>
    )
  }
  return <img src={url} alt={alt} className="w-12 h-12 rounded-md object-cover border border-app-border" />
}

function PhotoFull({ path, alt }: { path: string; alt: string }) {
  const url = useSignedPhotoUrl(path)
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
      <img src={url} alt={alt} className="max-h-64 rounded-lg border border-app-border object-cover" />
    </a>
  )
}

export function BitacoraEntriesList({ entries, expandedId, onToggleExpand, onEdit, onDelete }: Props) {
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [currentWeekOnly, setCurrentWeekOnly] = useState(false)
  const [page, setPage] = useState(0)

  const effectiveRange = useMemo(() => {
    if (currentWeekOnly) return getCurrentWeekRange()
    return { from: dateFrom, to: dateTo }
  }, [currentWeekOnly, dateFrom, dateTo])

  const filteredEntries = useMemo(() => {
    const { from, to } = effectiveRange
    if (!from && !to) return entries
    return entries.filter((entry) => {
      if (from && entry.date < from) return false
      if (to && entry.date > to) return false
      return true
    })
  }, [entries, effectiveRange])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))
  const needsPagination = filteredEntries.length > PAGE_SIZE

  // Reset page when filters or entry list change (patrón recomendado de React:
  // ajustar estado durante el render en vez de en un efecto).
  const filtersKey = `${dateFrom}|${dateTo}|${currentWeekOnly}|${entries.length}`
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey)
  if (prevFiltersKey !== filtersKey) {
    setPrevFiltersKey(filtersKey)
    setPage(0)
  }

  // Clamp page index so it never exceeds valid range.
  const clampedPage = Math.min(page, Math.max(0, totalPages - 1))

  const visibleEntries = useMemo(() => {
    if (!needsPagination) return filteredEntries
    const start = clampedPage * PAGE_SIZE
    return filteredEntries.slice(start, start + PAGE_SIZE)
  }, [clampedPage, filteredEntries, needsPagination])

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setCurrentWeekOnly(false)
  }

  const hasActiveFilter = currentWeekOnly || dateFrom || dateTo
  const today = todayISO()

  return (
    <div className="space-y-3">
      <div className="bg-app-surface border border-app-border rounded-xl p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentWeekOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              currentWeekOnly
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-app-border text-app-muted hover:bg-app-hover'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Solo semana actual
          </button>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-app-muted hover:text-app-text rounded-lg hover:bg-app-hover"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
          <span className="ml-auto text-xs text-app-muted">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'registro' : 'registros'}
            {filteredEntries.length !== entries.length && ` de ${entries.length}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-app-muted">
            Desde
            <input
              type="date"
              value={dateFrom}
              max={dateTo || today}
              disabled={currentWeekOnly}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 text-xs border border-app-border rounded-md bg-app-bg text-app-text disabled:opacity-50"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-app-muted">
            Hasta
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              disabled={currentWeekOnly}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 text-xs border border-app-border rounded-md bg-app-bg text-app-text disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="bg-app-surface border border-app-border rounded-xl p-6 text-center text-sm text-app-muted">
          No hay registros que coincidan con los filtros seleccionados.
        </div>
      ) : (
        visibleEntries.map((entry) => {
          const dateLabel = parseDateLocal(entry.date).toLocaleDateString('es-DO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          const isExpanded = expandedId === entry.id
          return (
            <div key={entry.id} className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
              <button
                onClick={() => onToggleExpand(entry.id)}
                className="w-full text-left hover:bg-app-hover transition-colors"
              >
                {/* Layout vertical en mobile (cards), horizontal en sm+ */}
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  {/* Fila 1 mobile / izquierda en desktop: fecha + clima + thumbnail foto */}
                  <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                    {entry.photo_url ? (
                      <PhotoThumb path={entry.photo_url} alt={`Foto ${entry.date}`} />
                    ) : (
                      <div className="hidden sm:flex items-center gap-2 text-app-muted shrink-0">
                        <WeatherIcon weather={entry.weather} />
                        {entry.temp_c != null && <span className="text-xs">{entry.temp_c}°C</span>}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:hidden text-app-muted mb-0.5">
                        <WeatherIcon weather={entry.weather} />
                        {entry.temp_c != null && <span className="text-xs">{entry.temp_c}°C</span>}
                        {entry.incidents && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />}
                      </div>
                      <p className="text-sm font-semibold text-app-text capitalize truncate">{dateLabel}</p>
                      <p className="text-xs text-app-muted line-clamp-2 sm:truncate">{entry.work_summary}</p>
                    </div>
                  </div>

                  {/* Fila 2 mobile / derecha en desktop: contadores + chevron */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:shrink-0 pl-0 sm:pl-2">
                    <span className="flex items-center gap-1 text-xs text-app-muted">
                      <Users className="w-3.5 h-3.5" />
                      {entry.workforce_count}
                    </span>
                    {entry.incidents && <AlertTriangle className="hidden sm:block w-4 h-4 text-yellow-500" />}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-app-subtle" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-app-subtle" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-app-border/50 pt-3 space-y-3">
                  <p className="text-sm text-app-text whitespace-pre-wrap">{entry.work_summary}</p>
                  {entry.photo_url && <PhotoFull path={entry.photo_url} alt={`Foto ${entry.date}`} />}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    {entry.equipment && (
                      <div className="flex gap-2">
                        <span className="text-app-muted font-medium shrink-0">Equipos:</span>
                        <span className="text-app-text">{entry.equipment}</span>
                      </div>
                    )}
                    {entry.visitors && (
                      <div className="flex gap-2">
                        <span className="text-app-muted font-medium shrink-0">Visitas:</span>
                        <span className="text-app-text">{entry.visitors}</span>
                      </div>
                    )}
                    {entry.incidents && (
                      <div className="flex gap-2">
                        <span className="text-yellow-600 font-medium shrink-0">Incidentes:</span>
                        <span className="text-app-text">{entry.incidents}</span>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="flex gap-2">
                        <span className="text-app-muted font-medium shrink-0">Notas:</span>
                        <span className="text-app-text">{entry.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                    <button
                      onClick={() => onEdit(entry)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs border border-app-border rounded-lg hover:bg-app-hover text-app-muted"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {needsPagination && (
        <div className="flex items-center justify-between gap-2 bg-app-surface border border-app-border rounded-xl px-3 py-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-app-border rounded-lg text-app-muted hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Anterior
          </button>
          <span className="text-xs text-app-muted">
            Página {clampedPage + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={clampedPage >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-app-border rounded-lg text-app-muted hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
