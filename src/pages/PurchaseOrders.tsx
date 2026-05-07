import { useEffect, useState } from 'react'
import { requisitionService } from '@/services/requisitionService'
import { supabase } from '@/lib/supabase'
import type { PurchaseRequisition } from '@/types/purchaseOrder'
import type { Project } from '@/types/database'
import { Modal } from '@/components/ui/Modal'
import { RequisitionForm } from '@/components/features/purchase-orders/RequisitionForm'
import { useToast } from '@/components/ui/Toast'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { PURCHASE_ORDER_STATUS_OPTIONS } from '@/components/features/purchase-orders/purchaseOrdersConfig'
import {
  EmptyPurchaseOrders,
  PurchaseOrdersFilters,
  PurchaseOrdersHeader,
  PurchaseOrdersTable,
} from '@/components/features/purchase-orders/PurchaseOrdersListSections'

export default function PurchaseOrders() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
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

  const filtered = requisitions.filter((r) => {
    const term = search.toLowerCase()
    const matchesSearch = !term || r.description.toLowerCase().includes(term) || r.req_number.toLowerCase().includes(term) || r.requested_by.toLowerCase().includes(term)
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <PurchaseOrdersHeader filteredCount={filtered.length} totalCount={requisitions.length} onNew={() => setShowForm(true)} />
      <PurchaseOrdersFilters
        search={search}
        statusFilter={statusFilter}
        statusOptions={PURCHASE_ORDER_STATUS_OPTIONS}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyPurchaseOrders onNew={() => setShowForm(true)} />
      ) : (
        <PurchaseOrdersTable requisitions={filtered} />
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
