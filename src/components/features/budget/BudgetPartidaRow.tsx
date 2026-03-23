import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import type { BudgetCategory, BudgetItem, PriceListItem } from '@/types/database'
import { formatRD } from '@/utils/currency'
import BudgetItemForm from './BudgetItemForm'

interface Props {
  category: BudgetCategory
  items: BudgetItem[]
  spent: number
  priceList: PriceListItem[]
  onAddItem: (data: Omit<BudgetItem, 'id'>) => Promise<void>
  onUpdateItem: (id: string, changes: Partial<Omit<BudgetItem, 'id'>>) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onEditBudgetAmount: () => void
}

export default function BudgetPartidaRow({
  category, items, spent, priceList,
  onAddItem, onUpdateItem, onDeleteItem, onEditBudgetAmount,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)

  const hasItems = items.length > 0
  const total = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)
  const budgeted = hasItems ? total : category.budgeted_amount
  const difference = budgeted - spent

  const handleSave = async (data: Omit<BudgetItem, 'id'>) => {
    if (editItem) {
      await onUpdateItem(editItem.id, data)
    } else {
      await onAddItem(data)
    }
    setEditItem(null)
    setShowForm(false)
    setExpanded(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta subpartida?')) return
    await onDeleteItem(id)
  }

  return (
    <>
      {/* Fila de partida */}
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-2.5 w-8">
          {hasItems
            ? expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            : <span className="w-3.5 h-3.5 block" />
          }
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-5">{category.sort_order}</span>
            <span className="text-xs font-semibold text-gray-900">{category.name}</span>
            {hasItems && (
              <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                {items.length} subpartidas
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-700 text-right">{formatRD(spent)}</td>
        <td className="px-3 py-2.5 text-right">
          {hasItems ? (
            <span className="text-xs font-semibold text-gray-900">{formatRD(budgeted)}</span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onEditBudgetAmount() }}
              className="text-xs text-gray-600 hover:text-blue-600 cursor-pointer"
              title="Click para editar monto"
            >
              {formatRD(budgeted)}
            </button>
          )}
        </td>
        <td className={`px-3 py-2.5 text-xs font-semibold text-right ${difference < 0 ? 'text-red-600' : difference > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          {formatRD(difference)}
        </td>
        <td className="px-3 py-2.5 text-right">
          <button
            onClick={(e) => { e.stopPropagation(); setShowForm(true); setEditItem(null) }}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Agregar subpartida"
          >
            <Plus className="w-3 h-3" /> Sub
          </button>
        </td>
      </tr>

      {/* Filas de subpartidas */}
      {expanded && items.map((item) => {
        const itemTotal = item.quantity * item.unit_price
        return (
          <tr key={item.id} className="border-b border-gray-50 bg-gray-50/50 hover:bg-blue-50/20">
            <td className="px-3 py-2" />
            <td className="px-3 py-2 pl-10">
              <div className="flex items-center gap-1.5">
                {item.code && <span className="text-[10px] text-gray-400 font-mono w-8 shrink-0">{item.code}</span>}
                <span className="text-xs text-gray-700">{item.description}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 pl-9">
                <span className="text-[10px] text-gray-400">{item.quantity} {item.unit} × {formatRD(item.unit_price)}</span>
              </div>
            </td>
            <td className="px-3 py-2 text-xs text-gray-400 text-right">—</td>
            <td className="px-3 py-2 text-xs font-medium text-gray-700 text-right">{formatRD(itemTotal)}</td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => { setEditItem(item); setShowForm(true) }}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </td>
          </tr>
        )
      })}

      {/* Formulario modal */}
      {showForm && (
        <BudgetItemForm
          category={category}
          priceList={priceList}
          editItem={editItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}
    </>
  )
}
