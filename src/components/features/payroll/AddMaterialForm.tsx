import { useState } from 'react'
import { UserPlus, X, Paperclip, Plus } from 'lucide-react'
import type { Supplier, PriceListItem } from '@/types/database'
import { supplierService } from '@/services/supplierService'
import { payrollService } from '@/services/payrollService'
import { isDemoMode } from '@/lib/supabase'
import { getErrorMessage } from '@/utils/errors'
import { formatRD } from '@/utils/currency'
import { MaterialInvoiceLineRow, type MaterialLine } from './MaterialInvoiceLineRow'

const NEW_SUPPLIER_VALUE = '__NEW__'

export interface MaterialInvoicePayload {
  supplier_id: string
  description: string
  invoice_reference?: string
  amount: number
  attachment_path?: string | null
}

interface Props {
  suppliers: Supplier[]
  priceListMaterials?: PriceListItem[]
  periodId?: string
  onSubmit: (invoices: MaterialInvoicePayload[]) => Promise<void>
  onCancel: () => void
  saving: boolean
  onSupplierCreated?: (supplier: Supplier) => void
}

export function AddMaterialForm({
  suppliers,
  priceListMaterials = [],
  periodId,
  onSubmit,
  onCancel,
  saving,
  onSupplierCreated,
}: Props) {
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<MaterialLine[]>([{ description: '', amount: '' }])
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  function updateLine(idx: number, line: MaterialLine) {
    setLines((prev) => prev.map((l, i) => (i === idx ? line : l)))
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  function addLine() {
    setLines((prev) => [...prev, { description: '', amount: '' }])
  }

  const validLines = lines.filter((l) => l.description.trim() && parseFloat(l.amount) > 0)
  const total = validLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)

  async function uploadAttachment(): Promise<string | null> {
    if (!attachmentFile) return null
    if (isDemoMode || !periodId) {
      // En demo o sin period_id válido guardamos solo el nombre del archivo.
      return attachmentFile.name
    }
    return payrollService.uploadInvoiceFile(attachmentFile, periodId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (showNewForm || !supplierId || validLines.length === 0) return
    setError(null)
    try {
      const attachment_path = await uploadAttachment()
      const invoices: MaterialInvoicePayload[] = validLines.map((line) => ({
        supplier_id: supplierId,
        description: line.description.trim().toUpperCase(),
        invoice_reference: reference || undefined,
        amount: parseFloat(line.amount),
        attachment_path,
      }))
      await onSubmit(invoices)
    } catch (e) {
      setError(getErrorMessage(e))
    }
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
          {suppliers.filter((s) => s.is_active).map((s) => (
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
        <label className="block text-xs font-medium text-app-muted mb-1">Referencia de factura</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Nº factura o nota de la factura"
          className="w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-app-muted">Materiales de la factura *</label>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-3 h-3" /> Agregar otro material
          </button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {lines.map((line, idx) => (
            <MaterialInvoiceLineRow
              key={idx}
              line={line}
              priceListMaterials={priceListMaterials}
              onChange={(next) => updateLine(idx, next)}
              onRemove={() => removeLine(idx)}
              canRemove={lines.length > 1}
            />
          ))}
        </div>
        <div className="flex justify-between items-center mt-2 px-2 py-1 bg-app-bg rounded text-xs">
          <span className="text-app-muted">Total factura</span>
          <span className="font-semibold text-app-text">{formatRD(total)}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Factura escaneada</label>
        <label className="flex items-center gap-2 px-3 py-2 bg-app-input-bg text-app-text border border-app-border border-dashed rounded-lg text-sm cursor-pointer hover:bg-app-hover">
          <Paperclip className="w-3.5 h-3.5 text-app-subtle" />
          <span className="text-app-muted text-xs">
            {attachmentFile?.name ?? 'Adjuntar PDF o imagen de la factura'}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
          />
          {attachmentFile && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setAttachmentFile(null) }}
              className="ml-auto text-app-subtle hover:text-red-500"
            >
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || showNewForm || !supplierId || validLines.length === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : `Guardar ${validLines.length || ''} material${validLines.length === 1 ? '' : 'es'}`.trim()}
        </button>
      </div>
    </form>
  )
}
