import * as Sentry from '@sentry/react'
import { todayISO } from '@/utils/dateLocal'
import { supabase } from '@/lib/supabase'
import type {
  PayrollPeriod,
  LaborLineItem,
  MaterialInvoice,
  MaterialInvoiceItem,
  IndirectCost,
  PayrollStatus,
  Project,
} from '@/types/database'
import {
  buildIndirectCostRows,
  calcGrandTotal,
  calcIndirectCosts,
  calcLaborTotal,
  calcMaterialsTotal,
} from '@/utils/calculations'
import { buildInvoiceSummary, sumInvoiceItems } from '@/utils/materialInvoice'
import { round2 } from '@/utils/money'
import { approvalsService, type ApprovalAction } from '@/services/approvalsService'

const INVOICE_BUCKET = 'invoice-attachments'

/** Devuelve la factura con sus items ordenados por `sort_order` (no muta el original). */
function sortInvoiceItems(invoice: MaterialInvoice): MaterialInvoice {
  if (!invoice.items?.length) return invoice
  return {
    ...invoice,
    items: [...invoice.items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }
}

// Estados en los que una nómina ya se considera comprometida (regla 7.6).
// Cubicación, dashboard y plan-vs-real deben filtrar usando este conjunto.
export const COMMITTED_PAYROLL_STATUSES: PayrollStatus[] = ['approved', 'paid']

function actionForStatus(status: PayrollStatus): ApprovalAction {
  if (status === 'submitted') return 'submit_for_approval'
  if (status === 'approved') return 'approve'
  return 'status_change'
}

// Resuelve nombres de autor (created_by → display_name) en un solo query.
// En modo demo no hay autores (created_by null) y se evita la consulta.
async function buildCreatorNameMap(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))]
  if (unique.length === 0) return new Map()
  try {
    const { data } = await supabase.from('user_profiles').select('id, display_name').in('id', unique)
    return new Map(
      ((data ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name ?? '']),
    )
  } catch {
    return new Map()
  }
}

