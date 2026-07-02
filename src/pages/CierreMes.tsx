/**
 * Página "Cierre de Mes" — checklist guiada de pendientes por proyecto/mes.
 *
 * Fuentes de datos (solo lectura, sin cambios de esquema):
 *  - payroll_periods        → nóminas sin aprobar/pagar  (payrollService.getAllPeriods)
 *  - payment_distributions  → pagos sin distribuir       (consulta directa supabase)
 *  - transactions           → cuentas por pagar (CxP)    (transactionService / calcCxPDetails)
 *  - loan_installments      → cuotas de préstamo vencidas (consulta directa supabase)
 *  - quality_control        → ensayos vencidos           (qualityControlService.getByProject)
 *  - projects               → lista activa               (projectService.getAll)
 */
import { useEffect, useMemo, useState } from 'react'
import { todayISO } from '@/utils/dateLocal'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  Lock,
  LockOpen,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { payrollService } from '@/services/payrollService'
import { projectService } from '@/services/projectService'
import { transactionService } from '@/services/transactionService'
import { monthCloseService } from '@/services/monthCloseService'
import { calcCxPDetails } from '@/utils/financialCalculations'
import { formatRD } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'
import { useAppRoles } from '@/hooks/useAppRoles'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { PayrollPeriod, Project } from '@/types/database'

// ─── tipos internos ─────────────────────────────────────────────────────────

interface CheckItem {
  id: string
  label: string
  count: number | null // null = no aplica / al día
  amount?: number // monto opcional (para distribuidos, CxP)
  status: 'ok' | 'warn' | 'danger'
  link: string
}

