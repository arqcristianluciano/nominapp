import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShoppingCart, Eye } from 'lucide-react'
import { requisitionService } from '@/services/requisitionService'
import { supabase } from '@/lib/supabase'
import type { PurchaseRequisition } from '@/types/purchaseOrder'
import type { Project } from '@/types/database'
import { REQ_STATUS_LABEL, REQ_STATUS_COLOR } from '@/types/purchaseOrder'
import { Modal } from '@/components/ui/Modal'
import { RequisitionForm } from '@/components/features/purchase-orders/RequisitionForm'

export default function PurchaseOrders() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [reqs, { data: projs }] = await Promise.all([
      requisitionService.getAll(),
      supabase.from('projects').select('*').order('name'),
    ])
    setRequisitions(reqs)
    setProjects((projs as Project[]) || [])
    setLoading(false)
  }

  async function handleCreate(payload: Parameters<typeof requisitionService.create>[0]) {
    setSaving(true)
    try {
      const req = await requisitionService.create(payload)
      setShowForm(false)
      setRequisitions((prev) => [req, ...prev])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Órdenes de Compra</h1>
            <p className="text-sm text-gray-500">
              {requisitions.length} solicitud{requisitions.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nueva solicitud
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando…</div>
      ) : requisitions.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm">No hay solicitudes de compra</p>
          <p className="text-xs mt-1 text-gray-300">Cree una solicitud y agregue 3 cotizaciones para aprobar</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">N° Solicitud</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proyecto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Solicitado por</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha req.</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requisitions.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.req_number}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium max-w-xs truncate">{r.description}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.project?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.requested_by}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.required_date ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${REQ_STATUS_COLOR[r.status]}`}>
                      {REQ_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/ordenes-compra/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <Eye className="w-3.5 h-3.5" /> Ver
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
