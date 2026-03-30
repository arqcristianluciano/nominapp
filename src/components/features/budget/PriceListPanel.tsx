import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import type { PriceListItem, PriceListCategory } from '@/types/database'
import { formatRD } from '@/utils/currency'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { MEASURE_UNITS } from '@/constants/measureUnits'

interface Props {
  projectId: string
  items: PriceListItem[]
  onAdd: (item: Omit<PriceListItem, 'id'>) => Promise<void>
  onUpdate: (id: string, changes: Partial<Omit<PriceListItem, 'id'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const CATEGORIES: { value: PriceListCategory; label: string; color: string }[] = [
  { value: 'material', label: 'Material', color: 'bg-blue-100 text-blue-700' },
  { value: 'labor', label: 'Mano de obra', color: 'bg-green-100 text-green-700' },
  { value: 'equipment', label: 'Equipo', color: 'bg-amber-100 text-amber-700' },
  { value: 'adjustment', label: 'Ajuste', color: 'bg-purple-100 text-purple-700' },
]

const EMPTY_FORM = {
  category: 'material' as PriceListCategory,
  code: '', description: '', unit: 'M2', unit_price: '',
}

interface InlineFormProps {
  projectId: string
  initial?: Partial<typeof EMPTY_FORM>
  onSave: (data: Omit<PriceListItem, 'id'>) => Promise<void>
  onCancel: () => void
}

function InlineForm({ projectId, initial, onSave, onCancel }: InlineFormProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    if (!form.description.trim()) return
    setSaving(true)
    try {
      await onSave({
        project_id: projectId,
        category: form.category,
        code: form.code.trim() || null,
        description: form.description.trim(),
        unit: form.unit,
        unit_price: Number(form.unit_price) || 0,
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
          type="text" placeholder="MAT-001" value={form.code}
          onChange={(e) => set('code', e.target.value)}
          className="w-full px-2 py-1 border border-app-border rounded text-xs"
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
          <option value="Und">Unidad</option>
          <option value="Saco">Saco</option>
          <option value="QQ">Quintal</option>
          <option value="Global">Global</option>
          <option value="Día">Día</option>
          <option value="Mes">Mes</option>
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

export default function PriceListPanel({ projectId, items, onAdd, onUpdate, onDelete }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<PriceListCategory | 'all'>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = filterCat === 'all' ? items : items.filter((i) => i.category === filterCat)

  const handleDelete = async (id: string) => {
    await onDelete(id)
    setDeleteId(null)
  }

  const getCatStyle = (cat: PriceListCategory) =>
    CATEGORIES.find((c) => c.value === cat)?.color ?? ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['all', ...CATEGORIES.map((c) => c.value)] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat as any)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterCat === cat
                  ? 'bg-gray-800 text-white'
                  : 'bg-app-chip text-app-muted hover:bg-app-hover-strong'
              }`}
            >
              {cat === 'all' ? 'Todos' : CATEGORIES.find((c) => c.value === cat)?.label}
              <span className="ml-1 text-[10px] opacity-70">
                ({cat === 'all' ? items.length : items.filter((i) => i.category === cat).length})
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo precio
        </button>
      </div>

      <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-app-bg border-b border-app-border">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Tipo</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Código</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Descripción</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-app-muted uppercase">Unidad</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-app-muted uppercase">Precio unit.</th>
              <th className="px-3 py-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {showAddForm && (
              <InlineForm
                projectId={projectId}
                onSave={async (data) => { await onAdd(data); setShowAddForm(false) }}
                onCancel={() => setShowAddForm(false)}
              />
            )}
            {filtered.length === 0 && !showAddForm && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-app-subtle">
                  No hay precios registrados. Agrega el primero con el botón de arriba.
                </td>
              </tr>
            )}
            {filtered.map((item) =>
              editId === item.id ? (
                <InlineForm
                  key={item.id}
                  projectId={projectId}
                  initial={{
                    category: item.category,
                    code: item.code ?? '',
                    description: item.description,
                    unit: item.unit,
                    unit_price: item.unit_price.toString(),
                  }}
                  onSave={async (data) => { await onUpdate(item.id, data); setEditId(null) }}
                  onCancel={() => setEditId(null)}
                />
              ) : (
                <tr key={item.id} className="border-b border-app-border hover:bg-app-hover">
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getCatStyle(item.category)}`}>
                      {CATEGORIES.find((c) => c.value === item.category)?.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-app-subtle font-mono">{item.code ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-app-text">{item.description}</td>
                  <td className="px-3 py-2 text-xs text-app-muted">{item.unit}</td>
                  <td className="px-3 py-2 text-xs font-medium text-app-text text-right">{formatRD(item.unit_price)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditId(item.id)}
                        className="p-1 text-app-subtle hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="p-1 text-app-subtle hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar ítem de precios"
        message="¿Eliminar este ítem de la lista de precios? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
