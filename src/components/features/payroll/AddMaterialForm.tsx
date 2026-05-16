import { useState } from 'react'
import { UserPlus, X, Paperclip } from 'lucide-react'
import type { Supplier } from '@/types/database'
import { supplierService } from '@/services/supplierService'

const NEW_SUPPLIER_VALUE = '__NEW__'

interface Props {
  suppliers: Supplier[]
  onSubmit: (invoice: {
    supplier_id: string
    description: string
    invoice_reference?: string
    amount: number
    attachment_path?: string | null
  }) => Promise<void>
  onCancel: () => void
  saving: boolean
  onSupplierCreated?: (supplier: Supplier) => void
}

export function AddMaterialForm({ suppliers, onSubmit, onCancel, saving, onSupplierCreated }: Props) {
  const [supplierId, setSupplierId] = useState('')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [attachmentName, setAttachmentName] = useState<string | null>(null)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRnc, setNewRnc] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  function handleSelectChange(value: string) {
    if (value === NEW_SUPPLIER_VALUE) {
      setShowNewForm(true)
      setSupplierId('')
    } else {
      setShowNewForm(false)
      setSupplierId(value)
    }
  }

  async function handleCreateSupplier() {
    if (!newName.trim()) return
    setSavingNew(true)
    try {
      const created = await supplierService.create({
        name: newName.trim(),
        rnc: newRnc.trim() || undefined,
      })
      onSupplierCreated?.(created)
      setSupplierId(created.id)
      setShowNewForm(false)
      setNewName('')
      setNewRnc('')
    } finally {
      setSavingNew(false)
    }
  }

  function cancelNewForm() {
    setShowNewForm(false)
    setNewName('')
    setNewRnc('')
  }

  function handleFile(file: File | null) {
    setAttachmentName(file ? file.name : null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (showNewForm || !supplierId || !description || !amount) return
    await onSubmit({
      supplier_id: supplierId,
      description: description.toUpperCase(),
      invoice_reference: reference || undefined,
      amount: parseFloat(amount),
      attachment_path: attachmentName,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Proveedor *</label>
        <select
          value={showNewForm ? NEW_SUPPLIER_VALUE : supplierId}
          onChange={(e) => handleSelectChange(e.target.value)}
          required={!showNewForm}
          className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar proveedor...</option>
          {suppliers.filter(s => s.is_active).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
          <option value={NEW_SUPPLIER_VALUE}>＋ Crear nuevo proveedor</option>
        </select>

        {showNewForm && (
          <div className="mt-2 p-3 border border-blue-500/40 bg-blue-500/5 rounded-lg space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-400 flex items-center gap-1">
                <UserPlus size={12} /> Nuevo proveedor
              </span>
              <button type="button" onClick={cancelNewForm} className="text-app-muted hover:text-app-text">
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre *"
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newRnc}
              onChange={(e) => setNewRnc(e.target.value)}
              placeholder="RNC (opcional)"
              className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleCreateSupplier}
              disabled={savingNew || !newName.trim()}
              className="w-full py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingNew ? 'Creando...' : 'Crear y seleccionar'}
            </button>
          </div>
        )}
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

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Factura escaneada</label>
        <label className="flex items-center gap-2 px-3 py-2 bg-app-input-bg text-app-text border border-app-border border-dashed rounded-lg text-sm cursor-pointer hover:bg-app-hover">
          <Paperclip className="w-3.5 h-3.5 text-app-subtle" />
          <span className="text-app-muted text-xs">
            {attachmentName ?? 'Adjuntar PDF o imagen de la factura'}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {attachmentName && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setAttachmentName(null) }}
              className="ml-auto text-app-subtle hover:text-red-500"
            >
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || showNewForm || !supplierId || !description || !amount}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Agregar factura'}
        </button>
      </div>
    </form>
  )
}
