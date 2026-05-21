import { AlertTriangle, ChevronDown, ChevronUp, Pencil, Trash2, Users } from 'lucide-react'
import type { BitacoraEntry } from '@/services/bitacoraService'
import { parseDateLocal } from '@/utils/dateLocal'
import { WEATHER_OPTIONS } from './bitacoraConfig'

function WeatherIcon({ weather }: { weather: string }) {
  const option = WEATHER_OPTIONS.find((item) => item.value === weather)
  if (!option) return null
  const Icon = option.icon
  return <Icon className="w-4 h-4" />
}

interface Props {
  entries: BitacoraEntry[]
  expandedId: string | null
  onToggleExpand: (entryId: string) => void
  onEdit: (entry: BitacoraEntry) => void
  onDelete: (entryId: string) => void
}

export function BitacoraEntriesList({ entries, expandedId, onToggleExpand, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
          <button onClick={() => onToggleExpand(entry.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-app-hover transition-colors text-left">
            <div className="flex items-center gap-2 text-app-muted"><WeatherIcon weather={entry.weather} />{entry.temp_c != null && <span className="text-xs">{entry.temp_c}°C</span>}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-app-text">{parseDateLocal(entry.date).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><p className="text-xs text-app-muted truncate">{entry.work_summary}</p></div>
            <div className="flex items-center gap-3 shrink-0"><span className="flex items-center gap-1 text-xs text-app-muted"><Users className="w-3.5 h-3.5" />{entry.workforce_count}</span>{entry.incidents && <AlertTriangle className="w-4 h-4 text-yellow-500" />}{expandedId === entry.id ? <ChevronUp className="w-4 h-4 text-app-subtle" /> : <ChevronDown className="w-4 h-4 text-app-subtle" />}</div>
          </button>
          {expandedId === entry.id && (
            <div className="px-4 pb-4 border-t border-app-border/50 pt-3 space-y-2">
              <p className="text-sm text-app-text">{entry.work_summary}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {entry.equipment && <><span className="text-app-muted font-medium">Equipos:</span><span className="text-app-text">{entry.equipment}</span></>}
                {entry.visitors && <><span className="text-app-muted font-medium">Visitas:</span><span className="text-app-text">{entry.visitors}</span></>}
                {entry.incidents && <><span className="text-yellow-600 font-medium">Incidentes:</span><span className="text-app-text">{entry.incidents}</span></>}
                {entry.notes && <><span className="text-app-muted font-medium">Notas:</span><span className="text-app-text">{entry.notes}</span></>}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => onEdit(entry)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-app-border rounded-lg hover:bg-app-hover text-app-muted"><Pencil className="w-3.5 h-3.5" />Editar</button>
                <button onClick={() => onDelete(entry.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
