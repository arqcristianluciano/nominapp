import { useEffect, useState } from 'react'
import type { BudgetCategory, BudgetItem, Supplier } from '@/types/database'
import { budgetItemService } from '@/services/budgetItemService'

interface Props {
  suppliers: Supplier[]
  budgetCategories?: BudgetCategory[]
  onSubmit: (invoice: {
    supplier_id: string
    description: string
    invoice_reference?: string
    amount: number
    budget_category_id?: string | null
    budget_item_id?: string | null
  }) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export function AddMaterialForm({ suppliers, budgetCategories = [], onSubmit, onCancel, saving }: Props) {
  const [supplierId, setSupplierId] = useState('')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [budgetItemId, setBudgetItemId] = useState('')
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])

  // Cargar las partidas del capítulo seleccionado para permitir imputar la
  // factura a una partida concreta del presupuesto.
  useEffect(() => {
    let cancelled = false
    const promise = budgetCategoryId
      ? budgetItemService.getByCategoryId(budgetCategoryId)
      : Promise.resolve([] as BudgetItem[])
    promise
      .then((data) => {
        if (!cancelled) setBudgetItems(data)
      })
      .catch(() => {
        if (!cancelled) setBudgetItems([])
      })
    return () => {
      cancelled = true
    }
  }, [budgetCategoryId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId || !description || !amount) return
    await onSubmit({
      supplier_id: supplierId,
      description: description.toUpperCase(),
      invoice_reference: reference || undefined,
      amount: parseFloat(amount),
      budget_category_id: budgetCategoryId || null,
      budget_item_id: budgetItemId || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Proveedor *</label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          required
          className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar proveedor...</option>
          {suppliers
            .filter((s) => s.is_active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Descripción *</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: CEMENTO GRIS, ARENA PROCESADA"
          required
          className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Referencia de factura</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="VER FACTURA PAG. 2"
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Monto RD$ *</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {budgetCategories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-app-muted mb-1">Capítulo imputado (opcional)</label>
            <select
              value={budgetCategoryId}
              onChange={(e) => {
                setBudgetCategoryId(e.target.value)
                setBudgetItemId('')
              }}
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sin imputación específica —</option>
              {budgetCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-app-muted mb-1">Partida (opcional)</label>
            <select
              value={budgetItemId}
              onChange={(e) => setBudgetItemId(e.target.value)}
              disabled={!budgetCategoryId}
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">— Sin partida específica —</option>
              {budgetItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.code ? `[${it.code}] ` : ''}
                  {it.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !supplierId || !description || !amount}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Agregar factura'}
        </button>
      </div>
    </form>
  )
}
