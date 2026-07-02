/**
 * ProjectTendencias – Gráficas de tendencia en la página de detalle de proyecto.
 *
 * Muestra:
 *  1. Gasto real mensual (barras azules) vs. lo planificado (barras verdes) — últimos 12 meses.
 *  2. Avance de obra mensual (línea naranja) si hay tareas de cronograma con progreso.
 */

import { useEffect, useState } from 'react'
import { BarChart } from '@/components/ui/charts/BarChart'
import { LineChart } from '@/components/ui/charts/LineChart'
import { cashFlowService, type MonthlyCashFlowRow } from '@/services/cashFlowService'
import { scheduleService, type ScheduleTask } from '@/services/scheduleService'
import { supabase } from '@/lib/supabase'
import { cashFlowToSeries } from '@/utils/trendHelpers'
import { formatRD } from '@/utils/currency'

const MONTHS = 12

interface Props {
  projectId: string
}

interface ScheduleMonthlyProgress {
  month: string
  progress: number
}

/**
 * Construye una serie mensual de avance del cronograma a partir de las tareas.
 * Usa el progreso actual de cada tarea para trazar la tendencia mes a mes:
 * para cada mes desde el inicio hasta hoy, calcula el avance esperado ponderado
 * por duración de las tareas activas en ese mes.
 */
function buildScheduleProgress(tasks: ScheduleTask[], months: number): ScheduleMonthlyProgress[] {
  if (!tasks || tasks.length === 0) return []

  const now = new Date()
  const result: ScheduleMonthlyProgress[] = []

  // Tareas que son "padre" de otras: se excluyen para no contar doble el avance
  // (antes se sumaba la tarea padre Y sus subtareas). Solo cuentan las hojas.
  const parentIds = new Set(tasks.map((t) => t.parent_task_id).filter(Boolean) as string[])

  for (let i = months - 1; i >= 0; i--) {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0) // último día del mes
    const ym = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}`

    // Solo calcular para meses que ya pasaron o el actual
    const monthEndStr = monthEnd.toISOString().split('T')[0]

    // Tareas hoja activas en o antes de este mes (ya empezadas, sin subtareas)
    const activeTasks = tasks.filter((t) => t.start_date <= monthEndStr && !t.is_milestone && !parentIds.has(t.id))
    if (activeTasks.length === 0) {
      result.push({ month: ym, progress: 0 })
      continue
    }

    // Para tareas completadas antes de fin de mes: contar al 100%
    // Para tareas en progreso: usar su progreso actual
    // Para tareas no comenzadas: 0% (ya filtradas arriba)
    const totalDays = activeTasks.reduce((sum, t) => {
      const s = new Date(t.start_date).getTime()
      const e = new Date(t.end_date).getTime()
      return sum + Math.max(1, Math.ceil((e - s) / 86400000) + 1)
    }, 0)

    if (totalDays === 0) {
      result.push({ month: ym, progress: 0 })
      continue
    }

    const weightedProgress = activeTasks.reduce((sum, t) => {
      const s = new Date(t.start_date).getTime()
      const e = new Date(t.end_date).getTime()
      const days = Math.max(1, Math.ceil((e - s) / 86400000) + 1)
      // Si la tarea terminó antes del fin del mes, cuenta como 100%
      const effectiveProgress = t.end_date <= monthEndStr ? 100 : t.progress
      return sum + effectiveProgress * days
    }, 0)

    result.push({ month: ym, progress: Math.round(weightedProgress / totalDays) })
  }

  return result
}

export function ProjectTendencias({ projectId }: Props) {
  const [cashFlowRows, setCashFlowRows] = useState<MonthlyCashFlowRow[]>([])
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      cashFlowService.getMonthlyProjection(projectId),
      supabase
        .from('schedule_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('task_number', { ascending: true, nullsFirst: false }),
    ]).then(([cashRes, schedRes]) => {
      if (cancelled) return
      if (cashRes.status === 'fulfilled') setCashFlowRows(cashRes.value ?? [])
      if (schedRes.status === 'fulfilled') setTasks((schedRes.value?.data ?? []) as ScheduleTask[])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [projectId])

  const actualSeries = cashFlowToSeries(cashFlowRows, 'actual_outflow', MONTHS)
  const plannedSeries = cashFlowToSeries(cashFlowRows, 'planned_outflow', MONTHS)

  const scheduleProgress = buildScheduleProgress(tasks, MONTHS)
  const progressSeries = scheduleProgress.map((r) => {
    const month = r.month
    const label = `${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][parseInt(month.slice(5, 7)) - 1]} ${month.slice(2, 4)}`
    return { label, value: r.progress }
  })

  const hasSpendData = cashFlowRows.some((r) => r.actual_outflow > 0 || r.planned_outflow > 0)
  const hasScheduleData = tasks.length > 0

  if (loading) {
    return (
      <div className="bg-app-surface border border-app-border rounded-xl p-4">
        <div className="flex items-center justify-center text-xs text-app-muted py-8">Cargando tendencias…</div>
      </div>
    )
  }

  if (!hasSpendData && !hasScheduleData) return null

  // Overall schedule progress (current)
  const overallProgress = scheduleService.getOverallProgress(tasks)

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-app-text">Tendencias del proyecto</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gasto mensual */}
        <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-app-border">
            <h3 className="text-sm font-semibold text-app-text">Gasto mensual</h3>
            <p className="text-[11px] text-app-muted mt-0.5">Real (azul) vs. planificado (verde) · últimos 12 meses</p>
          </div>
          <div className="px-3 pt-1 pb-3">
            {!hasSpendData ? (
              <div className="flex items-center justify-center text-xs text-app-muted py-10">
                Sin datos de gasto registrados
              </div>
            ) : (
              <div className="space-y-1">
                <BarChart
                  series={actualSeries}
                  height={130}
                  color="#3b82f6"
                  formatY={(v) => (v === 0 ? '0' : formatRD(v))}
                  emptyMessage="Sin egresos reales"
                />
                <BarChart
                  series={plannedSeries}
                  height={80}
                  color="#10b981"
                  formatY={(v) => (v === 0 ? '0' : formatRD(v))}
                  emptyMessage="Sin presupuesto planificado"
                />
                <div className="flex items-center gap-4 px-1 pt-1">
                  <span className="flex items-center gap-1 text-[10px] text-app-muted">
                    <span className="inline-block w-3 h-2 rounded-sm bg-blue-500 opacity-85" />
                    Gasto real
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-app-muted">
                    <span className="inline-block w-3 h-2 rounded-sm bg-emerald-500 opacity-85" />
                    Planificado
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Avance del cronograma */}
        {hasScheduleData && (
          <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-app-text">Avance de obra</h3>
                <p className="text-[11px] text-app-muted mt-0.5">Progreso ponderado por tarea · últimos 12 meses</p>
              </div>
              <span className="text-xs font-semibold text-app-text">{overallProgress}% actual</span>
            </div>
            <div className="px-3 pt-1 pb-3">
              <LineChart
                series={progressSeries}
                height={160}
                color="#f59e0b"
                formatY={(v) => `${Math.round(v)}%`}
                emptyMessage="Sin datos de cronograma"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
