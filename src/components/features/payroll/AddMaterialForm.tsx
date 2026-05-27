import { useState } from 'react'
import { Plus, Trash2, UserPlus, X, Paperclip } from 'lucide-react'
import type { BudgetCategory, MaterialInvoice, Supplier } from '@/types/database'
import { supplierService } from '@/services/supplierService'
import { payrollService } from '@/services/payrollService'

const NEW_SUPPLIER_VALUE = '__NEW__'

export interface NewMaterialInvoice {
  supplier_id: string
  description: string
  invoice_reference?: string | null
  amount: number
  budget_category_id?: string | null
  attachment_path?: string | null
}

interface Props {
  suppliers: Supplier[]
  budgetCategories?: BudgetCategory[]
  periodId: string
  editInvoice?: MaterialInvoice | null
  onSubmit: (invoices: NewMaterialInvoice[]) => Promise<void>
  onUpdate?: (
    id: string,
    updates: {
      supplier_id: string
      description: string
      invoice_reference?: string | null
      amount: number
      budget_category_id?: string | null
    },
  ) => Promise<void>
  onCancel: () => void
  saving: boolean
  onSupplierCreated?: (supplier: Supplier) => void
}

interface LineItem {
  description: string
  amount: string
  budget_category_id: string
}

const EMPTY_LINE: LineItem = { description: '', amount: '', budget_category_id: '' }

