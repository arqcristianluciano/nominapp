import { supabase } from '@/lib/supabase'
import type { PurchaseRequisition, PurchaseQuote } from '@/types/purchaseOrder'

function generateReqNumber(): string {
  const year = new Date().getFullYear()
  const seq = Math.floor(Math.random() * 9000) + 1000
  return `REQ-${year}-${seq}`
}

export const requisitionService = {
  async getAll() {
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .select('*, project:projects(id, name, code)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as PurchaseRequisition[]
  },

  async getById(id: string) {
    const { data: reqData, error } = await supabase
      .from('purchase_requisitions')
      .select('*, project:projects(id, name, code)')
      .eq('id', id)
      .single()
    if (error) throw error

    const { data: quotesData } = await supabase
      .from('purchase_quotes')
      .select('*, supplier:suppliers(id, name)')
      .eq('requisition_id', id)

    const quotes: PurchaseQuote[] = await Promise.all(
      (quotesData || []).map(async (q) => {
        const { data: items } = await supabase
          .from('purchase_quote_items')
          .select('*')
          .eq('quote_id', q.id)
        return { ...q, items: items || [] }
      })
    )

    return { ...reqData, quotes } as PurchaseRequisition
  },

  async create(payload: {
    project_id: string
    description: string
    requested_by: string
    required_date?: string
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .insert({
        ...payload,
        req_number: generateReqNumber(),
        status: 'draft',
        required_date: payload.required_date || null,
        notes: payload.notes || null,
        approved_quote_id: null,
        approved_by: null,
        approved_at: null,
        signature_data: null,
        rejection_reason: null,
        payment_type: null,
        ordered_at: null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return data as PurchaseRequisition
  },

  async submitForApproval(id: string) {
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({ status: 'pending_approval', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async approve(id: string, quoteId: string, approvedBy: string, signatureData: string) {
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'approved',
        approved_quote_id: quoteId,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        signature_data: signatureData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
  },

  async reject(id: string, reason: string) {
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async returnForRevision(id: string, revisionNotes: string) {
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'needs_revision',
        revision_notes: revisionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
  },

  async placeOrder(id: string, paymentType: 'credit' | 'cash') {
    const { error } = await supabase
      .from('purchase_requisitions')
      .update({
        status: 'ordered',
        payment_type: paymentType,
        ordered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
  },

  async delete(id: string) {
    const { data: quotes } = await supabase
      .from('purchase_quotes')
      .select('id')
      .eq('requisition_id', id)
    for (const q of quotes || []) {
      await supabase.from('purchase_quote_items').delete().eq('quote_id', q.id)
    }
    await supabase.from('purchase_quotes').delete().eq('requisition_id', id)
    const { error } = await supabase.from('purchase_requisitions').delete().eq('id', id)
    if (error) throw error
  },
}
