import { supabase } from '@/lib/supabase'
import type { PurchaseQuote } from '@/types/purchaseOrder'

type CreateQuotePayload = {
  requisition_id: string
  supplier_id: string
  quote_number?: string
  valid_until?: string
  tax_percent: number
  notes?: string
  items: Array<{ description: string; quantity: number; unit: string; unit_price: number }>
}

export const quoteService = {
  async create(payload: CreateQuotePayload) {
    const subtotal = payload.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const total = subtotal * (1 + payload.tax_percent / 100)

    const { data: quote, error } = await supabase
      .from('purchase_quotes')
      .insert({
        requisition_id: payload.requisition_id,
        supplier_id: payload.supplier_id,
        quote_number: payload.quote_number || null,
        valid_until: payload.valid_until || null,
        subtotal,
        tax_percent: payload.tax_percent,
        total,
        notes: payload.notes || null,
      })
      .select()
      .single()
    if (error) throw error

    const itemRows = payload.items.map((i) => ({
      quote_id: (quote as PurchaseQuote).id,
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.unit_price,
      subtotal: i.quantity * i.unit_price,
    }))
    const { error: itemErr } = await supabase.from('purchase_quote_items').insert(itemRows)
    if (itemErr) throw itemErr

    // Move requisition from draft → quoting
    await supabase
      .from('purchase_requisitions')
      .update({ status: 'quoting', updated_at: new Date().toISOString() })
      .eq('id', payload.requisition_id)
      .eq('status', 'draft')

    return quote as PurchaseQuote
  },

  async updateNegotiatedPrice(quoteId: string, negotiatedTotal: number | null, notes: string | null) {
    const { error } = await supabase
      .from('purchase_quotes')
      .update({ negotiated_total: negotiatedTotal, negotiated_notes: notes })
      .eq('id', quoteId)
    if (error) throw error
  },

  async delete(quoteId: string) {
    await supabase.from('purchase_quote_items').delete().eq('quote_id', quoteId)
    const { error } = await supabase.from('purchase_quotes').delete().eq('id', quoteId)
    if (error) throw error
  },
}
