import { useState, useCallback } from 'react'
import { payrollService } from '@/services/payrollService'
import { approvalsService } from '@/services/approvalsService'
import { useAuthStore } from '@/stores/authStore'
import {
  calcLaborTotal,
  calcMaterialsTotal,
  calcIndirectCosts,
  calcGrandTotal,
  buildIndirectCostRows,
} from '@/utils/calculations'
import { getErrorMessage } from '@/utils/errors'
import type { PayrollPeriod, LaborLineItem, MaterialInvoice, IndirectCost, Project } from '@/types/database'

// Registra en la bitácora de aprobaciones la edición de una partida/factura
// cuando el reporte YA está comprometido (enviado/aprobado/pagado). En borrador
// las ediciones son parte del flujo normal y no se auditan. Best-effort: nunca
// debe romper la edición si el log falla.
function auditCommittedItemEdit(
  period: PayrollPeriod,
  kind: 'labor_item' | 'material_invoice',
  itemId: string,
  before: unknown,
  after: unknown,
) {
  if (period.status === 'draft') return
  const actor = useAuthStore.getState().user
  void approvalsService
    .log({
      entity_type: 'payroll_period',
      entity_id: period.id,
      action: 'update',
      actor_display_name: actor?.displayName ?? null,
      payload_before: before ?? null,
      payload_after: after ?? null,
      metadata: {
        kind,
        item_id: itemId,
        period_number: period.period_number,
        project_id: period.project_id,
      },
    })
    .catch((err) => console.warn('[usePayroll] audit log de edición falló', err))
}