interface ProjectChecklist {
  project: Project
  items: CheckItem[]
  allOk: boolean
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function defaultMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Filtra períodos cuya report_date cae en el año-mes dado (YYYY-MM). */
function periodsForMonth(periods: PayrollPeriod[], yearMonth: string): PayrollPeriod[] {
  return periods.filter((p) => p.report_date?.startsWith(yearMonth))
}

// ─── fetchers auxiliares (no tocan los servicios de dominio) ─────────────────

/** Obtiene pagos no cancelados de una lista de period_ids. */
async function fetchDistributions(
  periodIds: string[],
): Promise<Array<{ payroll_period_id: string; amount: number; status: string }>> {
  if (periodIds.length === 0) return []
  const { data, error } = await supabase
    .from('payment_distributions')
    .select('payroll_period_id, amount, status')
    .in('payroll_period_id', periodIds)
  if (error) throw error
  return (data ?? []) as Array<{ payroll_period_id: string; amount: number; status: string }>
}

/** Obtiene cuotas de préstamo vencidas (fecha_pago_programada ≤ hoy). */
async function fetchOverdueInstallments(): Promise<
  Array<{ id: string; loan_id: string; fecha_pago_programada: string; monto: number }>
> {
  const todayStr = todayISO()
  const { data, error } = await supabase
    .from('loan_installments')
    .select('id, loan_id, fecha_pago_programada, monto')
    .eq('estado', 'pendiente')
    .lte('fecha_pago_programada', todayStr)
  if (error) throw error
  return (data ?? []) as Array<{ id: string; loan_id: string; fecha_pago_programada: string; monto: number }>
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function CierreMes() {
  const { isDirector, canWriteLedger } = useAppRoles()
  const currentUser = useAuthStore((s) => s.user)
  const { success: toastSuccess, error: toastError } = useToast()
  const [yearMonth, setYearMonth] = useState(defaultMonthValue)
  const [projects, setProjects] = useState<Project[]>([])
  const [allPeriods, setAllPeriods] = useState<PayrollPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Meses cerrados: conjunto de claves "projectId|YYYY-MM".
  const [closedSet, setClosedSet] = useState<Set<string>>(new Set())
  const [pendingClose, setPendingClose] = useState<Project | null>(null)
  const [pendingReopen, setPendingReopen] = useState<Project | null>(null)
  const [savingClose, setSavingClose] = useState(false)

  const isClosed = (projectId: string) => closedSet.has(`${projectId}|${yearMonth}`)

  const reloadClosed = async (projectIds: string[]) => {
    try {
      const rows = await monthCloseService.listByProjects(projectIds)
      setClosedSet(new Set(rows.map((r) => `${r.project_id}|${r.year_month}`)))
    } catch (err) {
      toastError(`No se pudo cargar el estado de meses cerrados: ${getErrorMessage(err)}`)
    }
  }

  const handleClose = async (project: Project) => {
    setSavingClose(true)
    try {
      await monthCloseService.close(project.id, yearMonth, currentUser?.displayName ?? undefined)
      setClosedSet((prev) => new Set(prev).add(`${project.id}|${yearMonth}`))
      toastSuccess(`Mes cerrado para ${project.name}. Sus movimientos quedaron protegidos.`)
    } catch (err) {
      toastError(`No se pudo cerrar el mes: ${getErrorMessage(err)}`)
    } finally {
      setSavingClose(false)
      setPendingClose(null)
    }
  }

  const handleReopen = async (project: Project) => {
    setSavingClose(true)
    try {
      await monthCloseService.reopen(project.id, yearMonth)
      setClosedSet((prev) => {
        const next = new Set(prev)
        next.delete(`${project.id}|${yearMonth}`)
        return next
      })
      toastSuccess(`Mes reabierto para ${project.name}. Ya se puede editar de nuevo.`)
    } catch (err) {
      toastError(`No se pudo reabrir el mes: ${getErrorMessage(err)}`)
    } finally {
      setSavingClose(false)
      setPendingReopen(null)
    }
  }

  // datos extra
  const [distributions, setDistributions] = useState<
    Array<{ payroll_period_id: string; amount: number; status: string }>
  >([])
  const [overdueInstallments, setOverdueInstallments] = useState<
    Array<{ id: string; loan_id: string; fecha_pago_programada: string; monto: number }>
  >([])
  // CxP por proyecto: projectId → monto pendiente vencido (+60d)
  const [cxpByProject, setCxpByProject] = useState<Record<string, number>>({})
  // Ensayos vencidos por proyecto: projectId → count
  const [qcOverdueByProject, setQcOverdueByProject] = useState<Record<string, number>>({})

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  // ── carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [loadedProjects, loadedPeriods] = await Promise.all([
          projectService.getAll(),
          payrollService.getAllPeriods(),
        ])
        if (cancelled) return
        const activeProjects = loadedProjects.filter((p) => p.status === 'active')
        setProjects(activeProjects)
        setAllPeriods(loadedPeriods)
        void reloadClosed(activeProjects.map((p) => p.id))

        // Distribuciones: traer por todos los period ids
        const periodIds = loadedPeriods.map((p) => p.id)
        const dists = await fetchDistributions(periodIds)
        if (cancelled) return
        setDistributions(dists)

        // Cuotas vencidas
        const overdue = await fetchOverdueInstallments()
        if (cancelled) return
        setOverdueInstallments(overdue)

        // CxP: traer transacciones por cada proyecto activo
        const activeIds = loadedProjects.filter((p) => p.status === 'active').map((p) => p.id)
        const txns = await transactionService.getByProjects(activeIds)
        if (cancelled) return

        // Agrupar por proyecto y calcular CxP vencido > 60 días
        const todayMs = Date.now()
        const cxpMap: Record<string, number> = {}
        const txnsByProject: Record<string, typeof txns> = {}
        for (const txn of txns) {
          if (!txnsByProject[txn.project_id]) txnsByProject[txn.project_id] = []
          txnsByProject[txn.project_id].push(txn)
        }
        for (const [projectId, projectTxns] of Object.entries(txnsByProject)) {
          const cxpItems = calcCxPDetails(projectTxns)
          // "Vencidas" = facturas con fecha > 60 días
          const overdueCxP = cxpItems
            .filter((item) => Math.floor((todayMs - new Date(item.date).getTime()) / 86400000) > 60)
            .reduce((sum, item) => sum + item.pending, 0)
          if (overdueCxP > 0) cxpMap[projectId] = overdueCxP
        }
        setCxpByProject(cxpMap)

