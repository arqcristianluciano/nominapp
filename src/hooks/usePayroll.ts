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

  // Recalc only indirect totals from current indirect cost rows (does not recreate rows)
  const recalcIndirectTotals = useCallback(async (costs: IndirectCost[], items: LaborLineItem[], invoices: MaterialInvoice[]) => {
    if (!periodId) return
    const laborTotal = calcLaborTotal(items)
    const materialsTotal = calcMaterialsTotal(invoices)
    const indirectTotal = costs.reduce((sum, c) => sum + c.calculated_amount, 0)
    const grandTotal = calcGrandTotal(laborTotal, materialsTotal, indirectTotal)

    await payrollService.updatePeriodTotals(periodId, {
      total_labor: laborTotal,
      total_materials: materialsTotal,
      total_indirect: indirectTotal,
      grand_total: grandTotal,
    })

    setPeriod(prev => prev ? { ...prev, total_labor: laborTotal, total_materials: materialsTotal, total_indirect: indirectTotal, grand_total: grandTotal } : null)
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

  const addIndirectCost = useCallback(async (cost: { description: string; percentage: number }) => {
    if (!periodId) return
    setSaving(true)
    try {
      const laborTotal = calcLaborTotal(laborItems)
      const materialsTotal = calcMaterialsTotal(materialInvoices)
      const base = laborTotal + materialsTotal
      const calculated = base * (cost.percentage / 100)

      const newCost = await payrollService.addIndirectCost({
        payroll_period_id: periodId,
        type: 'custom',
        description: `${cost.description} ${cost.percentage}%`,
        percentage: cost.percentage,
        base_amount: base,
        calculated_amount: calculated,
      })
      const updated = [...indirectCosts, newCost]
      setIndirectCosts(updated)
      await recalcIndirectTotals(updated, laborItems, materialInvoices)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [periodId, laborItems, materialInvoices, indirectCosts, recalcIndirectTotals])

  const updateIndirectCost = useCallback(async (id: string, updates: { description: string; percentage: number }) => {
    setSaving(true)
    try {
      const laborTotal = calcLaborTotal(laborItems)
      const materialsTotal = calcMaterialsTotal(materialInvoices)
      const base = laborTotal + materialsTotal
      const calculated = base * (updates.percentage / 100)

      const updated = await payrollService.updateIndirectCost(id, {
        description: `${updates.description} ${updates.percentage}%`,
        percentage: updates.percentage,
        base_amount: base,
        calculated_amount: calculated,
      })
      const costs = indirectCosts.map(c => c.id === id ? updated : c)
      setIndirectCosts(costs)
      await recalcIndirectTotals(costs, laborItems, materialInvoices)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [laborItems, materialInvoices, indirectCosts, recalcIndirectTotals])

  const deleteIndirectCost = useCallback(async (id: string) => {
    setSaving(true)
    try {
      await payrollService.deleteIndirectCost(id)
      const costs = indirectCosts.filter(c => c.id !== id)
      setIndirectCosts(costs)
      await recalcIndirectTotals(costs, laborItems, materialInvoices)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [laborItems, materialInvoices, indirectCosts, recalcIndirectTotals])

  const updateStatus = useCallback(async (status: 'draft' | 'submitted' | 'approved' | 'paid') => {
    if (!periodId) return
    setSaving(true)
    try {
      const updated = await payrollService.updatePeriodStatus(periodId, status)
      setPeriod(prev => prev ? { ...prev, ...updated } : null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [periodId])

  return {
    period, laborItems, materialInvoices, indirectCosts,
    loading, saving, error,
    load, addLaborItem, updateLaborItem, deleteLaborItem,
    addMaterialInvoice, deleteMaterialInvoice,
    addIndirectCost, updateIndirectCost, deleteIndirectCost,
    updateStatus,
  }
}
