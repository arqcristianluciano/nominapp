import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import type { PriceListItem, PriceListCategory } from '@/types/database'
import { MEASURE_UNITS } from '@/constants/measureUnits'
import { generatePriceCode } from '@/utils/priceCodeGenerator'

const CATEGORIES: { value: PriceListCategory; label: string }[] = [
  { value: 'material',   label: 'Material' },
  { value: 'labor',      label: 'Mano de obra' },
  { value: 'equipment',  label: 'Equipo' },
  { value: 'adjustment', label: 'Ajuste' },
]

const EXTRA_UNITS = ['Und', 'Saco', 'QQ', 'Global', 'Día', 'Mes']

interface Props {
  projectId: string
  existingItems: PriceListItem[]
  isNew?: boolean
  initial?: Partial<{
    category: PriceListCategory
    code: string
    description: string
    unit: string
    unit_price: string
  }>
  onSave: (data: Omit<PriceListItem, 'id'>) => Promise<void>
  onCancel: () => void
}

export default function PriceListInlineForm({
  projectId,
  existingItems,
  isNew = false,
  initial,
  onSave,
  onCancel,
}: Props) {
  const [form, setForm] = useState({
    category: (initial?.category ?? 'material') as PriceListCategory,
    code:        initial?.code        ?? '',
    description: initial?.description ?? '',
    unit:        initial?.unit        ?? 'M2',
    unit_price:  initial?.unit_price  ?? '',
  })
  const [saving, setSaving] = useState(false)

  // Auto-generar código solo al crear, y re-generar si cambia categoría sin código manual
  useEffect(() => {
    if (!isNew) return
    setForm((prev) => ({ ...prev, code: generatePriceCode(prev.category, existingItems) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew])

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val }
      if (isNew && key === 'category') {
        next.code = generatePriceCode(val as PriceListCategory, existingItems)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!form.description.trim()) return
    setSaving(true)
    try {
      await onSave({
        project_id: projectId,
        category:   form.category,
        code:       form.code.trim() || null,
        description: form.description.trim(),
        unit:        form.unit,
        unit_price:  Number(form.unit_price) || 0,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="bg-blue-50/40 border-b border-blue-100">
      <td className="px-3 py-1.5">
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value as PriceListCategory)}
          className="w-full px-2 py-1 border border-app-border rounded text-xs bg-app-surface"
        >
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-1.5">
        <input
          type="text"
          value={form.code}
          onChange={(e) => set('code', e.target.value)}
          className="w-full px-2 py-1 border border-app-border rounded text-xs font-mono"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          type="text" placeholder="Descripción del ítem *" value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full px-2 py-1 border border-app-border rounded text-xs"
          autoFocus
        />
      </td>
      <td className="px-3 py-1.5">
        <select
          value={form.unit}
          onChange={(e) => set('unit', e.target.value)}
          className="w-full px-2 py-1 border border-app-border rounded text-xs bg-app-surface"
        >
          {MEASURE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          {EXTRA_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td className="px-3 py-1.5">
        <input
          type="number" step="any" min="0" placeholder="0.00" value={form.unit_price}
          onChange={(e) => set('unit_price', e.target.value)}
          className="w-full px-2 py-1 border border-app-border rounded text-xs text-right"
        />
      </td>
      <td className="px-3 py-1.5">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={handleSave}
            disabled={saving || !form.description.trim()}
            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCancel} className="p-1 text-app-subtle hover:bg-app-hover-strong rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}
