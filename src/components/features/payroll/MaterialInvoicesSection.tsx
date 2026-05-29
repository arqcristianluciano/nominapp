import { memo } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { MaterialInvoice } from '@/types/database'

interface Props {
  invoices: MaterialInvoice[]
  canEdit: boolean
  total: number
  onOpenAdd: () => void
  onEdit: (invoice: MaterialInvoice) => void
  onDelete: (invoiceId: string) => void
}

interface MaterialInvoiceRowProps {
  invoice: MaterialInvoice
  canEdit: boolean
  onEdit: (invoice: MaterialInvoice) => void
  onDelete: (invoiceId: string) => void
}

function MaterialInvoiceMobileCardComponent({ invoice, canEdit, onEdit, onDelete }: MaterialInvoiceRowProps) {
  return (
    <li className="bg-app-surface rounded-xl border border-app-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-app-text truncate">{invoice.supplier?.name || '—'}</p>
          <p className="text-xs text-app-muted mt-0.5 break-words">
            {invoice.description}
            {invoice.invoice_reference && (
              <span className="text-xs text-app-subtle ml-1">{invoice.invoice_reference}</span>
            )}
          </p>
        </div>
        {canEdit && (
          <div className="shrink-0 flex items-center -mr-2 -mt-2">
            <button
              onClick={() => onEdit(invoice)}
              aria-label="Editar factura"
              className="inline-flex items-center justify-center w-11 h-11 text-app-subtle hover:text-blue-500 rounded-lg"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(invoice.id)}
              aria-label="Eliminar factura"
              className="inline-flex items-center justify-center w-11 h-11 text-app-subtle hover:text-red-500 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-app-subtle">Monto</span>
        <span className="font-medium text-app-text">{formatRD(invoice.amount)}</span>
      </div>
    </li>
  )
}
MaterialInvoiceMobileCardComponent.displayName = 'MaterialInvoiceMobileCard'
const MaterialInvoiceMobileCard = memo(MaterialInvoiceMobileCardComponent)

function MaterialInvoiceRowComponent({ invoice, canEdit, onEdit, onDelete }: MaterialInvoiceRowProps) {
  return (
    <tr className="hover:bg-app-hover">
      <td className="px-4 py-2.5 text-app-text">{invoice.supplier?.name || '—'}</td>
      <td className="px-4 py-2.5 text-app-muted">
        {invoice.description}
        {invoice.invoice_reference && <span className="text-xs text-app-subtle ml-1">{invoice.invoice_reference}</span>}
      </td>
      <td className="px-4 py-2.5 text-right font-medium text-app-text">{formatRD(invoice.amount)}</td>
      {canEdit && (
        <td className="px-2 py-2.5">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onEdit(invoice)}
              aria-label="Editar factura"
              className="inline-flex items-center justify-center w-8 h-8 text-app-subtle hover:text-blue-500 rounded"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(invoice.id)}
              aria-label="Eliminar factura"
              className="inline-flex items-center justify-center w-8 h-8 text-app-subtle hover:text-red-500 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}
MaterialInvoiceRowComponent.displayName = 'MaterialInvoiceRow'
const MaterialInvoiceRow = memo(MaterialInvoiceRowComponent)

export function MaterialInvoicesSection({ invoices, canEdit, total, onOpenAdd, onEdit, onDelete }: Props) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-medium text-app-text">Materiales</h2>
        {canEdit && (
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
        <>
          {/* Mobile cards */}
          <ul className="sm:hidden space-y-2">
            {invoices.map((invoice) => (
              <MaterialInvoiceMobileCard
                key={invoice.id}
                invoice={invoice}
                canEdit={canEdit}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
          {/* Desktop / tablet table */}
          <div className="hidden sm:block bg-app-surface rounded-xl border border-app-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="bg-app-bg border-b border-app-border">
                    <th className="text-left px-4 py-2.5 font-medium text-app-muted">Proveedor</th>
                    <th className="text-left px-4 py-2.5 font-medium text-app-muted">Descripción</th>
                    <th className="text-right px-4 py-2.5 font-medium text-app-muted">Monto</th>
                    {canEdit && <th className="w-20" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {invoices.map((invoice) => (
                    <MaterialInvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      canEdit={canEdit}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <div className="mt-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-medium text-amber-800 dark:text-amber-400">Total materiales</span>
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">{formatRD(total)}</span>
      </div>
    </section>
  )
}