export const payrollService = {
  // === PAYROLL PERIODS ===

  async getPeriods(projectId: string) {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('project_id', projectId)
      .order('period_number', { ascending: false })
    if (error) throw error
    return data as PayrollPeriod[]
  },

  async getAllPeriods() {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*, project:projects(id, name, code)')
      .order('period_number', { ascending: false })
    if (error) throw error
    return data as PayrollPeriod[]
  },

  async getPeriodDetail(periodId: string) {
    const [periodRes, laborRes, materialsRes, indirectRes] = await Promise.all([
      supabase
        .from('payroll_periods')
        .select('*, project:projects(*, company:companies(*))')
        .eq('id', periodId)
        .single(),
      supabase
        .from('labor_line_items')
        .select(
          '*, contractor:contractors(*), budget_category:budget_categories(code, name), budget_item:budget_items(code, description)',
        )
        .eq('payroll_period_id', periodId)
        .order('sort_order'),
      supabase
        .from('material_invoices')
        .select(
          '*, supplier:suppliers(*), items:material_invoice_items(*), budget_category:budget_categories(code, name), budget_item:budget_items(code, description)',
        )
        .eq('payroll_period_id', periodId),
      supabase.from('indirect_costs').select('*').eq('payroll_period_id', periodId),
    ])
    if (periodRes.error) throw periodRes.error

    const laborItems = (laborRes.data || []) as LaborLineItem[]
    const materialInvoices = (materialsRes.data || []) as MaterialInvoice[]
    const nameById = await buildCreatorNameMap([
      ...laborItems.map((i) => i.created_by),
      ...materialInvoices.map((i) => i.created_by),
    ])
    const withCreator = <T extends { created_by: string | null; creator_name?: string | null }>(i: T): T => ({
      ...i,
      creator_name: i.created_by ? (nameById.get(i.created_by) ?? null) : null,
    })

    return {
      period: periodRes.data as PayrollPeriod,
      laborItems: laborItems.map(withCreator),
      materialInvoices: materialInvoices.map(sortInvoiceItems).map(withCreator),
      indirectCosts: (indirectRes.data || []) as IndirectCost[],
    }
  },

  async createPeriod(period: {
    project_id: string
    period_number: number
    report_date: string
    reported_by?: string
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('payroll_periods')
      .insert({ ...period, status: 'draft' })
      .select()
      .single()
    if (error) throw error
    return data as PayrollPeriod
  },

  async getNextPeriodNumber(projectId: string) {
    const { data } = await supabase
      .from('payroll_periods')
      .select('period_number')
      .eq('project_id', projectId)
      .order('period_number', { ascending: false })
      .limit(1)
    return (data?.[0]?.period_number || 0) + 1
  },

  async getDraftPeriod(projectId: string): Promise<PayrollPeriod | null> {
    const { data } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['draft', 'submitted'])
      .limit(1)
    return (data?.[0] as PayrollPeriod) ?? null
  },

  async updatePeriodStatus(id: string, status: PayrollStatus, actor?: { displayName?: string }) {
    const { data: before } = await supabase
      .from('payroll_periods')
      .select('id, status, period_number, project_id')
      .eq('id', id)
      .single()

    const updates: Record<string, unknown> = { status }
    if (status === 'approved') {
      updates.approved_at = new Date().toISOString()
      if (actor?.displayName) updates.approved_by = actor.displayName
    }
    Sentry.addBreadcrumb({
      category: 'payroll',
      message: `update period status to ${status}`,
      level: 'info',
      data: { periodId: id, status },
    })
    const { data, error } = await supabase.from('payroll_periods').update(updates).eq('id', id).select().single()
    if (error) throw error

    await approvalsService.log({
      entity_type: 'payroll_period',
      entity_id: id,
      action: actionForStatus(status),
      actor_display_name: actor?.displayName,
      payload_before: before ? { status: before.status } : null,
      payload_after: { status },
      metadata: before ? { period_number: before.period_number, project_id: before.project_id } : {},
    })

    return data as PayrollPeriod
  },

  // Devuelve un reporte comprometido a BORRADOR para que el autor lo corrija.
  // Limpia la aprobación y registra la acción en la bitácora (return_for_revision).
  async returnToDraft(id: string, actor?: { displayName?: string }) {
    const { data: before } = await supabase
      .from('payroll_periods')
      .select('id, status, period_number, project_id')
      .eq('id', id)
      .single()

    const { data, error } = await supabase
      .from('payroll_periods')
      .update({ status: 'draft', approved_at: null, approved_by: null })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    await approvalsService
      .log({
        entity_type: 'payroll_period',
        entity_id: id,
        action: 'return_for_revision',
        actor_display_name: actor?.displayName,
        payload_before: before ? { status: before.status } : null,
        payload_after: { status: 'draft' },
        metadata: before ? { period_number: before.period_number, project_id: before.project_id } : {},
      })
      .catch((err) => console.warn('[payrollService.returnToDraft] log de auditoría falló', err))

    return data as PayrollPeriod
  },

  async updatePeriodTotals(
    id: string,
    totals: {
      total_labor: number
      total_materials: number
      total_indirect: number
      grand_total: number
    },
  ) {
    const { error } = await supabase.from('payroll_periods').update(totals).eq('id', id)
    if (error) throw error
  },

  /**
   * Deducciones que se retienen del pago a los beneficiarios de este reporte y
   * que por tanto NO deben poder distribuirse como pago:
   *  - Deducciones de préstamos (loan_deductions): dinero que el contratista
   *    devuelve al fondo, no se le entrega.
   *  - Retención de garantía de los cortes de cubicación vinculados: se retiene
   *    hasta liberarla más adelante.
   * El neto a repartir en pagos es grand_total menos estas deducciones.
   */
  async getPayrollDeductions(periodId: string): Promise<{ loanDeductions: number; retention: number; total: number }> {
    const [dedRes, corteRes] = await Promise.all([
      supabase.from('loan_deductions').select('amount').eq('payroll_period_id', periodId),
      supabase.from('contract_cortes').select('retention_amount').eq('linked_payroll_id', periodId),
    ])
    if (dedRes.error) throw dedRes.error
    if (corteRes.error) throw corteRes.error
    const loanDeductions = round2(
      ((dedRes.data ?? []) as Array<{ amount: number | null }>).reduce((s, d) => s + Number(d.amount ?? 0), 0),
    )
    const retention = round2(
      ((corteRes.data ?? []) as Array<{ retention_amount: number | null }>).reduce(
        (s, c) => s + Number(c.retention_amount ?? 0),
        0,
      ),
    )
    return { loanDeductions, retention, total: round2(loanDeductions + retention) }
  },

  async recalculateTotals(periodId: string) {
    const { period, laborItems, materialInvoices } = await this.getPeriodDetail(periodId)
    const project = period.project as Project | undefined
    if (!project) return

    const laborTotal = calcLaborTotal(laborItems)
    const materialsTotal = calcMaterialsTotal(materialInvoices)
    const indirect = calcIndirectCosts(laborTotal, materialsTotal, project)
    const rows = buildIndirectCostRows(project, indirect)
    await this.saveIndirectCosts(periodId, rows)
    // El total incluye TODOS los indirectos activos: automáticos + manuales.
    const { data: allIndirect } = await supabase
      .from('indirect_costs')
      .select('calculated_amount, is_active')
      .eq('payroll_period_id', periodId)
    const totalIndirect = ((allIndirect || []) as Pick<IndirectCost, 'calculated_amount' | 'is_active'>[])
      .filter((cost) => cost.is_active)
      .reduce((acc, cost) => acc + Number(cost.calculated_amount), 0)

    await this.updatePeriodTotals(periodId, {
      total_labor: laborTotal,
      total_materials: materialsTotal,
      total_indirect: totalIndirect,
      grand_total: calcGrandTotal(laborTotal, materialsTotal, totalIndirect),
    })
  },

  async deletePeriod(id: string) {
    const { data: period } = await supabase.from('payroll_periods').select('*').eq('id', id).single()

    const { error } = await supabase.from('payroll_periods').delete().eq('id', id)
    if (error) throw error

    await approvalsService
      .log({
        entity_type: 'payroll_period',
        entity_id: id,
        action: 'delete',
        payload_before: period,
      })
      .catch((err) => console.warn('[payrollService.deletePeriod] log de auditoria fallo', err))
  },

  async duplicatePeriod(sourcePeriodId: string, projectId: string): Promise<PayrollPeriod> {
    const draft = await this.getDraftPeriod(projectId)
    if (draft)
      throw new Error(
        `Ya existe el Reporte No. ${draft.period_number} en borrador. Concluye ese reporte antes de duplicar.`,
      )

    const { laborItems, materialInvoices } = await this.getPeriodDetail(sourcePeriodId)
    const nextNum = await this.getNextPeriodNumber(projectId)

    const newPeriod = await this.createPeriod({
      project_id: projectId,
      period_number: nextNum,
      report_date: todayISO(),
    })

    if (laborItems.length > 0) {
      const laborRows = laborItems.map((item, i) => ({
        payroll_period_id: newPeriod.id,
        contractor_id: item.contractor_id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        is_advance: item.is_advance,
        is_advance_deduction: item.is_advance_deduction,
        sort_order: i + 1,
        notes: item.notes,
      }))
      const { error: laborInsertError } = await supabase.from('labor_line_items').insert(laborRows)
      if (laborInsertError) throw laborInsertError
    }

    for (const inv of materialInvoices) {
      const { data: newInvoice, error: invError } = await supabase
        .from('material_invoices')
        .insert({
          payroll_period_id: newPeriod.id,
          supplier_id: inv.supplier_id,
          description: inv.description,
          invoice_reference: inv.invoice_reference,
          amount: inv.amount,
          budget_category_id: inv.budget_category_id,
          attachment_path: inv.attachment_path,
          notes: inv.notes,
        })
        .select('id')
        .single()
      if (invError) throw invError

      const items = inv.items ?? []
      if (items.length > 0) {
        const { error: itemsInsertError } = await supabase.from('material_invoice_items').insert(
          items.map((it, i) => ({
            material_invoice_id: newInvoice.id,
            description: it.description,
            amount: it.amount,
            sort_order: it.sort_order ?? i,
          })),
        )
        if (itemsInsertError) throw itemsInsertError
      }
    }

    return newPeriod
  },

  // === LABOR LINE ITEMS ===

  async addLaborItem(item: {
    payroll_period_id: string
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
  }) {
    const { data, error } = await supabase
      .from('labor_line_items')
      .insert(item)
      .select(
        '*, contractor:contractors(*), budget_category:budget_categories(code, name), budget_item:budget_items(code, description)',
      )
      .single()
    if (error) throw error
    return data as LaborLineItem
  },

  async updateLaborItem(
    id: string,
    updates: {
      contractor_id?: string
      description?: string
      quantity?: number
      unit?: string
      unit_price?: number
      is_advance?: boolean
      is_advance_deduction?: boolean
      budget_category_id?: string | null
      budget_item_id?: string | null
      notes?: string
    },
  ) {
    const { data, error } = await supabase
      .from('labor_line_items')
      .update(updates)
      .eq('id', id)
      .select(
        '*, contractor:contractors(*), budget_category:budget_categories(code, name), budget_item:budget_items(code, description)',
      )
      .single()
    if (error) throw error
    return data as LaborLineItem
  },

  async deleteLaborItem(id: string) {
    const { error } = await supabase.from('labor_line_items').delete().eq('id', id)
    if (error) throw error
  },

  // === MATERIAL INVOICES ===

  async addMaterialInvoice(invoice: {
    payroll_period_id: string
    supplier_id: string
    invoice_reference?: string
    attachment_path?: string | null
    notes?: string
    budget_category_id?: string | null
    budget_item_id?: string | null
    items: { description: string; amount: number }[]
  }) {
    const items = invoice.items
      .map((it) => ({ description: it.description.trim(), amount: round2(it.amount) }))
      .filter((it) => it.description.length > 0 && Number.isFinite(it.amount))
    if (items.length === 0) {
      throw new Error('La factura debe tener al menos un ítem con descripción y monto.')
    }

    // `amount` y `description` quedan denormalizados en el encabezado para que
    // reportes/impresion/export sigan funcionando sin leer la tabla de items.
    const { data: header, error } = await supabase
      .from('material_invoices')
      .insert({
        payroll_period_id: invoice.payroll_period_id,
        supplier_id: invoice.supplier_id,
        description: buildInvoiceSummary(items),
        invoice_reference: invoice.invoice_reference ?? null,
        attachment_path: invoice.attachment_path ?? null,
        amount: sumInvoiceItems(items),
        notes: invoice.notes ?? null,
        budget_category_id: invoice.budget_category_id ?? null,
        budget_item_id: invoice.budget_item_id ?? null,
      })
      .select(
        '*, supplier:suppliers(*), budget_category:budget_categories(code, name), budget_item:budget_items(code, description)',
      )
      .single()
    if (error) throw error

    const { data: savedItems, error: itemsError } = await supabase
      .from('material_invoice_items')
      .insert(items.map((it, i) => ({ ...it, material_invoice_id: header.id, sort_order: i })))
      .select()
    if (itemsError) throw itemsError

    return { ...(header as MaterialInvoice), items: (savedItems || []) as MaterialInvoiceItem[] }
  },

  /** Asocia (o limpia) el path del comprobante de una factura ya existente. */
  async setInvoiceAttachment(invoiceId: string, attachmentPath: string | null) {
    const { data, error } = await supabase
      .from('material_invoices')
      .update({ attachment_path: attachmentPath })
      .eq('id', invoiceId)
      .select(
        '*, supplier:suppliers(*), items:material_invoice_items(*), budget_category:budget_categories(code, name), budget_item:budget_items(code, description)',
      )
      .single()
    if (error) throw error
    return sortInvoiceItems(data as MaterialInvoice)
  },

  async updateMaterialInvoice(
    id: string,
    updates: {
      supplier_id?: string
      invoice_reference?: string | null
      attachment_path?: string | null
      notes?: string | null
      budget_category_id?: string | null
      budget_item_id?: string | null
      items?: { description: string; amount: number }[]
    },
  ) {
    // Comprobante actual: si la edición lo cambia/quita, se limpiará de storage.
    const { data: current } = await supabase.from('material_invoices').select('attachment_path').eq('id', id).single()
    const oldPath = (current as { attachment_path: string | null } | null)?.attachment_path ?? null

    // Patch del encabezado. Si vienen items, recalcula total (amount) y resumen
    // (description) denormalizados y reemplaza los items hijos.
    const headerPatch: Record<string, unknown> = {}
    if (updates.supplier_id !== undefined) headerPatch.supplier_id = updates.supplier_id
    if (updates.invoice_reference !== undefined) headerPatch.invoice_reference = updates.invoice_reference || null
    if (updates.attachment_path !== undefined) headerPatch.attachment_path = updates.attachment_path
    if (updates.notes !== undefined) headerPatch.notes = updates.notes
    if (updates.budget_category_id !== undefined) headerPatch.budget_category_id = updates.budget_category_id
    if (updates.budget_item_id !== undefined) headerPatch.budget_item_id = updates.budget_item_id

    let items: { description: string; amount: number }[] | null = null
    if (updates.items) {
      items = updates.items
        .map((it) => ({ description: it.description.trim(), amount: round2(it.amount) }))
        .filter((it) => it.description.length > 0 && Number.isFinite(it.amount))
      if (items.length === 0) {
        throw new Error('La factura debe tener al menos un ítem con descripción y monto.')
      }
      headerPatch.amount = sumInvoiceItems(items)
      headerPatch.description = buildInvoiceSummary(items)
    }

    const { error: headerError } = await supabase.from('material_invoices').update(headerPatch).eq('id', id)
    if (headerError) throw headerError

    if (items) {
      // Reemplaza los items: borra los actuales e inserta los nuevos.
      const { error: delError } = await supabase.from('material_invoice_items').delete().eq('material_invoice_id', id)
      if (delError) throw delError
      const { error: insError } = await supabase
        .from('material_invoice_items')
        .insert(items.map((it, i) => ({ ...it, material_invoice_id: id, sort_order: i })))
      if (insError) throw insError
    }

    const { data, error } = await supabase
      .from('material_invoices')
      .select(
        '*, supplier:suppliers(*), items:material_invoice_items(*), budget_category:budget_categories(code, name), budget_item:budget_items(code, description)',
      )
      .eq('id', id)
      .single()
    if (error) throw error

    // Si el comprobante cambió o se quitó, borra el archivo anterior del bucket.
    if (updates.attachment_path !== undefined && oldPath && oldPath !== updates.attachment_path) {
      await this.deleteInvoiceFile(oldPath)
    }

    return sortInvoiceItems(data as MaterialInvoice)
  },

  async deleteMaterialInvoice(id: string) {
    // Recupera el comprobante para limpiarlo de storage tras borrar la factura
    // (evita archivos huérfanos en el bucket).
    const { data: existing } = await supabase.from('material_invoices').select('attachment_path').eq('id', id).single()
    const { error } = await supabase.from('material_invoices').delete().eq('id', id)
    if (error) throw error
    const path = (existing as { attachment_path: string | null } | null)?.attachment_path
    if (path) await this.deleteInvoiceFile(path)
  },

  // === INDIRECT COSTS ===

  async getIndirectCosts(periodId: string): Promise<IndirectCost[]> {
    const { data, error } = await supabase.from('indirect_costs').select('*').eq('payroll_period_id', periodId)
    if (error) throw error
    return (data ?? []) as IndirectCost[]
  },

  async saveIndirectCosts(
    periodId: string,
    costs: {
      type: string
      description: string
      percentage?: number
      base_amount?: number
      calculated_amount: number
      fixed_amount?: number
    }[],
  ) {
    // Conserva la preferencia is_active de los porcentuales por tipo.
    const { data: existing } = await supabase
      .from('indirect_costs')
      .select('type, is_active')
      .eq('payroll_period_id', periodId)
      .eq('is_manual', false)
    const activeByType = new Map<string, boolean>()
    for (const r of (existing || []) as Pick<IndirectCost, 'type' | 'is_active'>[]) {
      activeByType.set(r.type, r.is_active)
    }

    // Solo se borran y reconstruyen los indirectos AUTOMÁTICOS (porcentuales).
    // Los manuales (is_manual = true) sobreviven al recálculo intactos.
    // A11: si el DELETE falla, abortamos antes de insertar para evitar duplicados.
    const { error: deleteError } = await supabase
      .from('indirect_costs')
      .delete()
      .eq('payroll_period_id', periodId)
      .eq('is_manual', false)
    if (deleteError) throw deleteError
    if (costs.length === 0) return []
    const rows = costs.map((c) => ({
      ...c,
      payroll_period_id: periodId,
      is_active: activeByType.get(c.type) ?? true,
      is_manual: false,
    }))
    const { data, error } = await supabase.from('indirect_costs').insert(rows).select()
    if (error) throw error
    return data as IndirectCost[]
  },

  async setIndirectActive(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('indirect_costs')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as IndirectCost
  },

  /** Agrega un indirecto manual de monto fijo (no se recalcula por porcentaje). */
  async addManualIndirect(periodId: string, input: { description: string; amount: number }) {
    const { data, error } = await supabase
      .from('indirect_costs')
      .insert({
        payroll_period_id: periodId,
        type: 'manual',
        description: input.description,
        percentage: null,
        base_amount: null,
        calculated_amount: input.amount,
        fixed_amount: input.amount,
        is_active: true,
        is_manual: true,
      })
      .select()
      .single()
    if (error) throw error
    return data as IndirectCost
  },

  /** Edita el concepto o el monto de un indirecto manual. */
  async updateManualIndirect(id: string, input: { description: string; amount: number }) {
    const { data, error } = await supabase
      .from('indirect_costs')
      .update({
        description: input.description,
        calculated_amount: input.amount,
        fixed_amount: input.amount,
      })
      .eq('id', id)
      .eq('is_manual', true)
      .select()
      .single()
    if (error) throw error
    return data as IndirectCost
  },

  /** Elimina un indirecto manual. */
  async deleteManualIndirect(id: string) {
    const { data, error } = await supabase
      .from('indirect_costs')
      .delete()
      .eq('id', id)
      .eq('is_manual', true)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) throw new Error('No se encontró el indirecto manual a eliminar.')
  },

  // === FILE ATTACHMENTS ===

  /**
   * Sube el comprobante de una factura al bucket privado `invoice-attachments`.
   * El path es `<projectId>/<periodId>/<timestamp>-<nombre>` para que RLS pueda
   * verificar la pertenencia al proyecto (primer segmento del path).
   */
  async uploadInvoiceFile(file: File, projectId: string, periodId: string) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${projectId}/${periodId}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage
      .from(INVOICE_BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (error) throw error
    return path
  },

  /** Genera una URL firmada (privada) para ver/descargar el comprobante. */
  async getInvoiceFileUrl(path: string, expiresInSec = 60 * 60) {
    const { data, error } = await supabase.storage.from(INVOICE_BUCKET).createSignedUrl(path, expiresInSec)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('No signed URL returned')
    return data.signedUrl
  },

  /** Borra (best-effort) un comprobante del bucket. No lanza si falla. */
  async deleteInvoiceFile(path: string) {
    const { error } = await supabase.storage.from(INVOICE_BUCKET).remove([path])
    if (error) console.warn('[payrollService.deleteInvoiceFile] no se pudo borrar el comprobante', error)
  },
}
