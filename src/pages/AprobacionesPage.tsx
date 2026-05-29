import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, History, X } from 'lucide-react'
import { approvalsService, type ApprovalAction, type ApprovalRecord } from '@/services/approvalsService'
import { exportToExcel } from '@/utils/excelExport'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'

const ACTION_LABEL: Record<ApprovalAction, string> = {
  submit_for_approval: 'Enviada a aprobación',
  approve: 'Aprobada',
  reject: 'Rechazada',
  return_for_revision: 'Devuelta para revisión',
  release: 'Liberada por Administrador',
  validate_excess: 'Excedente validado',
  override_stock: 'Override de stock',
  budget_edit_post_approval: 'Edición de presupuesto',
  status_change: 'Cambio de estado',
  receive: 'Recibida',
  create: 'Creación',
  delete: 'Eliminación',
  delete_cascade: 'Eliminación en cascada',
  update_indirects: 'Actualización de indirectos',
  update: 'Edición de partida/factura',
}

const ENTITY_LABEL: Record<string, string> = {
  payroll_period: 'Nómina',
  purchase_requisition: 'Solicitud de compra',
  purchase_order: 'Orden de compra',
  inventory_movement: 'Movimiento de almacén',
  budget_category: 'Presupuesto · capítulo',
  budget_item: 'Presupuesto · partida',
  budget_category_items: 'Presupuesto · partidas (cascada)',
  contract_corte: 'Corte de contrato',
  payment_distribution: 'Distribución de pago',
  project: 'Proyecto',
}

const PAGE_SIZE = 100

export default function AprobacionesPage() {
  const user = useAuthStore((s) => s.user)
  const [records, setRecords] = useState<ApprovalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMine, setFilterMine] = useState(false)
  const [filterAction, setFilterAction] = useState<ApprovalAction | 'all'>('all')
  const [offset, setOffset] = useState(0)
  const { success, error } = useToast()

  useEffect(() => {
    let cancelled = false
    approvalsService
      .getRecent(200)
      .then((data) => {
        if (!cancelled) setRecords(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (filterMine && r.actor_display_name !== user?.displayName) return false
        if (filterAction !== 'all' && r.action !== filterAction) return false
        return true
      }),
    [records, filterMine, filterAction, user?.displayName],
  )

  const hasActiveFilters = filterMine || filterAction !== 'all'

  // Reset offset cuando cambian filtros. Computado en lugar de useEffect
  // para evitar render extra y warning de set-state-in-effect.
  const filtersKey = `${filterMine}|${filterAction}`
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey)
  if (prevFiltersKey !== filtersKey) {
    setPrevFiltersKey(filtersKey)
    setOffset(0)
  }
  // Offset overflow guard (computado por el mismo motivo).
  if (offset > 0 && offset >= filtered.length) {
    setOffset(0)
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const paginated = filtered.slice(offset, offset + PAGE_SIZE)
  const showPagination = filtered.length > PAGE_SIZE

  async function handleExport() {
    try {
      await exportToExcel('auditoria_aprobaciones', [
        {
          name: 'Aprobaciones',
          rows: filtered.map((r) => ({
            Fecha: new Date(r.created_at).toLocaleString('es-DO'),
            Entidad: ENTITY_LABEL[r.entity_type] ?? r.entity_type,
            Acción: ACTION_LABEL[r.action] ?? r.action,
            Actor: r.actor_display_name ?? '',
            Motivo: r.motivo ?? '',
            'ID entidad': r.entity_id,
            Metadata: JSON.stringify(r.metadata ?? {}),
          })),
        },
      ])
      success('Exportado')
    } catch (err) {
      error(getErrorMessage(err) || 'No se pudo exportar')
    }
  }

  function clearFilters() {
    setFilterMine(false)
    setFilterAction('all')
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-app-text">Aprobaciones y auditoría</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 border border-app-border text-app-muted rounded-lg text-sm hover:bg-app-hover"
        >
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      <div className="bg-app-surface border border-app-border rounded-xl p-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filterMine}
            onChange={(e) => setFilterMine(e.target.checked)}
            className="rounded"
          />
          Solo mis aprobaciones
        </label>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value as ApprovalAction | 'all')}
          className="px-3 py-1.5 text-sm border border-app-border rounded-lg bg-app-bg text-app-text"
        >
          <option value="all">Todas las acciones</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="text-xs text-app-subtle ml-auto">
          {filtered.length} de {records.length} registros
        </span>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-app-subtle">Filtros activos:</span>
          {filterMine && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 px-2 py-1 rounded-full">
              Solo mis aprobaciones
              <button
                type="button"
                onClick={() => setFilterMine(false)}
                aria-label="Quitar filtro mis aprobaciones"
                className="hover:text-blue-900 dark:hover:text-blue-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterAction !== 'all' && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 px-2 py-1 rounded-full">
              Acción: {ACTION_LABEL[filterAction] ?? filterAction}
              <button
                type="button"
                onClick={() => setFilterAction('all')}
                aria-label="Quitar filtro acción"
                className="hover:text-blue-900 dark:hover:text-blue-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button type="button" onClick={clearFilters} className="text-xs text-app-muted hover:text-app-text underline">
            Limpiar
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Cargando historial…</div>
      ) : filtered.length === 0 ? (
        hasActiveFilters ? (
          <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
            <p className="text-base font-semibold text-app-text mb-1">No hay resultados con los filtros aplicados</p>
            <p className="text-sm text-app-muted mb-4">Ajusta o quita los filtros para ver más registros.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm px-3 py-1.5 border border-app-border rounded-lg text-app-muted hover:bg-app-hover"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
            <p className="text-base font-semibold text-app-text mb-1">Sin registros</p>
            <p className="text-sm text-app-muted">
              Las acciones críticas (aprobaciones, validaciones, overrides) aparecerán aquí.
            </p>
          </div>
        )
      ) : (
        <div className="bg-app-surface border border-app-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-app-chip text-app-muted text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Entidad</th>
                <th className="px-3 py-2 text-left">Acción</th>
                <th className="px-3 py-2 text-left">Actor</th>
                <th className="px-3 py-2 text-left">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr key={r.id} className="border-t border-app-border align-top">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString('es-DO')}
                  </td>
                  <td className="px-3 py-2">{ENTITY_LABEL[r.entity_type] ?? r.entity_type}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs bg-app-chip text-app-muted px-2 py-0.5 rounded">
                      {ACTION_LABEL[r.action] ?? r.action}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.actor_display_name ?? '—'}</td>
                  <td className="px-3 py-2 text-app-muted max-w-md">{r.motivo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {showPagination && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-app-border">
              <span className="text-xs text-app-muted">
                Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, filtered.length)} de {filtered.length} · Pág.{' '}
                {currentPage} de {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  aria-label="Página anterior"
                  className="p-1.5 rounded hover:bg-app-hover text-app-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOffset(Math.min((totalPages - 1) * PAGE_SIZE, offset + PAGE_SIZE))}
                  disabled={currentPage >= totalPages}
                  aria-label="Página siguiente"
                  className="p-1.5 rounded hover:bg-app-hover text-app-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
