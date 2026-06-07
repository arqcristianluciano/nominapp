import { supabase } from '@/lib/supabase'
import type { PurchaseQuote } from '@/types/purchaseOrder'
import { round2 } from '@/utils/money'

const QUOTE_BUCKET = 'quote-attachments'

// Tipos de archivo permitidos para adjuntar una cotización.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
// Tamaño máximo: 10 MB
const MAX_SIZE_BYTES = 10 * 1024 * 1024

type CreateQuotePayload = {
  requisition_id: string
  supplier_id: string
  quote_number?: string
  valid_until?: string
  tax_percent: number
  notes?: string
  items: Array<{
    description: string
    quantity: number
    unit: string
    unit_price: number
    material_catalog_id?: string | null
  }>
}

export const quoteService = {
  async create(payload: CreateQuotePayload) {
    const subtotal = round2(payload.items.reduce((s, i) => s + i.quantity * i.unit_price, 0))
    const total = round2(subtotal * (1 + payload.tax_percent / 100))

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
      subtotal: round2(i.quantity * i.unit_price),
      material_catalog_id: i.material_catalog_id ?? null,
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

  // Valida y sube el PDF/imagen de cotización al bucket 'quote-attachments'.
  // Devuelve el path almacenado (lo guarda el llamador en purchase_quotes.attachment_path).
  // Path: <projectId>/<requisitionId>/<quoteId>/<uuid>-<nombre>.
  async uploadAttachment(file: File, projectId: string, requisitionId: string, quoteId: string): Promise<string> {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Solo se admiten archivos JPG, PNG o PDF.')
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error('El archivo no puede superar 10 MB.')
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${projectId}/${requisitionId}/${quoteId}/${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage
      .from(QUOTE_BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (error) throw error
    return path
  },

  // Actualiza attachment_path de una cotización en la DB.
  async saveAttachmentPath(quoteId: string, path: string) {
    const { error } = await supabase.from('purchase_quotes').update({ attachment_path: path }).eq('id', quoteId)
    if (error) throw error
  },

  // URL firmada (privada) para ver/descargar el archivo de cotización.
  async getAttachmentUrl(path: string, expiresInSec = 60 * 60): Promise<string> {
    const { data, error } = await supabase.storage.from(QUOTE_BUCKET).createSignedUrl(path, expiresInSec)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('No se obtuvo URL de descarga')
    return data.signedUrl
  },
}
