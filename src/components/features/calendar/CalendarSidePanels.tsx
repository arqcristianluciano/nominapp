import { AlertCircle, Banknote, Calendar, CreditCard, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CalendarEvent } from '@/hooks/useCalendarEvents'
import { formatRD } from '@/utils/currency'

const TYPE_CONFIG = {
  cxp: { label: 'CxP', icon: CreditCard, color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800' },
  loan: { label: 'Cuota', icon: Banknote, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  corte: { label: 'Corte', icon: Layers, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
}

export function CalendarKpis({
  totalCxP,
  totalLoans,
  totalCortes,
  overdue,
}: {
  totalCxP: number
  totalLoans: number
  totalCortes: number
  overdue: number
}) {
  const cards = [
    { label: 'Total CxP', value: totalCxP, icon: CreditCard, color: 'text-red-600', isCount: false },
    { label: 'Cuotas préstamos', value: totalLoans, icon: Banknote, color: 'text-yellow-600', isCount: false },
    { label: 'Cortes aprobados', value: totalCortes, icon: Layers, color: 'text-blue-600', isCount: false },
    { label: 'Vencidos', value: overdue, icon: AlertCircle, color: 'text-red-700', isCount: true },
  ] as const

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-app-surface border border-app-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <card.icon className={`w-4 h-4 ${card.color}`} />
            <span className="text-xs text-app-muted">{card.label}</span>
          </div>
          <p className={`text-lg font-bold ${card.color}`}>{card.isCount ? card.value : formatRD(card.value)}</p>
        </div>
      ))}
    </div>
  )
}

export function CalendarSelectedDay({
  selectedDate,
  events,
}: {
  selectedDate: string | null
  events: CalendarEvent[]
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4">
      {selectedDate ? (
        <>
          <h3 className="font-semibold text-app-text mb-3 text-sm">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          {events.length === 0 ? (
            <p className="text-app-muted text-sm">Sin eventos este día.</p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const config = TYPE_CONFIG[event.type]
                return (
                  <Link key={event.id} to={event.link} className={`block p-3 rounded-lg border text-sm ${config.color} hover:opacity-80 transition-opacity`}>
                    <div className="flex items-center gap-2 mb-1">
                      <config.icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium text-[11px] uppercase tracking-wide">{config.label}</span>
                      {event.overdue && <span className="ml-auto text-[10px] font-bold uppercase">Vencido</span>}
                    </div>
                    <p className="font-semibold truncate">{event.title}</p>
                    <p className="text-[11px] mt-0.5 opacity-75">{event.projectName}</p>
                    <p className="font-bold mt-1">{formatRD(event.amount)}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center py-8">
          <Calendar className="w-8 h-8 text-app-subtle mb-2" />
          <p className="text-app-muted text-sm">Selecciona un día para ver los eventos</p>
        </div>
      )}
    </div>
  )
}

export function CalendarUpcoming({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl">
      <div className="px-4 py-3 border-b border-app-border">
        <h3 className="font-semibold text-app-text text-sm">Próximos pagos (todos los proyectos)</h3>
      </div>
      <div className="divide-y divide-app-border">
        {events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 15).map((event) => {
          const config = TYPE_CONFIG[event.type]
          return (
            <Link key={event.id} to={event.link} className="flex items-center gap-3 px-4 py-3 hover:bg-app-hover transition-colors">
              <config.icon className={`w-4 h-4 shrink-0 ${event.overdue ? 'text-red-500' : 'text-app-subtle'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-app-text truncate">{event.title}</p>
                <p className="text-xs text-app-muted">{event.projectName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-app-text">{formatRD(event.amount)}</p>
                <p className={`text-xs ${event.overdue ? 'text-red-500 font-semibold' : 'text-app-muted'}`}>
                  {event.overdue ? 'Vencido' : new Date(event.date + 'T12:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
