import { useMemo, useState } from 'react'
import { Calendar } from 'lucide-react'
import { CalendarMonthGrid } from '@/components/features/calendar/CalendarMonthGrid'
import { CalendarKpis, CalendarSelectedDay, CalendarUpcoming } from '@/components/features/calendar/CalendarSidePanels'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { parseDateLocal } from '@/utils/dateLocal'

export default function Calendario() {
  const { events, loading, totals } = useCalendarEvents()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, typeof events> = {}
    for (const event of events) {
      const date = parseDateLocal(event.date)
      if (date.getFullYear() === year && date.getMonth() === month) {
        if (!grouped[event.date]) grouped[event.date] = []
        grouped[event.date].push(event)
      }
    }
    return grouped
  }, [events, year, month])

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-app-text">Calendario de Pagos</h1>
      </div>

      <CalendarKpis
        totalCxP={totals.totalCxP}
        totalLoans={totals.totalLoans}
        totalCortes={totals.totalCortes}
        overdue={totals.overdue}
      />

      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        <CalendarMonthGrid
          monthDate={currentDate}
          loading={loading}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          onSelectDate={setSelectedDate}
        />
        <CalendarSelectedDay selectedDate={selectedDate} events={selectedEvents} />
      </div>

      <CalendarUpcoming events={events} />
    </div>
  )
}
