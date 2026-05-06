import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { CalendarEvent } from '@/hooks/useCalendarEvents'

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const TYPE_COLOR: Record<CalendarEvent['type'], string> = {
  cxp: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800',
  loan: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  corte: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800',
}

interface Props {
  monthDate: Date
  loading: boolean
  selectedDate: string | null
  eventsByDate: Record<string, CalendarEvent[]>
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDate: (date: string | null) => void
}

export function CalendarMonthGrid({
  monthDate,
  loading,
  selectedDate,
  eventsByDate,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: Props) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const todayStr = new Date().toISOString().split('T')[0]

  function toDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-app-border">
        <button onClick={onPrevMonth} className="p-1.5 rounded-lg hover:bg-app-hover text-app-muted"><ChevronLeft className="w-4 h-4" /></button>
        <h2 className="font-semibold text-app-text">{MONTH_NAMES[month]} {year}</h2>
        <button onClick={onNextMonth} className="p-1.5 rounded-lg hover:bg-app-hover text-app-muted"><ChevronRight className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-7 border-b border-app-border">
        {DAY_NAMES.map((day) => <div key={day} className="py-2 text-center text-[11px] font-semibold text-app-subtle uppercase">{day}</div>)}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-app-muted text-sm">Cargando...</div>
      ) : (
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-20 border-b border-r border-app-border/50 bg-app-hover/30" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1
            const date = toDateStr(day)
            const dayEvents = eventsByDate[date] ?? []
            const isSelected = selectedDate === date
            const isToday = todayStr === date
            return (
              <button key={date} onClick={() => onSelectDate(isSelected ? null : date)} className={`h-20 border-b border-r border-app-border/50 p-1 text-left transition-colors relative ${isSelected ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-app-hover'}`}>
                <span className={`text-xs font-semibold block mb-1 ${isToday ? 'w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]' : 'text-app-muted'}`}>{day}</span>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((item) => (
                    <div key={item.id} className={`text-[9px] px-1 py-0.5 rounded truncate font-medium border ${TYPE_COLOR[item.type]}`}>{formatRD(item.amount)}</div>
                  ))}
                  {dayEvents.length > 2 && <div className="text-[9px] text-app-subtle">+{dayEvents.length - 2} más</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
