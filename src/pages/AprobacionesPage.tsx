import { useEffect, useState } from 'react'
import { Download, History } from 'lucide-react'
import {
  approvalsService,
  type ApprovalAction,
  type ApprovalRecord,
} from '@/services/approvalsService'
import { exportToExcel } from '@/utils/excelExport'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/Toast'

const ACTION_LABEL: Record<ApprovalAction, string> = {
  submit_for_approval: 'Enviada a aprobación',
  approve: 'Aprobada',
  reject: 'Rechazada',
  return_for_revision: 'Devuelta para revisión',
  release: 'Liberada por Director',
  validate_excess: 'Excedente validado',
  override_stock: 'Override de stock',
  budget_edit_post_approval: 'Edición de presupuesto',
  status_change: 'Cambio de estado',
  receive: 'Recibida',
}

const ENTITY_LABEL: Record<string, string> = {
  payroll_period: 'Nómina',
  purchase_requisition: 'Solicitud de compra',
  purchase_order: 'Orden de compra',
  inventory_movement: 'Movimiento de almacén',
  budget_category: 'Presupuesto · capítulo',
  budget_item: 'Presupuesto · partida',
  contract_corte: 'Corte de contrato',
}

export default function AprobacionesPage() {
  const user = useAuthStore((s) => s.user)
  const [records, setRecords] = useState<ApprovalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMine, setFilterMine] = useState(false)
  const [filterAction, setFilterAction] = useState<ApprovalAction | 'all'>('all')
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

  const filtered = records.filter((r) => {
    if (filterMine && r.actor_display_name !== user?.displayName) return false
    if (filterAction !== 'all' && r.action !== filterAction) return false
    return true
  })

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
    } catch {
      error('No se pudo exportar')
    }
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

      {loading ? (
        <div className="text-center py-12 text-app-muted text-sm">Cargando historial…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
          <p className="text-base font-semibold text-app-text mb-1">Sin registros</p>
          <p className="text-sm text-app-muted">
            Las acciones críticas (aprobaciones, validaciones, overrides) aparecerán aquí.
          </p>
        </div>
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
              {filtered.map((r) => (
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
        </div>
      )}
    </div>
  )
}