        // Ensayos vencidos: quality_control sin test_date y vaciado > 28 días
        const DAYS_OVERDUE_QC = 28
        const cutoffQC = new Date(todayMs - DAYS_OVERDUE_QC * 86400000).toISOString().split('T')[0]
        const { data: qcData } = await supabase
          .from('quality_control')
          .select('id, project_id, pour_date')
          .is('test_date', null)
          .lte('pour_date', cutoffQC)
        if (cancelled) return
        const qcMap: Record<string, number> = {}
        for (const row of (qcData ?? []) as Array<{ id: string; project_id: string; pour_date: string }>) {
          qcMap[row.project_id] = (qcMap[row.project_id] ?? 0) + 1
        }
        setQcOverdueByProject(qcMap)
      } catch (err) {
        if (cancelled) return
        console.error('[CierreMes] carga fallida', err)
        setError('No se pudo cargar la información. Verifica tu conexión e intenta de nuevo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // Carga única al montar; reloadClosed es estable para este propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── checklist por proyecto ─────────────────────────────────────────────────
  const checklists = useMemo<ProjectChecklist[]>(() => {
    // Índice distribuciones por period
    const distByPeriod = new Map<string, number>()
    for (const d of distributions) {
      if (d.status === 'cancelled') continue
      distByPeriod.set(d.payroll_period_id, (distByPeriod.get(d.payroll_period_id) ?? 0) + d.amount)
    }

    return projects.map((project) => {
      const monthPeriods = periodsForMonth(allPeriods, yearMonth).filter((p) => p.project_id === project.id)

      // 1 — Nóminas sin aprobar (draft o submitted en el mes seleccionado)
      const unapproved = monthPeriods.filter((p) => p.status === 'draft' || p.status === 'submitted')
      const unapprovedItem: CheckItem = {
        id: 'unapproved',
        label: 'Nóminas sin aprobar',
        count: unapproved.length,
        status: unapproved.length > 0 ? 'danger' : 'ok',
        link: `/nominas`,
      }

      // 2 — Nóminas aprobadas pero no pagadas
      const unpaid = monthPeriods.filter((p) => p.status === 'approved')
      const unpaidItem: CheckItem = {
        id: 'unpaid',
        label: 'Nóminas aprobadas sin marcar como pagadas',
        count: unpaid.length,
        status: unpaid.length > 0 ? 'warn' : 'ok',
        link: `/nominas`,
      }

      // 3 — Pagos sin distribuir (nóminas aprobadas/pagadas del mes con pendiente > 0)
      const approvedOrPaid = monthPeriods.filter((p) => p.status === 'approved' || p.status === 'paid')
      let undistributedAmount = 0
      for (const period of approvedOrPaid) {
        const distributed = distByPeriod.get(period.id) ?? 0
        const diff = (period.grand_total ?? 0) - distributed
        if (diff > 0.01) undistributedAmount += diff
      }
      const undistributedItem: CheckItem = {
        id: 'undistributed',
        label: 'Pagos sin distribuir',
        count: undistributedAmount > 0.01 ? 1 : 0,
        amount: undistributedAmount,
        status: undistributedAmount > 0.01 ? 'warn' : 'ok',
        link: `/nominas`,
      }

      // 4 — CxP vencidas > 60 días (global, no filtrado por mes)
      const cxpOverdue = cxpByProject[project.id] ?? 0
      const cxpItem: CheckItem = {
        id: 'cxp',
        label: 'Cuentas por pagar vencidas (+60 días)',
        count: cxpOverdue > 0 ? 1 : 0,
        amount: cxpOverdue,
        status: cxpOverdue > 0 ? 'danger' : 'ok',
        link: `/cxp/${project.id}`,
      }

      // 5 — Cuotas de préstamo vencidas (global)
      const overdueLoans = overdueInstallments.length
      const loansItem: CheckItem = {
        id: 'loans',
        label: 'Cuotas de préstamo vencidas',
        count: overdueLoans,
        status: overdueLoans > 0 ? 'danger' : 'ok',
        link: `/prestamos`,
      }

      // 6 — Ensayos de hormigón vencidos (sin resultado y > 28 días desde vaciado)
      const qcOverdue = qcOverdueByProject[project.id] ?? 0
      const qcItem: CheckItem = {
        id: 'qc',
        label: 'Ensayos de hormigón vencidos',
        count: qcOverdue,
        status: qcOverdue > 0 ? 'warn' : 'ok',
        link: `/proyectos/${project.id}/calidad`,
      }

      const items = [unapprovedItem, unpaidItem, undistributedItem, cxpItem, loansItem, qcItem]
      const allOk = items.every((i) => i.status === 'ok')
      return { project, items, allOk }
    })
  }, [projects, allPeriods, yearMonth, distributions, overdueInstallments, cxpByProject, qcOverdueByProject])

  // ── totales rápidos ────────────────────────────────────────────────────────
  const totalPending = useMemo(() => checklists.filter((c) => !c.allOk).length, [checklists])
  const totalOk = useMemo(() => checklists.filter((c) => c.allOk).length, [checklists])

  // ── expand/collapse ────────────────────────────────────────────────────────
  function toggleExpand(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  // ── mes display ────────────────────────────────────────────────────────────
  const [yearStr, monthStr] = yearMonth.split('-')
  const monthLabel = `${MONTH_NAMES[parseInt(monthStr, 10) - 1]} ${yearStr}`

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            Cierre de Mes
          </h1>
          <p className="text-sm text-app-muted mt-0.5">
            Lista de pendientes por proyecto. Marca todo en verde antes de cerrar el mes.
          </p>
        </div>

        {/* Selector de mes */}
        <div className="flex items-center gap-3 shrink-0">
          <label htmlFor="month-picker" className="text-sm text-app-muted whitespace-nowrap">
            Ver mes:
          </label>
          <input
            id="month-picker"
            type="month"
            value={yearMonth}
            max={defaultMonthValue()}
            onChange={(e) => setYearMonth(e.target.value)}
            className="border border-app-border rounded-lg px-3 py-1.5 text-sm bg-app-surface text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tarjetas de resumen */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Al día</p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{totalOk}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {totalOk === 1 ? 'proyecto' : 'proyectos'} sin pendientes
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Con pendientes</p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-400 mt-1">{totalPending}</p>
            <p className="text-xs text-red-600 dark:text-red-400">
              {totalPending === 1 ? 'proyecto' : 'proyectos'} con items por resolver
            </p>
          </div>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorCard message={error} />
      ) : checklists.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-10 text-center">
          <p className="text-app-muted">No hay proyectos activos para revisar.</p>
          <Link to="/proyectos" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Ir a Proyectos →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {checklists.map(({ project, items, allOk }) => {
            const expanded = expandedProjects.has(project.id)
            const pendingItems = items.filter((i) => i.status !== 'ok')
            return (
              <div
                key={project.id}
                className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-sm"
              >
                {/* Cabecera del proyecto */}
                <button
                  type="button"
                  onClick={() => toggleExpand(project.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-app-hover transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {allOk ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-app-text truncate">{project.name}</p>
                      <p className="text-xs text-app-muted">
                        {project.code} · {monthLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isClosed(project.id) && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Cerrado
                      </span>
                    )}
                    {allOk ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Al día
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                        {pendingItems.length} pendiente{pendingItems.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 text-app-subtle" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-app-subtle" />
                    )}
                  </div>
                </button>

                {/* Lista de items */}
                {expanded && (
                  <div className="border-t border-app-border divide-y divide-app-border">
                    {items.map((item) => (
                      <ChecklistRow key={item.id} item={item} />
                    ))}
                    {/* Cerrar / reabrir mes */}
                    <div className="px-5 py-3 bg-app-bg/40">
                      {isClosed(project.id) ? (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-app-muted inline-flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            Mes cerrado: sus movimientos de dinero están protegidos.
                          </p>
                          {isDirector ? (
                            <button
                              onClick={() => setPendingReopen(project)}
                              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <LockOpen className="w-3.5 h-3.5" /> Reabrir
                            </button>
                          ) : (
                            <span className="text-xs text-app-subtle shrink-0">Solo el director puede reabrir</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-app-muted">
                            {allOk
                              ? 'Todo al día. Puedes cerrar este mes para proteger sus movimientos.'
                              : 'Aún hay pendientes; puedes cerrar igual, pero se recomienda dejarlos en verde primero.'}
                          </p>
                          {canWriteLedger ? (
                            <button
                              onClick={() => setPendingClose(project)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 inline-flex items-center gap-1.5 shrink-0"
                            >
                              <Lock className="w-3.5 h-3.5" /> Cerrar mes
                            </button>
                          ) : (
                            <span className="text-xs text-app-subtle shrink-0">Sin permiso para cerrar</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Nota al pie */}
      {!loading && !error && (
        <p className="text-xs text-app-muted text-center pb-2">
          Los datos se calculan en el momento. Recarga la página para ver la situación más actualizada.
        </p>
      )}

      <ConfirmModal
        open={pendingClose !== null}
        title="Cerrar el mes"
        message={
          pendingClose
            ? `¿Cerrar ${monthLabel} para "${pendingClose.name}"? A partir de ahora nadie podrá crear, editar ni borrar movimientos de dinero (libro diario) de ese mes en este proyecto, hasta que un director lo reabra.`
            : ''
        }
        confirmLabel={savingClose ? 'Cerrando…' : 'Cerrar mes'}
        onConfirm={() => {
          if (pendingClose) void handleClose(pendingClose)
        }}
        onCancel={() => setPendingClose(null)}
      />

      <ConfirmModal
        open={pendingReopen !== null}
        title="Reabrir el mes"
        variant="danger"
        message={
          pendingReopen
            ? `¿Reabrir ${monthLabel} para "${pendingReopen.name}"? Se podrán volver a editar los movimientos de dinero de ese mes. Ciérralo de nuevo cuando termines.`
            : ''
        }
        confirmLabel={savingClose ? 'Reabriendo…' : 'Reabrir'}
        onConfirm={() => {
          if (pendingReopen) void handleReopen(pendingReopen)
        }}
        onCancel={() => setPendingReopen(null)}
      />
    </div>
  )
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function ChecklistRow({ item }: { item: CheckItem }) {
  const isOk = item.status === 'ok'
  const isDanger = item.status === 'danger'

  const iconClass = isOk ? 'text-emerald-500' : isDanger ? 'text-red-500' : 'text-amber-500'

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {isOk ? (
          <CheckCircle2 className={`w-4 h-4 shrink-0 ${iconClass}`} />
        ) : isDanger ? (
          <AlertCircle className={`w-4 h-4 shrink-0 ${iconClass}`} />
        ) : (
          <AlertTriangle className={`w-4 h-4 shrink-0 ${iconClass}`} />
        )}
        <div className="min-w-0">
          <p className={`text-sm ${isOk ? 'text-app-muted' : 'text-app-text font-medium'}`}>{item.label}</p>
          {!isOk && item.count !== null && item.count > 0 && (
            <p className="text-xs text-app-muted mt-0.5">
              {item.amount != null && item.amount > 0
                ? formatRD(item.amount)
                : `${item.count} ${item.count === 1 ? 'registro' : 'registros'}`}
            </p>
          )}
        </div>
      </div>

      {isOk ? (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">OK</span>
      ) : (
        <Link
          to={item.link}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline shrink-0 whitespace-nowrap"
        >
          Resolver →
        </Link>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="bg-app-surface rounded-xl border border-app-border p-5 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-app-border" />
            <div className="h-4 w-48 bg-app-border rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-6 flex items-start gap-3">
      <RefreshCw className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Error al cargar</p>
        <p className="text-xs text-red-600 dark:text-red-300 mt-1">{message}</p>
      </div>
    </div>
  )
}