const inputClass =
  'w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function AddMaterialForm({
  suppliers,
  budgetCategories = [],
  periodId,
  editInvoice,
  onSubmit,
  onUpdate,
  onCancel,
  saving,
  onSupplierCreated,
}: Props) {
  const isEdit = !!editInvoice

  const [supplierId, setSupplierId] = useState(editInvoice?.supplier_id ?? '')
  const [reference, setReference] = useState(editInvoice?.invoice_reference ?? '')
  const [lines, setLines] = useState<LineItem[]>(
    editInvoice
      ? [
          {
            description: editInvoice.description,
            amount: String(editInvoice.amount),
            budget_category_id: editInvoice.budget_category_id ?? '',
          },
        ]
      : [{ ...EMPTY_LINE }],
  )

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRnc, setNewRnc] = useState('')
  const [savingSupplier, setSavingSupplier] = useState(false)

  function handleSupplierChange(value: string) {
    if (value === NEW_SUPPLIER_VALUE) {
      setShowNewSupplier(true)
      setSupplierId('')
    } else {
      setShowNewSupplier(false)
      setSupplierId(value)
    }
  }

  async function handleCreateSupplier() {
    if (savingSupplier || !newName.trim()) return
    setSavingSupplier(true)
    try {
      const created = await supplierService.create({
        name: newName.trim().toUpperCase(),
        rnc: newRnc.trim() || undefined,
      })
      onSupplierCreated?.(created)
      setSupplierId(created.id)
      setShowNewSupplier(false)
      setNewName('')
      setNewRnc('')
    } catch (err) {
      console.warn('[AddMaterialForm] handleCreateSupplier failed', err)
    } finally {
      setSavingSupplier(false)
    }
  }

  function setLine(index: number, key: keyof LineItem, value: string) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }])
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  const validLines = lines.filter((l) => l.description.trim() && Number(l.amount) > 0)
  const totalAmount = validLines.reduce((sum, l) => sum + Number(l.amount), 0)
  const canSubmit = !!supplierId && validLines.length > 0 && !showNewSupplier

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || saving || uploading) return

    if (isEdit && editInvoice && onUpdate) {
      const line = lines[0]
      await onUpdate(editInvoice.id, {
        supplier_id: supplierId,
        description: line.description.trim().toUpperCase(),
        invoice_reference: reference.trim() || null,
        amount: Number(line.amount),
        budget_category_id: line.budget_category_id || null,
      })
      return
    }

    let attachmentPath: string | null = null
    if (file) {
      setUploading(true)
      try {
        attachmentPath = await payrollService.uploadInvoiceFile(file, periodId)
      } catch (err) {
        console.warn('[AddMaterialForm] uploadInvoiceFile failed', err)
      } finally {
        setUploading(false)
      }
    }

    const reference_value = reference.trim() || null
    const invoices: NewMaterialInvoice[] = validLines.map((l) => ({
      supplier_id: supplierId,
      description: l.description.trim().toUpperCase(),
      invoice_reference: reference_value,
      amount: Number(l.amount),
      budget_category_id: l.budget_category_id || null,
      attachment_path: attachmentPath,
    }))
    await onSubmit(invoices)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Proveedor *</label>
        <select
          value={showNewSupplier ? NEW_SUPPLIER_VALUE : supplierId}
          onChange={(e) => handleSupplierChange(e.target.value)}
          required={!showNewSupplier}
          className={inputClass}
        >
          <option value="">Seleccionar proveedor...</option>
          {suppliers
            .filter((s) => s.is_active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          <option value={NEW_SUPPLIER_VALUE}>＋ Agregar proveedor</option>
        </select>

        {showNewSupplier && (
          <div className="mt-2 p-3 border border-blue-500/40 bg-blue-500/5 rounded-lg space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-400 flex items-center gap-1">
                <UserPlus size={12} /> Nuevo proveedor
              </span>
              <button
                type="button"
                onClick={() => setShowNewSupplier(false)}
                className="text-app-muted hover:text-app-text"
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre *"
              className={inputClass}
            />
            <input
              type="text"
              value={newRnc}
              onChange={(e) => setNewRnc(e.target.value)}
              placeholder="RNC / Cédula (opcional)"
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleCreateSupplier}
              disabled={savingSupplier || !newName.trim()}
              aria-busy={savingSupplier}
              className="w-full py-2 sm:py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingSupplier ? 'Creando...' : 'Crear y seleccionar'}
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Referencia de factura</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="VER FACTURA PAG. 2"
          className={inputClass}
        />
      </div>

      {/* Ítems de la factura */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-app-muted">{isEdit ? 'Ítem' : 'Ítems *'}</label>
        {lines.map((line, i) => (
          <div key={i} className="p-3 border border-app-border rounded-lg space-y-2 bg-app-bg/40">
            <div className="flex items-start gap-2">
              <input
                type="text"
                value={line.description}
                onChange={(e) => setLine(i, 'description', e.target.value)}
                placeholder="Descripción (ej: CEMENTO GRIS)"
                className={inputClass}
              />
              {!isEdit && lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  aria-label="Quitar ítem"
                  className="shrink-0 mt-1 text-app-subtle hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                value={line.amount}
                onChange={(e) => setLine(i, 'amount', e.target.value)}
                placeholder="Monto RD$ *"
                className={inputClass}
              />
              {budgetCategories.length > 0 && (
                <select
                  value={line.budget_category_id}
                  onChange={(e) => setLine(i, 'budget_category_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">— Capítulo (opcional) —</option>
                  {budgetCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
        {!isEdit && (
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar ítem
          </button>
        )}
      </div>

      {!isEdit && (
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Comprobante (opcional)</label>
          <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-app-border rounded-lg text-sm text-app-muted cursor-pointer hover:bg-app-hover">
            <Paperclip className="w-4 h-4" />
            <span className="truncate">{file ? file.name : 'Adjuntar imagen o PDF de la factura'}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>
      )}

      {totalAmount > 0 && (
        <div className="bg-app-bg rounded-lg px-4 py-2 flex justify-between">
          <span className="text-sm text-app-muted">Total factura</span>
          <span className="text-sm font-semibold text-app-text">
            RD${totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || uploading || !canSubmit}
          aria-busy={saving || uploading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Subiendo...' : saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar factura'}
        </button>
      </div>
    </form>
  )
}
