import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import type { BudgetItem, BudgetCategory, PriceListItem } from '@/types/database'
import { MEASURE_UNITS } from '@/constants/measureUnits'
import { formatRD } from '@/utils/currency'

interface Props {
  category: BudgetCategory
  priceList: PriceListItem[]
  editItem?: BudgetItem | null
  onSave: (data: Omit<BudgetItem, 'id'>) => Promise<void>
  onClose: () => void
}

const EMPTY_FORM = {
  code: '',
  description: '',
  unit: 'M2',
  quantity: '',
  unit_price: '',
  notes: '',
}

export default function BudgetItemForm({ category, priceList, editItem, onSave, onClose }: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [priceQuery, setPriceQuery] = useState('')
  const [showPriceList, setShowPriceList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editItem) {
      setForm({
        code: editItem.code ?? '',
        description: editItem.description,
        unit: editItem.unit,
        quantity: editItem.quantity.toString(),
        unit_price: editItem.unit_price.toString(),
        notes: editItem.notes ?? '',
      })
    }
  }, [editItem])

  const set = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const filteredPrices = priceList.filter((p) =>
    p.description.toLowerCase().includes(priceQuery.toLowerCase())
  )

  const applyPrice = (item: PriceListItem) => {
    setForm((prev) => ({
      ...prev,
      description: item.description,
      unit: item.unit,
      unit_price: item.unit_price.toString(),
    }))
    setShowPriceList(false)
    setPriceQuery('')
  }

  const total = (Number(form.quantity) || 0) * (Number(form.unit_price) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) return setError('La descripción es requerida')
    if (!form.quantity || Number(form.quantity) <= 0) return setError('La cantidad debe ser mayor a 0')
    setSaving(true)
    setError(null)
    try {
      const sort_order = editItem?.sort_order ?? Date.now()
      await onSave({
        budget_category_id: category.id,
        code: form.code.trim() || null,
        description: form.description.trim(),
        unit: form.unit,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price) || 0,
        sort_order,
        notes: form.notes.trim() || null,
      })
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-app-surface rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <div>
            <h2 className="text-sm font-semibold text-app-text">
              {editItem ? 'Editar subpartida' : 'Nueva subpartida'}
            </h2>
            <p className="text-xs text-app-muted mt-0.5">{category.code} — {category.name}</p>
          </div>
          <button onClick={onClose} className="text-app-subtle hover:text-app-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {/* Búsqueda en lista de precios */}
          <div className="relative">
            <label className="text-[10px] font-medium text-app-muted mb-1 block uppercase tracking-wide">
              Buscar en lista de precios (opcional)
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-subtle" />
              <input
                type="text"
                placeholder="Buscar precio de referencia..."
                value={priceQuery}
                onChange={(e) => { setPriceQuery(e.target.value); setShowPriceList(true) }}
                onFocus={() => setShowPriceList(true)}
                className="w-full pl-8 pr-3 py-2 border border-app-border rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-300"
              />
            </div>
            {showPriceList && priceQuery && (
              <div className="absolute z-10 w-full mt-1 bg-app-surface border border-app-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredPrices.length === 0 ? (
                  <p className="text-xs text-app-subtle p-3">Sin resultados</p>
                ) : (
                  filteredPrices.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPrice(p)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-app-border last:border-0"
                    >
                      <p className="text-xs font-medium text-app-text">{p.description}</p>
                      <p className="text-[10px] text-app-muted">{p.unit} · {formatRD(p.unit_price)}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-medium text-app-muted mb-1 block uppercase tracking-wide">Código</label>
              <input
                type="text"
                placeholder="3.1"
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                className="w-full px-2.5 py-2 border border-app-border rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-medium text-app-muted mb-1 block uppercase tracking-wide">Descripción *</label>
              <input
                type="text"
                placeholder="Descripción de la partida"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full px-2.5 py-2 border border-app-border rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-medium text-app-muted mb-1 block uppercase tracking-wide">Unidad</label>
              <select
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                className="w-full px-2.5 py-2 border border-app-border rounded-lg text-xs focus:ring-1 focus:ring-blue-500 bg-app-surface"
              >
                {MEASURE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
                <option value="Und">Unidad</option>
                <option value="Saco">Saco</option>
                <option value="QQ">Quintal</option>
                <option value="Global">Global</option>
                <option value="Punto">Punto</option>
                <option value="Mes">Mes</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-app-muted mb-1 block uppercase tracking-wide">Cantidad *</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                className="w-full px-2.5 py-2 border border-app-border rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-app-muted mb-1 block uppercase tracking-wide">Precio unit.</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={form.unit_price}
                onChange={(e) => set('unit_price', e.target.value)}
                className="w-full px-2.5 py-2 border border-app-border rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-blue-700 font-medium">Total subpartida</span>
            <span className="text-sm font-bold text-blue-800">{formatRD(total)}</span>
          </div>

          <div>
            <label className="text-[10px] font-medium text-app-muted mb-1 block uppercase tracking-wide">Notas</label>
            <input
              type="text"
              placeholder="Notas opcionales..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full px-2.5 py-2 border border-app-border rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editItem ? 'Guardar cambios' : 'Agregar subpartida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
