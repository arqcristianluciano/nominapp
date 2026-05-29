import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, FileText, Loader2, Paperclip, Plus, Trash2, X } from 'lucide-react'
import type { BudgetCategory, MaterialInvoice, Supplier } from '@/types/database'
import { payrollService } from '@/services/payrollService'
import { parseDecimalInput } from '@/utils/decimalInput'
import { sumInvoiceItems } from '@/utils/materialInvoice'
import { formatRD } from '@/utils/currency'

interface ItemDraft {
  description: string
  amount: string
}

interface Props {
  suppliers: Supplier[]
  budgetCategories?: BudgetCategory[]
  periodId: string
  projectId: string
  onSubmit: (invoice: {
    supplier_id: string
    invoice_reference?: string
    attachment_path?: string | null
    budget_category_id?: string | null
    items: { description: string; amount: number }[]
  }) => Promise<void>
  onCancel: () => void
  saving: boolean
  /** Si se pasa, el formulario opera en modo edición (campos pre-cargados). */
  initialInvoice?: MaterialInvoice
  /** Texto del botón de envío (por defecto "Guardar factura"). */
  submitLabel?: string
}

const inputCls =
  'w-full px-3 py-2 bg-app-input-bg text-app-text border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

function isAllowedFile(file: File): boolean {
  return file.type.startsWith('image/') || file.type === 'application/pdf'
}

// Items iniciales: desde los ítems de la factura, o (factura legacy sin ítems)
// desde su descripción/monto, o una fila vacía para una factura nueva.
function initialItems(invoice?: MaterialInvoice): ItemDraft[] {
  if (invoice?.items?.length) {
    return invoice.items.map((it) => ({ description: it.description, amount: String(it.amount) }))
  }
  if (invoice) return [{ description: invoice.description, amount: String(invoice.amount) }]
  return [{ description: '', amount: '' }]
}

export function AddMaterialForm({
  suppliers,
  budgetCategories = [],
  periodId,
  projectId,
  onSubmit,
  onCancel,
  saving,
  initialInvoice,
  submitLabel,
}: Props) {
  const [supplierId, setSupplierId] = useState(initialInvoice?.supplier_id ?? '')
  const [reference, setReference] = useState(initialInvoice?.invoice_reference ?? '')
  const [budgetCategoryId, setBudgetCategoryId] = useState(initialInvoice?.budget_category_id ?? '')
  const [items, setItems] = useState<ItemDraft[]>(() => initialItems(initialInvoice))

  const [attachmentPath, setAttachmentPath] = useState<string | null>(initialInvoice?.attachment_path ?? null)
  const [attachmentName, setAttachmentName] = useState(
    initialInvoice?.attachment_path ? (initialInvoice.attachment_path.split('/').pop() ?? 'comprobante') : '',
  )
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Libera el object URL local de la preview al desmontar o reemplazar.
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const validItems = items
    .map((it) => ({ description: it.description, amount: parseDecimalInput(it.amount) }))
    .filter(
      (it): it is { description: string; amount: number } =>
        it.description.trim().length > 0 && it.amount !== null && it.amount > 0,
    )
  const total = sumInvoiceItems(validItems)
  const canSubmit = !!supplierId && validItems.length > 0 && !uploading && !saving

  function updateItem(index: number, field: keyof ItemDraft, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }
  function addItem() {
    setItems((prev) => [...prev, { description: '', amount: '' }])
  }
  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return
    setUploadError(null)
    if (!isAllowedFile(file)) {
      setUploadError('Solo se permiten imágenes o archivos PDF.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('El archivo supera el límite de 10 MB.')
      return
    }
    setUploading(true)
    const isImage = file.type.startsWith('image/')
    const localUrl = isImage ? URL.createObjectURL(file) : null
    try {
      const path = await payrollService.uploadInvoiceFile(file, projectId, periodId)
      setAttachmentPath(path)
      setAttachmentName(file.name)
      setLocalPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return localUrl
      })
    } catch (err) {
      if (localUrl) URL.revokeObjectURL(localUrl)
      setUploadError(err instanceof Error ? err.message : 'Error al subir el comprobante.')
    } finally {
      setUploading(false)
    }
  }

  function clearAttachment() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    setLocalPreviewUrl(null)
    setAttachmentPath(null)
    setAttachmentName('')
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await onSubmit({
      supplier_id: supplierId,
      invoice_reference: reference.trim() || undefined,
      attachment_path: attachmentPath,
      budget_category_id: budgetCategoryId || null,
      items: validItems.map((it) => ({ description: it.description.trim().toUpperCase(), amount: it.amount })),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Proveedor *</label>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className={inputCls}>
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
        <label className="block text-xs font-medium text-app-muted mb-1">Referencia de factura</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="VER FACTURA PAG. 2"
          className={inputCls}
        />
      </div>

      {budgetCategories.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-app-muted mb-1">Capítulo imputado (opcional)</label>
          <select value={budgetCategoryId} onChange={(e) => setBudgetCategoryId(e.target.value)} className={inputCls}>
            <option value="">— Sin imputación específica —</option>
            {budgetCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ítems de la factura */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-app-muted">Ítems *</label>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar ítem
          </button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                type="text"
                value={it.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
                placeholder="Ej: CEMENTO GRIS, ARENA PROCESADA"
                className={inputCls + ' flex-1'}
              />
              <input
                type="text"
                inputMode="decimal"
                value={it.amount}
                onChange={(e) => updateItem(i, 'amount', e.target.value)}
                placeholder="Monto RD$"
                aria-label="Monto del ítem"
                className={inputCls + ' w-28 sm:w-32 text-right'}
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                aria-label="Quitar ítem"
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 text-app-subtle hover:text-red-500 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Comprobante (imagen / PDF) */}
      <div>
        <label className="block text-xs font-medium text-app-muted mb-1">Comprobante de factura (imagen o PDF)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        {!attachmentPath ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-app-border rounded-lg text-app-text hover:bg-app-hover disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            {uploading ? 'Subiendo...' : 'Adjuntar comprobante'}
          </button>
        ) : (
          <div className="flex items-center gap-3 border border-app-border rounded-lg p-2">
            {localPreviewUrl ? (
              <img src={localPreviewUrl} alt="Comprobante" className="w-12 h-12 object-cover rounded" />
            ) : (
              <FileText className="w-6 h-6 text-app-muted shrink-0" />
            )}
            <span className="text-sm text-app-text truncate flex-1">{attachmentName}</span>
            <button
              type="button"
              onClick={clearAttachment}
              aria-label="Quitar comprobante"
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 text-app-subtle hover:text-red-500 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
        {!attachmentPath && !uploadError && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Falta adjuntar el comprobante. Puedes guardar la factura, pero quedará marcada como{' '}
              <strong>pendiente</strong> hasta que adjuntes la imagen o el PDF.
            </span>
          </p>
        )}
      </div>

      <div className="flex justify-between items-center border-t border-app-border pt-3">
        <span className="text-sm text-app-muted">Total de la factura</span>
        <span className="text-base font-semibold text-app-text">{formatRD(total)}</span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : (submitLabel ?? 'Guardar factura')}
        </button>
      </div>
    </form>
  )
}
