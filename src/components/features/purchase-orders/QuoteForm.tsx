import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Supplier } from '@/types/database'
import { SupplierSelect } from '@/components/features/suppliers/SupplierSelect'
import { formatRD } from '@/utils/currency'
import { parseDecimalInput } from '@/utils/decimalInput'
import { materialsCatalogService, type MaterialCatalogItem } from '@/services/materialsCatalogService'

interface ItemDraft {
  description: string
  quantity: string
  unit: string
  unit_price: string
  material_catalog_id: string | null
}

interface QuotePayload {
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

interface Props {
  suppliers: Supplier[]
  onSubmit: (payload: QuotePayload) => Promise<void>
  onCancel: () => void
  saving: boolean
}

const emptyItem = (): ItemDraft => ({
  description: '',
  quantity: '1',
  unit: 'Unidad',
  unit_price: '',
  material_catalog_id: null,
})

export function QuoteForm({ suppliers, onSubmit, onCancel, saving }: Props) {
  const [supplierId, setSupplierId] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [taxPercent, setTaxPercent] = useState('18')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [error, setError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<MaterialCatalogItem[]>([])

  useEffect(() => {
    materialsCatalogService
      .getAll()
      .then(setCatalog)
      .catch(() => setCatalog([]))
  }, [])

  const updateItem = (idx: number, field: keyof ItemDraft, value: string) =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))

  // Al escribir/seleccionar la descripción, si coincide con un material del
  // catálogo, vincula la línea (material_catalog_id) y autocompleta la unidad.
  const updateDescription = (idx: number, value: string) =>
    setItems((p) =>
      p.map((it, i) => {
        if (i !== idx) return it
        const match = catalog.find((c) => c.description.toLowerCase() === value.trim().toLowerCase())
        return match
          ? { ...it, description: value, material_catalog_id: match.id, unit: match.unit }
          : { ...it, description: value, material_catalog_id: null }
      }),
    )

  const subtotal = items.reduce(
    (s, i) => s + (parseDecimalInput(i.quantity) ?? 0) * (parseDecimalInput(i.unit_price) ?? 0),
    0,
  )
  const total = subtotal * (1 + (parseDecimalInput(taxPercent) ?? 0) / 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!supplierId) return setError('Seleccione un suplidor')
    const valid = items.filter((i) => {
      const price = parseDecimalInput(i.unit_price)
      return i.description && price !== null && price > 0
    })
    if (!valid.length) return setError('Agregue al menos un ítem con precio')
    await onSubmit({
      supplier_id: supplierId,
      quote_number: quoteNumber || undefined,
      valid_until: validUntil || undefined,
      tax_percent: parseDecimalInput(taxPercent) ?? 0,
      notes: notes || undefined,
      items: valid.map((i) => {
        const qty = parseDecimalInput(i.quantity)
        return {
          description: i.description,
          quantity: qty !== null && qty > 0 ? qty : 1,
          unit: i.unit,
          unit_price: parseDecimalInput(i.unit_price) ?? 0,
          material_catalog_id: i.material_catalog_id,
        }
      }),
    })
  }

  const cell = 'border border-app-border rounded px-2 py-1.5 text-xs w-full'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-app-muted mb-1">Suplidor *</label>
          <SupplierSelect
            suppliers={suppliers}
            value={supplierId}
            onChange={setSupplierId}
            required
            placeholder="Seleccionar…"
            selectClassName="w-full border border-app-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">N° cotización del suplidor</label>
          <input
            value={quoteNumber}
            onChange={(e) => setQuoteNumber(e.target.value)}
            placeholder="Ej: COT-2026-001"
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Válida hasta</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-app-muted">Ítems *</span>
          <button
            type="button"
            onClick={() => setItems((p) => [...p, emptyItem()])}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
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
              <input
                value={it.description}
                onChange={(e) => updateDescription(idx, e.target.value)}
                list="quote-catalog-options"
                placeholder="Descripción"
                title={it.material_catalog_id ? 'Vinculado al catálogo de materiales' : undefined}
                className={`col-span-5 ${cell} ${it.material_catalog_id ? 'border-teal-400' : ''}`}
              />
              <input
                value={it.quantity}
                onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                type="text"
                inputMode="decimal"
                className={`col-span-2 ${cell}`}
              />
              <input
                value={it.unit}
                onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                className={`col-span-2 ${cell}`}
              />
              <input
                value={it.unit_price}
                onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className={`col-span-2 ${cell}`}
              />
              <button
                type="button"
                onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                className="col-span-1 text-app-subtle hover:text-red-500 flex justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <datalist id="quote-catalog-options">
            {catalog.map((c) => (
              <option key={c.id} value={c.description}>{`${c.code} · ${c.unit}`}</option>
            ))}
          </datalist>
        </div>
        {catalog.length > 0 && (
          <p className="text-[10px] text-app-subtle mt-1">
            Tip: elige una descripción del catálogo para enlazar la línea al material (mejora el histórico de precios y
            la entrada a almacén).
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">ITBIS (%)</label>
          <input
            type="number"
            value={taxPercent}
            onChange={(e) => setTaxPercent(e.target.value)}
            min="0"
            max="100"
            className="w-full border border-app-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="text-right text-sm space-y-0.5 pt-1">
          <p className="text-app-muted">
            Subtotal: <span className="font-medium text-app-text">{formatRD(subtotal)}</span>
          </p>
          <p className="font-semibold text-app-text">Total: {formatRD(total)}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-app-border rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Agregar cotización'}
        </button>
      </div>
    </form>
  )
}
