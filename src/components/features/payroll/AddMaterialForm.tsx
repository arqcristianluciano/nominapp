import { useState } from 'react'
import type { BudgetCategory, MaterialInvoice, Supplier } from '@/types/database'

interface Props {
  suppliers: Supplier[]
  budgetCategories?: BudgetCategory[]
  onSubmit: (invoice: {
    supplier_id: string
    description: string
    invoice_reference?: string
    amount: number
    budget_category_id?: string | null
  }) => Promise<void>
  onCancel: () => void
  saving: boolean
  /** Si se pasa, el formulario opera en modo edición (campos pre-cargados). */
  initialInvoice?: MaterialInvoice
  /** Texto del botón de envío (por defecto "Agregar factura"). */
  submitLabel?: string
}

export function AddMaterialForm({
  suppliers,
  budgetCategories = [],
  onSubmit,
  onCancel,
  saving,
  initialInvoice,
  submitLabel,
}: Props) {
  const [supplierId, setSupplierId] = useState(initialInvoice?.supplier_id ?? '')
  const [description, setDescription] = useState(initialInvoice?.description ?? '')
  const [reference, setReference] = useState(initialInvoice?.invoice_reference ?? '')
  const [amount, setAmount] = useState(initialInvoice ? String(initialInvoice.amount) : '')
  const [budgetCategoryId, setBudgetCategoryId] = useState(initialInvoice?.budget_category_id ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId || !description || !amount) return
    await onSubmit({
      supplier_id: supplierId,
      description: description.toUpperCase(),
      invoice_reference: reference || undefined,
      amount: parseFloat(amount),
      budget_category_id: budgetCategoryId || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {initialInvoice?.creator_name && (
        <p className="text-xs text-app-subtle">Agregado por {initialInvoice.creator_name}</p>
      )}
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
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Capítulo imputado (opcional)</label>
          <select
            value={budgetCategoryId}
            onChange={(e) => setBudgetCategoryId(e.target.value)}
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
          {saving ? 'Guardando...' : (submitLabel ?? 'Agregar factura')}
        </button>
      </div>
    </form>
  )
}
