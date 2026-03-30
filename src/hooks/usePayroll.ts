import { useState, useCallback } from 'react'
import { payrollService } from '@/services/payrollService'
import { calcLaborTotal, calcMaterialsTotal, calcIndirectCosts, calcGrandTotal } from '@/utils/calculations'
import type { PayrollPeriod, LaborLineItem, MaterialInvoice, IndirectCost, Project } from '@/types/database'

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
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [periodId])

  const recalcTotals = useCallback(async (
    items: LaborLineItem[],
    invoices: MaterialInvoice[],
    project?: Project
  ) => {
    if (!periodId || !project) return
    const laborTotal = calcLaborTotal(items)
    const materialsTotal = calcMaterialsTotal(invoices)
    const indirect = calcIndirectCosts(laborTotal, materialsTotal, project)
    const grandTotal = calcGrandTotal(laborTotal, materialsTotal, indirect.total)

    const costRows = [
      { type: 'direction_technique', description: `Dirección técnica ${project.dt_percent}%`, percentage: project.dt_percent, base_amount: indirect.base, calculated_amount: indirect.direction_technique.amount },
      { type: 'administration', description: `Administración ${project.admin_percent}%`, percentage: project.admin_percent, base_amount: indirect.base, calculated_amount: indirect.administration.amount },
      { type: 'transport', description: `Transporte ${project.transport_percent}%`, percentage: project.transport_percent, base_amount: indirect.base, calculated_amount: indirect.transport.amount },
    ]
    if (project.planning_fee > 0) {
      costRows.push({ type: 'planning', description: 'Planificación de proyecto', percentage: 0, base_amount: 0, calculated_amount: project.planning_fee })
    }

    await payrollService.saveIndirectCosts(periodId, costRows)
    await payrollService.updatePeriodTotals(periodId, {
      total_labor: laborTotal,
      total_materials: materialsTotal,
      total_indirect: indirect.total,
      grand_total: grandTotal,
    })

    setPeriod(prev => prev ? { ...prev, total_labor: laborTotal, total_materials: materialsTotal, total_indirect: indirect.total, grand_total: grandTotal } : null)
  }, [periodId])

  const addLaborItem = useCallback(async (item: {
    contractor_id: string
    description: string
    quantity: number
    unit: string
    unit_price: number
    is_advance?: boolean
    is_advance_deduction?: boolean
  }) => {
    if (!periodId) return
    setSaving(true)
    try {
      const maxSort = laborItems.reduce((m, i) => Math.max(m, i.sort_order || 0), 0)
      const newItem = await payrollService.addLaborItem({
        ...item,
        payroll_period_id: periodId,
        sort_order: maxSort + 1,
      })
      const updated = [...laborItems, newItem]
      setLaborItems(updated)
      await recalcTotals(updated, materialInvoices, period?.project as Project)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [periodId, laborItems, materialInvoices, period, recalcTotals])

  const updateLaborItem = useCallback(async (id: string, updates: Record<string, unknown>) => {
    setSaving(true)
    try {
      const updated = await payrollService.updateLaborItem(id, updates)
      const items = laborItems.map(i => i.id === id ? updated : i)
      setLaborItems(items)
      await recalcTotals(items, materialInvoices, period?.project as Project)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [laborItems, materialInvoices, period, recalcTotals])

  const deleteLaborItem = useCallback(async (id: string) => {
    setSaving(true)
    try {
      await payrollService.deleteLaborItem(id)
      const items = laborItems.filter(i => i.id !== id)
      setLaborItems(items)
      await recalcTotals(items, materialInvoices, period?.project as Project)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [laborItems, materialInvoices, period, recalcTotals])

  const addMaterialInvoice = useCallback(async (invoice: {
    supplier_id: string
    description: string
    invoice_reference?: string
    amount: number
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
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [periodId, laborItems, materialInvoices, period, recalcTotals])

  const deleteMaterialInvoice = useCallback(async (id: string) => {
    setSaving(true)
    try {
      await payrollService.deleteMaterialInvoice(id)
      const invoices = materialInvoices.filter(i => i.id !== id)
      setMaterialInvoices(invoices)
      await recalcTotals(laborItems, invoices, period?.project as Project)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [laborItems, materialInvoices, period, recalcTotals])

  const updateStatus = useCallback(async (status: 'draft' | 'submitted' | 'approved' | 'paid') => {
    if (!periodId) return

    if (status === 'submitted') {
      const hasLabor = laborItems.length > 0
      const hasMaterials = materialInvoices.length > 0
      if (!hasLabor && !hasMaterials) {
        setError('El reporte debe tener al menos una partida de mano de obra o una factura de materiales antes de enviarlo.')
        return
      }
    }

    setSaving(true)
    try {
      const updated = await payrollService.updatePeriodStatus(periodId, status)
      setPeriod(prev => prev ? { ...prev, ...updated } : null)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [periodId, laborItems, materialInvoices])

  return {
    period, laborItems, materialInvoices, indirectCosts,
    loading, saving, error,
    load, addLaborItem, updateLaborItem, deleteLaborItem,
    addMaterialInvoice, deleteMaterialInvoice, updateStatus,
  }
}
