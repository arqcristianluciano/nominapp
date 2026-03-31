import { useState } from 'react'
import { Plus, Pencil, Trash2, Copy, Wand2 } from 'lucide-react'
import type { PriceListItem, PriceListCategory } from '@/types/database'
import { formatRD } from '@/utils/currency'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import PriceListInlineForm from './PriceListInlineForm'
import { generatePriceCode } from '@/utils/priceCodeGenerator'

const CATEGORIES: { value: PriceListCategory; label: string; color: string }[] = [
  { value: 'material',   label: 'Material',      color: 'bg-blue-100 text-blue-700' },
  { value: 'labor',      label: 'Mano de obra',  color: 'bg-green-100 text-green-700' },
  { value: 'equipment',  label: 'Equipo',        color: 'bg-amber-100 text-amber-700' },
  { value: 'adjustment', label: 'Ajuste',        color: 'bg-purple-100 text-purple-700' },
]

interface Props {
  projectId: string
  items: PriceListItem[]
  onAdd: (item: Omit<PriceListItem, 'id'>) => Promise<void>
  onUpdate: (id: string, changes: Partial<Omit<PriceListItem, 'id'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReplicate?: () => void
}

export default function PriceListPanel({ projectId, items, onAdd, onUpdate, onDelete, onReplicate }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<PriceListCategory | 'all'>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)

  const filtered = filterCat === 'all' ? items : items.filter((i) => i.category === filterCat)
  const getCatStyle = (cat: PriceListCategory) => CATEGORIES.find((c) => c.value === cat)?.color ?? ''
  const itemsWithoutCode = items.filter((i) => !i.code)

  const handleAssignCodes = async () => {
    if (!itemsWithoutCode.length) return
    setAssigning(true)
    try {
      // Build a running list to avoid duplicate codes within the same batch
      const assigned = [...items]
      for (const item of itemsWithoutCode) {
        const code = generatePriceCode(item.category, assigned)
        await onUpdate(item.id, { code })
        // Mark as assigned in the running list so the next iteration sees it
        const idx = assigned.findIndex((a) => a.id === item.id)
        if (idx !== -1) assigned[idx] = { ...assigned[idx], code }
      }
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', ...CATEGORIES.map((c) => c.value)] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat as PriceListCategory | 'all')}
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

        <div className="flex items-center gap-2 shrink-0">
          {itemsWithoutCode.length > 0 && (
            <button
              onClick={handleAssignCodes}
              disabled={assigning}
              title={`Asignar códigos a ${itemsWithoutCode.length} ítem(s) sin código`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {assigning ? 'Asignando…' : `Asignar códigos (${itemsWithoutCode.length})`}
            </button>
          )}
          {onReplicate && items.length > 0 && (
            <button
              onClick={onReplicate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-app-muted border border-app-border rounded-lg hover:bg-app-hover"
            >
              <Copy className="w-3.5 h-3.5" /> Replicar
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo precio
          </button>
        </div>
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
              <PriceListInlineForm
                projectId={projectId}
                existingItems={items}
                isNew
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
                <PriceListInlineForm
                  key={item.id}
                  projectId={projectId}
                  existingItems={items}
                  initial={{
                    category:    item.category,
                    code:        item.code ?? '',
                    description: item.description,
                    unit:        item.unit,
                    unit_price:  item.unit_price.toString(),
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
        onConfirm={() => deleteId && onDelete(deleteId).then(() => setDeleteId(null))}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
