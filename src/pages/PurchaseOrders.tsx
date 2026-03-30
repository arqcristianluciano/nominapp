import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShoppingCart, Eye, Package } from 'lucide-react'
import { requisitionService } from '@/services/requisitionService'
import { supabase } from '@/lib/supabase'
import type { PurchaseRequisition } from '@/types/purchaseOrder'
import type { Project } from '@/types/database'
import { REQ_STATUS_LABEL, REQ_STATUS_COLOR } from '@/types/purchaseOrder'
import { Modal } from '@/components/ui/Modal'
import { RequisitionForm } from '@/components/features/purchase-orders/RequisitionForm'
import { useToast } from '@/components/ui/Toast'
import { SkeletonTable } from '@/components/ui/Skeleton'

export default function PurchaseOrders() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { success, error } = useToast()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [reqs, { data: projs }] = await Promise.all([
        requisitionService.getAll(),
        supabase.from('projects').select('*').order('name'),
      ])
      setRequisitions(reqs)
      setProjects((projs as Project[]) || [])
    } finally { setLoading(false) }
  }

  async function handleCreate(payload: Parameters<typeof requisitionService.create>[0]) {
    setSaving(true)
    try {
      const req = await requisitionService.create(payload)
      setShowForm(false)
      setRequisitions((prev) => [req, ...prev])
      success('Solicitud de compra creada')
    } catch { error('No se pudo crear la solicitud') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Órdenes de Compra</h1>
          <p className="text-sm text-app-muted mt-0.5">
            {requisitions.length} solicitud{requisitions.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nueva solicitud
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : requisitions.length === 0 ? (
        <EmptyPO onNew={() => setShowForm(true)} />
      ) : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">N° Solicitud</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden md:table-cell">Proyecto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden lg:table-cell">Solicitado por</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">Fecha req.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">Estado</th>
                <th className="w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {requisitions.map((r) => (
                <tr key={r.id} className="hover:bg-app-hover transition-colors group">
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-semibold text-app-muted bg-app-chip px-1.5 py-0.5 rounded">
                      {r.req_number}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-app-text text-sm">{r.description}</span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-app-muted hidden md:table-cell">
                    {r.project?.name ?? <span className="text-app-subtle">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-app-muted hidden lg:table-cell">
                    {r.requested_by}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-app-muted hidden sm:table-cell">
                    {r.required_date ?? <span className="text-app-subtle">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${REQ_STATUS_COLOR[r.status]}`}>
                      {REQ_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <Link
                      to={`/ordenes-compra/${r.id}`}
                      className="inline-flex items-center gap-1 p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all"
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva Solicitud de Compra">
        <RequisitionForm
          projects={projects}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      </Modal>
    </div>
  )
}

function EmptyPO({ onNew }: { onNew: () => void }) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center mx-auto mb-4">
        <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" />
      </div>
      <p className="text-base font-semibold text-app-text mb-1">Sin solicitudes de compra</p>
      <p className="text-sm text-app-muted mb-5">
        Crea una solicitud y agrega mínimo 3 cotizaciones para aprobar
      </p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" /> Nueva solicitud
      </button>
    </div>
  )
}
