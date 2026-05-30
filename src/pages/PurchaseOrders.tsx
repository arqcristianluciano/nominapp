import { useCallback, useEffect, useMemo, useState } from 'react'
import { requisitionService } from '@/services/requisitionService'
import { supabase } from '@/lib/supabase'
import type { PurchaseRequisition } from '@/types/purchaseOrder'
import type { Project } from '@/types/database'
import { Modal } from '@/components/ui/Modal'
import { RequisitionForm } from '@/components/features/purchase-orders/RequisitionForm'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/utils/errors'
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

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [reqs, { data: projs }] = await Promise.all([
        requisitionService.getAll(),
        supabase.from('projects').select('*').order('name'),
      ])
      setRequisitions(reqs)
      setProjects((projs as Project[]) || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const handleCreate = useCallback(
    async (payload: Parameters<typeof requisitionService.create>[0]) => {
      setSaving(true)
      try {
        const req = await requisitionService.create(payload)
        setShowForm(false)
        setRequisitions((prev) => [req, ...prev])
        success('Solicitud de compra creada')
      } catch (err) {
        error(getErrorMessage(err) || 'No se pudo crear la solicitud')
      } finally {
        setSaving(false)
      }
    },
    [error, success],
  )

  const normalizedSearch = useMemo(() => search.toLowerCase(), [search])

  const filtered = useMemo(() => {
    return requisitions.filter((requisition) => {
      const matchesSearch =
        !normalizedSearch ||
        requisition.description.toLowerCase().includes(normalizedSearch) ||
        requisition.req_number.toLowerCase().includes(normalizedSearch) ||
        requisition.requested_by.toLowerCase().includes(normalizedSearch)
      const matchesStatus = statusFilter === 'all' || requisition.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [normalizedSearch, requisitions, statusFilter])

  const openCreateModal = useCallback(() => setShowForm(true), [])
  const closeCreateModal = useCallback(() => setShowForm(false), [])

  return (
    <div className="space-y-6">
      <PurchaseOrdersHeader filteredCount={filtered.length} totalCount={requisitions.length} onNew={openCreateModal} />
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
        <EmptyPurchaseOrders onNew={openCreateModal} />
      ) : (
        <PurchaseOrdersTable requisitions={filtered} />
      )}

      <Modal open={showForm} onClose={closeCreateModal} title="Nueva Solicitud de Compra">
        <RequisitionForm projects={projects} onSubmit={handleCreate} onCancel={closeCreateModal} saving={saving} />
      </Modal>
    </div>
  )
}
