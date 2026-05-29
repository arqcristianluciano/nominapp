import { memo, useRef, useState } from 'react'
import { AlertTriangle, ExternalLink, Loader2, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import { payrollService } from '@/services/payrollService'
import type { BudgetCategory, MaterialInvoice } from '@/types/database'

interface Props {
  invoices: MaterialInvoice[]
  isDraft: boolean
  canEdit: boolean
  total: number
  budgetCategories?: BudgetCategory[]
  onOpenAdd: () => void
  onEdit: (invoice: MaterialInvoice) => void
  onDelete: (invoiceId: string) => void
  onAttach: (invoiceId: string, file: File) => Promise<void>
}

interface InvoiceCardProps {
  invoice: MaterialInvoice
  isDraft: boolean
  canEdit: boolean
  budgetCategories: BudgetCategory[]
  onEdit: (invoice: MaterialInvoice) => void
  onDelete: (invoiceId: string) => void
  onAttach: (invoiceId: string, file: File) => Promise<void>
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

function isAllowedFile(file: File): boolean {
  return file.type.startsWith('image/') || file.type === 'application/pdf'
}

// El capítulo imputado se muestra como referencia; se edita desde el modal de
// edición (lápiz), que incluye el selector "Capítulo imputado".
function chapterLabel(budgetCategoryId: string | null, budgetCategories: BudgetCategory[]): string {
  if (!budgetCategoryId) return '—'
  const cat = budgetCategories.find((c) => c.id === budgetCategoryId)
  return cat ? `${cat.code} ${cat.name}` : '—'
}

function InvoiceCardComponent({
  invoice,
  isDraft,
  canEdit,
  budgetCategories,
  onEdit,
  onDelete,
  onAttach,
}: InvoiceCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  const items = invoice.items ?? []
  const hasAttachment = !!invoice.attachment_path
  const showChapter = budgetCategories.length > 0

  async function handleFile(file: File | null | undefined) {
    if (!file) return
    setActionError(null)
    if (!isAllowedFile(file)) {
      setActionError('Solo se permiten imágenes o archivos PDF.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setActionError('El archivo supera el límite de 10 MB.')
      return
    }
    setUploading(true)
    try {
      await onAttach(invoice.id, file)
    } catch {
      setActionError('No se pudo subir el comprobante.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleView() {
    if (!invoice.attachment_path) return
    setActionError(null)
    setOpening(true)
    try {
      const url = await payrollService.getInvoiceFileUrl(invoice.attachment_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setActionError('No se pudo abrir el comprobante.')
    } finally {
      setOpening(false)
    }
  }

  return (
    <li className="bg-app-surface rounded-xl border border-app-border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-app-text truncate">{invoice.supplier?.name || '—'}</p>
          {invoice.invoice_reference && (
            <p className="text-xs text-app-subtle mt-0.5 truncate">{invoice.invoice_reference}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-app-text">{formatRD(invoice.amount)}</span>
          {canEdit && (
            <button
              onClick={() => onEdit(invoice)}
              aria-label="Editar factura"
              className="inline-flex items-center justify-center w-9 h-9 text-app-subtle hover:text-blue-500 rounded-lg"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {isDraft && (
            <button
              onClick={() => onDelete(invoice.id)}
              aria-label="Eliminar factura"
              className="inline-flex items-center justify-center w-9 h-9 -mr-1 text-app-subtle hover:text-red-500 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Ítems de la factura */}
      <ul className="mt-2 divide-y divide-app-border border-t border-app-border">
        {items.length > 0 ? (
          items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="text-app-muted min-w-0 break-words">{item.description}</span>
              <span className="text-app-text font-medium shrink-0">{formatRD(item.amount)}</span>
            </li>
          ))
        ) : (
          <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="text-app-muted min-w-0 break-words">{invoice.description}</span>
            <span className="text-app-text font-medium shrink-0">{formatRD(invoice.amount)}</span>
          </li>
        )}
      </ul>

      {showChapter && (
        <p className="mt-2 text-xs">
          <span className="text-app-subtle">Capítulo: </span>
          <span className="text-app-text">{chapterLabel(invoice.budget_category_id, budgetCategories)}</span>
        </p>
      )}

      {/* Comprobante: link cuando existe, advertencia + adjuntar cuando falta */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {hasAttachment ? (
          <button
            type="button"
            onClick={handleView}
            disabled={opening}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Ver comprobante
          </button>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-full px-2.5 py-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Falta comprobante
            </span>
            {(isDraft || canEdit) && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                  {uploading ? 'Subiendo...' : 'Adjuntar'}
                </button>
              </>
            )}
          </>
        )}
      </div>
      {actionError && <p className="text-xs text-red-600 mt-1">{actionError}</p>}
    </li>
  )
}
InvoiceCardComponent.displayName = 'InvoiceCard'
const InvoiceCard = memo(InvoiceCardComponent)

export function MaterialInvoicesSection({
  invoices,
  isDraft,
  canEdit,
  total,
  budgetCategories = [],
  onOpenAdd,
  onEdit,
  onDelete,
  onAttach,
}: Props) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-medium text-app-text">Materiales</h2>
        {isDraft && (
          <button
            onClick={onOpenAdd}
            aria-label="Agregar factura"
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover min-h-[44px] sm:min-h-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Agregar factura</span>
            <span className="sm:hidden">Agregar</span>
          </button>
        )}
      </div>
      {invoices.length === 0 ? (
        <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center text-sm text-app-subtle">
          No hay facturas de materiales registradas
        </div>
      ) : (
        <ul className="space-y-2">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              isDraft={isDraft}
              canEdit={canEdit}
              budgetCategories={budgetCategories}
              onEdit={onEdit}
              onDelete={onDelete}
              onAttach={onAttach}
            />
          ))}
        </ul>
      )}
      <div className="mt-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-medium text-amber-800 dark:text-amber-400">Total materiales</span>
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">{formatRD(total)}</span>
      </div>
    </section>
  )
}
