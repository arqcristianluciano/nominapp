import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import type { BudgetCategory, BudgetItem, PriceListItem } from '@/types/database'
import { formatRD } from '@/utils/currency'
import { budgetItemDisplayCode, nextBudgetItemCode } from '@/utils/budgetItemCode'
import { budgetItemService } from '@/services/budgetItemService'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import BudgetItemForm from './BudgetItemForm'

interface Props {
  category: BudgetCategory
  items: BudgetItem[]
  spent: number
  /** Gastado imputado directamente a cada subpartida (budget_item_id → monto). */
  spentByItem: Record<string, number>
  priceList: PriceListItem[]
  onAddItem: (data: Omit<BudgetItem, 'id'>) => Promise<void>
  onUpdateItem: (id: string, changes: Partial<Omit<BudgetItem, 'id'>>) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onEditBudgetAmount: () => void
  onDeleteCategory?: () => Promise<void>
}

export default function BudgetPartidaRow({
  category,
  items,
  spent,
  spentByItem,
  priceList,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onEditBudgetAmount,
  onDeleteCategory,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  // Gasto/avances asociados a la subpartida que se va a borrar (para avisar).
  const [deleteRefs, setDeleteRefs] = useState<{ gastoLinks: number; progreso: number } | null>(null)
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(false)

  // Al pedir borrar una subpartida, primero consulta cuánto gasto y cuántos
  // avances tiene, para advertir que se perderán/quedarán sin partida.
  const requestDeleteItem = async (id: string) => {
    setDeleteId(id)
    setDeleteRefs(null)
    try {
      const refs = await budgetItemService.countReferences(id)
      setDeleteRefs({ gastoLinks: refs.gastoLinks, progreso: refs.progreso })
    } catch {
      // Si la consulta falla, se muestra el aviso genérico (sin desglose).
    }
  }

  const deleteMessage = (() => {
    if (!deleteRefs || deleteRefs.gastoLinks + deleteRefs.progreso === 0) {
      return '¿Eliminar esta subpartida? Esta acción no se puede deshacer.'
    }
    const partes: string[] = []
    if (deleteRefs.gastoLinks > 0) {
      partes.push(
        `${deleteRefs.gastoLinks} registro(s) de gasto quedarán SIN partida (el "Gastado" de este capítulo bajará)`,
      )
    }
    if (deleteRefs.progreso > 0) {
      partes.push(`${deleteRefs.progreso} avance(s) de obra se BORRARÁN para siempre`)
    }
    return `Atención: esta subpartida tiene movimientos. Si la eliminas, ${partes.join(' y ')}. ¿Eliminar de todos modos?`
  })()

  const hasItems = items.length > 0
  const total = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)
  const budgeted = hasItems ? total : category.budgeted_amount
  const difference = budgeted - spent
  // Una partida es eliminable cuando está vacía: sin subpartidas, sin monto y sin gasto.
  const isEmpty = !hasItems && Number(category.budgeted_amount) === 0 && spent === 0
  const canDeleteCategory = isEmpty && !!onDeleteCategory

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
    await onDeleteItem(id)
    setDeleteId(null)
    setDeleteRefs(null)
  }

  const handleDeleteCategory = async () => {
    if (!onDeleteCategory) return
    setDeletingCategory(true)
    try {
      await onDeleteCategory()
    } finally {
      setDeletingCategory(false)
      setConfirmDeleteCategory(false)
    }
  }

  return (
    <>
      {/* Fila de partida */}
      <tr
        className={`border-b border-app-border hover:bg-app-hover cursor-pointer ${isEmpty ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-2.5 w-8">
          {hasItems ? (
            expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-app-subtle" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-app-subtle" />
            )
          ) : (
            <span className="w-3.5 h-3.5 block" />
          )}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-app-subtle w-5">{category.sort_order}</span>
            <span className="text-xs font-semibold text-app-text">{category.name}</span>
            {hasItems && (
              <span className="text-[10px] text-app-subtle bg-app-chip rounded px-1.5 py-0.5">
                {items.length} subpartidas
              </span>
            )}
            {isEmpty && (
              <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 rounded px-1.5 py-0.5">
                vacía
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-app-muted text-right">{formatRD(spent)}</td>
        <td className="px-3 py-2.5 text-right">
          {hasItems ? (
            <span className="text-xs font-semibold text-app-text">{formatRD(budgeted)}</span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEditBudgetAmount()
              }}
              className="text-xs text-app-muted hover:text-blue-600 cursor-pointer"
              title="Click para editar monto"
            >
              {formatRD(budgeted)}
            </button>
          )}
        </td>
        <td
          className={`px-3 py-2.5 text-xs font-semibold text-right ${difference < 0 ? 'text-red-600' : difference > 0 ? 'text-green-600' : 'text-app-subtle'}`}
        >
          {formatRD(difference)}
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowForm(true)
                setEditItem(null)
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Agregar subpartida"
            >
              <Plus className="w-3 h-3" /> Sub
            </button>
            {canDeleteCategory && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDeleteCategory(true)
                }}
                className="p-1 text-app-subtle hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Eliminar partida vacía"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Filas de subpartidas */}
      {expanded &&
        items.map((item, idx) => {
          const itemTotal = item.quantity * item.unit_price
          const itemSpent = spentByItem[item.id] ?? 0
          const itemDifference = itemTotal - itemSpent
          const displayCode = budgetItemDisplayCode(category, item, idx)
          return (
            <tr key={item.id} className="border-b border-app-border bg-app-bg/50 hover:bg-blue-50/20">
              <td className="px-3 py-2" />
              <td className="px-3 py-2 pl-10">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-app-subtle font-mono w-8 shrink-0">{displayCode}</span>
                  <span className="text-xs text-app-muted">{item.description}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 pl-9">
                  <span className="text-[10px] text-app-subtle">
                    {item.quantity} {item.unit} × {formatRD(item.unit_price)}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 text-xs text-right">
                {itemSpent !== 0 ? (
                  <span className="text-app-muted">{formatRD(itemSpent)}</span>
                ) : (
                  <span className="text-app-subtle">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs font-medium text-app-muted text-right">{formatRD(itemTotal)}</td>
              <td
                className={`px-3 py-2 text-xs text-right ${
                  itemSpent === 0 ? '' : itemDifference < 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {itemSpent !== 0 ? formatRD(itemDifference) : ''}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => {
                      setEditItem(item)
                      setShowForm(true)
                    }}
                    className="p-1 text-app-subtle hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => requestDeleteItem(item.id)}
                    className="p-1 text-app-subtle hover:text-red-600 hover:bg-red-50 rounded"
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
          defaultCode={nextBudgetItemCode(category, items)}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditItem(null)
          }}
        />
      )}

      {deleteId !== null && (
        <tr>
          <td colSpan={6}>
            <ConfirmModal
              open={!!deleteId}
              title="Eliminar subpartida"
              message={deleteMessage}
              confirmLabel="Eliminar"
              variant={deleteRefs && deleteRefs.gastoLinks + deleteRefs.progreso > 0 ? 'danger' : undefined}
              onConfirm={() => deleteId && handleDelete(deleteId)}
              onCancel={() => {
                setDeleteId(null)
                setDeleteRefs(null)
              }}
            />
          </td>
        </tr>
      )}

      {confirmDeleteCategory && (
        <tr>
          <td colSpan={6}>
            <ConfirmModal
              open={confirmDeleteCategory}
              title="Eliminar partida vacía"
              message={`¿Eliminar la partida "${category.name}"? Está vacía (sin subpartidas, monto ni gasto) y esta acción no se puede deshacer.`}
              confirmLabel={deletingCategory ? 'Eliminando…' : 'Eliminar'}
              onConfirm={handleDeleteCategory}
              onCancel={() => setConfirmDeleteCategory(false)}
            />
          </td>
        </tr>
      )}
    </>
  )
}