export function usePayroll(periodId: string | undefined) {
  const [period, setPeriod] = useState<PayrollPeriod | null>(null)
  const [laborItems, setLaborItems] = useState<LaborLineItem[]>([])
  const [materialInvoices, setMaterialInvoices] = useState<MaterialInvoice[]>([])
  const [indirectCosts, setIndirectCosts] = useState<IndirectCost[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!periodId) return
    setLoading(true)
    setError(null)
    try {
      const data = await payrollService.getPeriodDetail(periodId)
      setPeriod(data.period)
      setLaborItems(data.laborItems)
      setMaterialInvoices(data.materialInvoices)
      setIndirectCosts(data.indirectCosts)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [periodId])

  const recalcTotals = useCallback(
    async (items: LaborLineItem[], invoices: MaterialInvoice[], project?: Project) => {
      if (!periodId || !project) return
      const laborTotal = calcLaborTotal(items)
      const materialsTotal = calcMaterialsTotal(invoices)
      const indirect = calcIndirectCosts(laborTotal, materialsTotal, project)

      const costRows = buildIndirectCostRows(project, indirect)
      const activeByType = new Map(indirectCosts.map((c) => [c.type, c.is_active]))
      const totalActive = costRows
        .filter((r) => activeByType.get(r.type) !== false)
        .reduce((acc, r) => acc + r.calculated_amount, 0)
      const grandTotal = calcGrandTotal(laborTotal, materialsTotal, totalActive)

      const saved = await payrollService.saveIndirectCosts(periodId, costRows)
      setIndirectCosts(saved)
      await payrollService.updatePeriodTotals(periodId, {
        total_labor: laborTotal,
        total_materials: materialsTotal,
        total_indirect: totalActive,
        grand_total: grandTotal,
      })

      setPeriod((prev) =>
        prev
          ? {
              ...prev,
              total_labor: laborTotal,
              total_materials: materialsTotal,
              total_indirect: totalActive,
              grand_total: grandTotal,
            }
          : null,
      )
    },
    [periodId, indirectCosts],
  )

  const setIndirectActive = useCallback(
    async (id: string, isActive: boolean) => {
      if (!period || !periodId) return
      const updated = await payrollService.setIndirectActive(id, isActive)
      const next = indirectCosts.map((c) => (c.id === id ? updated : c))
      const total = next.filter((c) => c.is_active).reduce((a, c) => a + c.calculated_amount, 0)
      const grand = calcGrandTotal(period.total_labor, period.total_materials, total)
      await payrollService.updatePeriodTotals(periodId, {
        total_labor: period.total_labor,
        total_materials: period.total_materials,
        total_indirect: total,
        grand_total: grand,
      })
      setIndirectCosts(next)
      setPeriod((prev) => (prev ? { ...prev, total_indirect: total, grand_total: grand } : null))
    },
    [indirectCosts, period, periodId],
  )

  const addLaborItem = useCallback(
    async (item: {
      contractor_id: string
      description: string
      quantity: number
      unit: string
      unit_price: number
      is_advance?: boolean
      is_advance_deduction?: boolean
      sort_order?: number
      notes?: string
      budget_category_id?: string | null
      budget_item_id?: string | null
    }) => {
      if (!periodId) return
      setSaving(true)
      try {
        const maxSort = laborItems.reduce((m, i) => Math.max(m, i.sort_order || 0), 0)
        const newItem = await payrollService.addLaborItem({
          ...item,
          payroll_period_id: periodId,
          sort_order: item.sort_order ?? maxSort + 1,
        })
        const updated = [...laborItems, newItem]
        setLaborItems(updated)
        await recalcTotals(updated, materialInvoices, period?.project as Project)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setSaving(false)
      }
    },
    [periodId, laborItems, materialInvoices, period, recalcTotals],
  )

  const updateLaborItem = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      setSaving(true)
      try {
        const before = laborItems.find((i) => i.id === id)
        const updated = await payrollService.updateLaborItem(id, updates)
        const items = laborItems.map((i) => (i.id === id ? updated : i))
        setLaborItems(items)
        if (period) auditCommittedItemEdit(period, 'labor_item', id, before, updated)
        await recalcTotals(items, materialInvoices, period?.project as Project)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setSaving(false)
      }
    },
    [laborItems, materialInvoices, period, recalcTotals],
  )

  const deleteLaborItem = useCallback(
    async (id: string) => {
      setSaving(true)
      try {
        await payrollService.deleteLaborItem(id)
        const items = laborItems.filter((i) => i.id !== id)
        setLaborItems(items)
        await recalcTotals(items, materialInvoices, period?.project as Project)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setSaving(false)
      }
    },
    [laborItems, materialInvoices, period, recalcTotals],
  )

  const addMaterialInvoice = useCallback(
    async (invoice: {
      supplier_id: string
      invoice_reference?: string
      attachment_path?: string | null
      budget_category_id?: string | null
      budget_item_id?: string | null
      notes?: string
      items: { description: string; amount: number }[]
    }) => {
      if (!periodId) return
      setSaving(true)
      try {
        const newInvoice = await payrollService.addMaterialInvoice({
          ...invoice,
          payroll_period_id: periodId,
        })
        const updated = [...materialInvoices, newInvoice]
        setMaterialInvoices(updated)
        await recalcTotals(laborItems, updated, period?.project as Project)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setSaving(false)
      }
    },
    [periodId, laborItems, materialInvoices, period, recalcTotals],
  )

  const updateMaterialInvoice = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      setSaving(true)
      try {
        const before = materialInvoices.find((i) => i.id === id)
        const updated = await payrollService.updateMaterialInvoice(id, updates)
        const invoices = materialInvoices.map((i) => (i.id === id ? updated : i))
        setMaterialInvoices(invoices)
        if (period) auditCommittedItemEdit(period, 'material_invoice', id, before, updated)
        await recalcTotals(laborItems, invoices, period?.project as Project)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setSaving(false)
      }
    },
    [laborItems, materialInvoices, period, recalcTotals],
  )

  // Sube el comprobante (imagen/PDF) y lo asocia a una factura ya guardada.
  // Usado por el flujo "guardar con advertencia": la factura puede crearse sin
  // comprobante y adjuntarse después desde la lista. No altera totales.
  const attachInvoiceFile = useCallback(
    async (invoiceId: string, file: File) => {
      if (!periodId || !period?.project_id) return
      setSaving(true)
      setError(null)
      try {
        const path = await payrollService.uploadInvoiceFile(file, period.project_id, periodId)
        const updated = await payrollService.setInvoiceAttachment(invoiceId, path)
        setMaterialInvoices((prev) => prev.map((i) => (i.id === invoiceId ? updated : i)))
      } catch (e) {
        setError(getErrorMessage(e))
        throw e
      } finally {
        setSaving(false)
      }
    },
    [periodId, period?.project_id],
  )

  const deleteMaterialInvoice = useCallback(
    async (id: string) => {
      setSaving(true)
      try {
        await payrollService.deleteMaterialInvoice(id)
        const invoices = materialInvoices.filter((i) => i.id !== id)
        setMaterialInvoices(invoices)
        await recalcTotals(laborItems, invoices, period?.project as Project)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setSaving(false)
      }
    },
    [laborItems, materialInvoices, period, recalcTotals],
  )

  const updateStatus = useCallback(
    async (status: 'draft' | 'submitted' | 'approved' | 'paid') => {
      if (!periodId) return

      if (status === 'submitted') {
        const hasLabor = laborItems.length > 0
        const hasMaterials = materialInvoices.length > 0
        if (!hasLabor && !hasMaterials) {
          setError(
            'El reporte debe tener al menos una partida de mano de obra o una factura de materiales antes de enviarlo.',
          )
          return
        }
      }

      setSaving(true)
      try {
        const updated = await payrollService.updatePeriodStatus(periodId, status)
        setPeriod((prev) => (prev ? { ...prev, ...updated } : null))
        setError(null)
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setSaving(false)
      }
    },
    [periodId, laborItems, materialInvoices],
  )

  const recalculateTotals = useCallback(async () => {
    if (!periodId) return
    await payrollService.recalculateTotals(periodId)
    await load()
  }, [periodId, load])

  const returnToDraft = useCallback(async () => {
    if (!periodId) return
    setSaving(true)
    try {
      const actor = useAuthStore.getState().user
      const updated = await payrollService.returnToDraft(periodId, {
        displayName: actor?.displayName,
      })
      setPeriod((prev) => (prev ? { ...prev, ...updated } : null))
      setError(null)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [periodId])

  return {
    period,
    laborItems,
    materialInvoices,
    indirectCosts,
    loading,
    saving,
    error,
    load,
    addLaborItem,
    updateLaborItem,
    deleteLaborItem,
    addMaterialInvoice,
    updateMaterialInvoice,
    attachInvoiceFile,
    deleteMaterialInvoice,
    updateStatus,
    returnToDraft,
    setIndirectActive,
    recalculateTotals,
  }
}
