import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Supplier } from '@/types/database'

interface ItemDraft { description: string; quantity: string; unit: string; unit_price: string }

interface QuotePayload {
  supplier_id: string
  quote_number?: string
  valid_until?: string
  tax_percent: number
  notes?: string
  items: Array<{ description: string; quantity: number; unit: string; unit_price: number }>
}

interface Props {
  suppliers: Supplier[]
  onSubmit: (payload: QuotePayload) => Promise<void>
  onCancel: () => void
  saving: boolean
}

const emptyItem = (): ItemDraft => ({ description: '', quantity: '1', unit: 'Unidad', unit_price: '' })

export function QuoteForm({ suppliers, onSubmit, onCancel, saving }: Props) {
  const [supplierId, setSupplierId] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [taxPercent, setTaxPercent] = useState('18')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [error, setError] = useState<string | null>(null)

  const updateItem = (idx: number, field: keyof ItemDraft, value: string) =>
    setItems((p) => p.map((it, i) => i === idx ? { ...it, [field]: value } : it))

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0)
  const total = subtotal * (1 + (parseFloat(taxPercent) || 0) / 100)
  const fmt = (n: number) => n.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!supplierId) return setError('Seleccione un suplidor')
    const valid = items.filter((i) => i.description && parseFloat(i.unit_price) > 0)
    if (!valid.length) return setError('Agregue al menos un ítem con precio')
    await onSubmit({
      supplier_id: supplierId,
      quote_number: quoteNumber || undefined,
      valid_until: validUntil || undefined,
      tax_percent: parseFloat(taxPercent) || 0,
      notes: notes || undefined,
      items: valid.map((i) => ({
        description: i.description,
        quantity: parseFloat(i.quantity) || 1,
        unit: i.unit,
        unit_price: parseFloat(i.unit_price),
      })),
    })
  }

  const cell = 'border border-app-border rounded px-2 py-1.5 text-xs w-full'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-app-muted mb-1">Suplidor *</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar…</option>
            {suppliers.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">N° cotización del suplidor</label>
          <input value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)}
            placeholder="Ej: COT-2026-001"
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Válida hasta</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-app-muted">Ítems *</span>
          <button type="button" onClick={() => setItems((p) => [...p, emptyItem()])}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
            <Plus className="w-3.5 h-3.5" /> Agregar ítem
          </button>
        </div>
        <div className="space-y-1.5">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-app-muted px-0.5">
            <span className="col-span-5">Descripción</span>
            <span className="col-span-2">Cantidad</span>
            <span className="col-span-2">Unidad</span>
            <span className="col-span-2">Precio unit.</span>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <input value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                placeholder="Descripción" className={`col-span-5 ${cell}`} />
              <input value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                type="number" min="0" step="any" className={`col-span-2 ${cell}`} />
              <input value={it.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                className={`col-span-2 ${cell}`} />
              <input value={it.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                type="number" min="0" step="any" placeholder="0.00" className={`col-span-2 ${cell}`} />
              <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                className="col-span-1 text-app-subtle hover:text-red-500 flex justify-center">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">ITBIS (%)</label>
          <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)}
            min="0" max="100" className="w-full border border-app-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="text-right text-sm space-y-0.5 pt-1">
          <p className="text-app-muted">Subtotal: <span className="font-medium text-app-text">{fmt(subtotal)}</span></p>
          <p className="font-semibold text-app-text">Total: {fmt(total)}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="w-full border border-app-border rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Agregar cotización'}
        </button>
      </div>
    </form>
  )
}
