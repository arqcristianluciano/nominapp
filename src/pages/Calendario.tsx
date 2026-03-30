import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ChevronLeft, ChevronRight, CreditCard, Banknote, Layers, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatRD } from '@/utils/currency'

interface CalendarEvent {
  id: string
  date: string
  title: string
  amount: number
  type: 'cxp' | 'loan' | 'corte'
  projectName: string
  link: string
  overdue: boolean
}

const TYPE_CONFIG = {
  cxp:   { label: 'CxP',     icon: CreditCard, color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800' },
  loan:  { label: 'Cuota',   icon: Banknote,   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  corte: { label: 'Corte',   icon: Layers,     color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function Calendario() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    setLoading(true)
    try {
      const today = new Date()
      const [txnRes, loanRes, corteRes, projectRes] = await Promise.all([
        supabase.from('transactions').select('id, description, total, date, project_id, payment_condition, supplier:suppliers(name)').limit(300),
        supabase.from('contractor_loans').select('*, contractor:contractors(name)').eq('status', 'active'),
        supabase.from('contract_cortes').select('*, contract:adjustment_contracts(project_id, specialty)').eq('status', 'approved').limit(50),
        supabase.from('projects').select('id, name, code'),
      ])

      const projectMap: Record<string, any> = Object.fromEntries((projectRes.data ?? []).map((p: any) => [p.id, p]))
      const result: CalendarEvent[] = []

      // CxP - transactions with credit payment condition
      for (const txn of (txnRes.data ?? []) as any[]) {
        if (!txn.payment_condition?.toLowerCase().includes('credit')) continue
        const eventDate = txn.date
        const overdue = eventDate < today.toISOString().split('T')[0]
        const project = projectMap[txn.project_id]
        result.push({
          id: `cxp-${txn.id}`,
          date: eventDate,
          title: txn.supplier?.name ?? txn.description,
          amount: txn.total,
          type: 'cxp',
          projectName: project?.name ?? 'Proyecto',
          link: `/proyectos/${txn.project_id}/control`,
          overdue,
        })
      }

      // Loan installments (upcoming months)
      for (const loan of (loanRes.data ?? []) as any[]) {
        const disbursed = new Date(loan.disbursed_date)
        for (let i = 1; i <= loan.installments; i++) {
          const dueDate = new Date(disbursed)
          dueDate.setMonth(dueDate.getMonth() + i)
          const dateStr = dueDate.toISOString().split('T')[0]
          result.push({
            id: `loan-${loan.id}-${i}`,
            date: dateStr,
            title: `Cuota ${i}/${loan.installments} — ${loan.contractor?.name ?? 'Contratista'}`,
            amount: loan.installment_amount,
            type: 'loan',
            projectName: 'Préstamos',
            link: '/prestamos',
            overdue: dateStr < today.toISOString().split('T')[0],
          })
        }
      }

      // Approved cortes pending payment
      for (const corte of (corteRes.data ?? []) as any[]) {
        const project = projectMap[corte.contract?.project_id]
        result.push({
          id: `corte-${corte.id}`,
          date: corte.date,
          title: `Corte — ${corte.contract?.specialty ?? 'Contrato'}`,
          amount: corte.net_amount ?? corte.gross_amount ?? 0,
          type: 'corte',
          projectName: project?.name ?? 'Proyecto',
          link: `/proyectos/${corte.contract?.project_id}/cubicaciones`,
          overdue: false,
        })
      }

      setEvents(result)
    } finally {
      setLoading(false)
    }
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      const m = new Date(ev.date + 'T12:00:00')
      if (m.getFullYear() === year && m.getMonth() === month) {
        if (!map[ev.date]) map[ev.date] = []
        map[ev.date].push(ev)
      }
    }
    return map
  }, [events, year, month])

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  const todayStr = new Date().toISOString().split('T')[0]

  const totalCxP = events.filter((e) => e.type === 'cxp').reduce((s, e) => s + e.amount, 0)
  const totalLoans = events.filter((e) => e.type === 'loan').reduce((s, e) => s + e.amount, 0)
  const totalCortes = events.filter((e) => e.type === 'corte').reduce((s, e) => s + e.amount, 0)
  const overdue = events.filter((e) => e.overdue).length

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }

  function toDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-app-text">Calendario de Pagos</h1>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total CxP', value: totalCxP, icon: CreditCard, color: 'text-red-600' },
          { label: 'Cuotas préstamos', value: totalLoans, icon: Banknote, color: 'text-yellow-600' },
          { label: 'Cortes aprobados', value: totalCortes, icon: Layers, color: 'text-blue-600' },
          { label: 'Vencidos', value: overdue, icon: AlertCircle, color: 'text-red-700', isCount: true },
        ].map((k) => (
          <div key={k.label} className="bg-app-surface border border-app-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <span className="text-xs text-app-muted">{k.label}</span>
            </div>
            <p className={`text-lg font-bold ${k.color}`}>
              {(k as any).isCount ? k.value : formatRD(k.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        {/* Calendar grid */}
        <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-app-border">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-app-hover text-app-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-app-text">{MONTH_NAMES[month]} {year}</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-app-hover text-app-muted">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-app-border">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-app-subtle uppercase">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-app-muted text-sm">Cargando...</div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 border-b border-r border-app-border/50 bg-app-hover/30" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = toDateStr(day)
                const dayEvents = eventsByDate[dateStr] ?? []
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`h-20 border-b border-r border-app-border/50 p-1 text-left transition-colors relative ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-app-hover'
                    }`}
                  >
                    <span className={`text-xs font-semibold block mb-1 ${
                      isToday ? 'w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]' : 'text-app-muted'
                    }`}>{day}</span>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div key={ev.id} className={`text-[9px] px-1 py-0.5 rounded truncate font-medium border ${TYPE_CONFIG[ev.type].color}`}>
                          {formatRD(ev.amount)}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-app-subtle">+{dayEvents.length - 2} más</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected day detail */}
        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          {selectedDate ? (
            <>
              <h3 className="font-semibold text-app-text mb-3 text-sm">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-app-muted text-sm">Sin eventos este día.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev) => {
                    const cfg = TYPE_CONFIG[ev.type]
                    return (
                      <Link key={ev.id} to={ev.link} className={`block p-3 rounded-lg border text-sm ${cfg.color} hover:opacity-80 transition-opacity`}>
                        <div className="flex items-center gap-2 mb-1">
                          <cfg.icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-medium text-[11px] uppercase tracking-wide">{cfg.label}</span>
                          {ev.overdue && <span className="ml-auto text-[10px] font-bold uppercase">Vencido</span>}
                        </div>
                        <p className="font-semibold truncate">{ev.title}</p>
                        <p className="text-[11px] mt-0.5 opacity-75">{ev.projectName}</p>
                        <p className="font-bold mt-1">{formatRD(ev.amount)}</p>
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
      </div>

      {/* Upcoming list */}
      <div className="bg-app-surface border border-app-border rounded-xl">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="font-semibold text-app-text text-sm">Próximos pagos (todos los proyectos)</h3>
        </div>
        <div className="divide-y divide-app-border">
          {events
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 15)
            .map((ev) => {
              const cfg = TYPE_CONFIG[ev.type]
              return (
                <Link key={ev.id} to={ev.link} className="flex items-center gap-3 px-4 py-3 hover:bg-app-hover transition-colors">
                  <cfg.icon className={`w-4 h-4 shrink-0 ${ev.overdue ? 'text-red-500' : 'text-app-subtle'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-app-text truncate">{ev.title}</p>
                    <p className="text-xs text-app-muted">{ev.projectName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-app-text">{formatRD(ev.amount)}</p>
                    <p className={`text-xs ${ev.overdue ? 'text-red-500 font-semibold' : 'text-app-muted'}`}>
                      {ev.overdue ? 'Vencido' : new Date(ev.date + 'T12:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </Link>
              )
            })}
        </div>
      </div>
    </div>
  )
}
