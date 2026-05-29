import { memo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { BudgetCategory, MaterialInvoice } from '@/types/database'

interface Props {
  invoices: MaterialInvoice[]
  isDraft: boolean
  total: number
  budgetCategories?: BudgetCategory[]
  onOpenAdd: () => void
  onDelete: (invoiceId: string) => void
  onUpdateImputation?: (invoiceId: string, budgetCategoryId: string | null) => void
}

interface MaterialInvoiceRowProps {
  invoice: MaterialInvoice
  isDraft: boolean
  budgetCategories: BudgetCategory[]
  onDelete: (invoiceId: string) => void
  onUpdateImputation?: (invoiceId: string, budgetCategoryId: string | null) => void
}

function ChapterSelect({
  invoice,
  budgetCategories,
  onUpdateImputation,
  className,
}: {
  invoice: MaterialInvoice
  budgetCategories: BudgetCategory[]
  onUpdateImputation?: (invoiceId: string, budgetCategoryId: string | null) => void
  className?: string
}) {
  return (
    <select
      value={invoice.budget_category_id ?? ''}
      onChange={(e) => onUpdateImputation?.(invoice.id, e.target.value || null)}
      aria-label="Capítulo imputado"
      className={`bg-app-input-bg text-app-text border border-app-border rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className ?? ''}`}
    >
      <option value="">— Sin imputación —</option>
      {budgetCategories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.code} {c.name}
        </option>
      ))}
    </select>
  )
}

function chapterLabel(invoice: MaterialInvoice, budgetCategories: BudgetCategory[]): string {
  if (!invoice.budget_category_id) return '—'
  const cat = budgetCategories.find((c) => c.id === invoice.budget_category_id)
  return cat ? `${cat.code} ${cat.name}` : '—'
}

function MaterialInvoiceMobileCardComponent({
  invoice,
  isDraft,
  budgetCategories,
  onDelete,
  onUpdateImputation,
}: MaterialInvoiceRowProps) {
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
        {isDraft && (
          <button
            onClick={() => onDelete(invoice.id)}
            aria-label="Eliminar factura"
            className="shrink-0 inline-flex items-center justify-center w-11 h-11 -mr-2 -mt-2 text-app-subtle hover:text-red-500 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-app-subtle">Monto</span>
        <span className="font-medium text-app-text">{formatRD(invoice.amount)}</span>
      </div>
      {budgetCategories.length > 0 && (
        <div className="mt-2 text-xs">
          <div className="text-app-subtle mb-1">Capítulo imputado</div>
          {isDraft ? (
            <ChapterSelect
              invoice={invoice}
              budgetCategories={budgetCategories}
              onUpdateImputation={onUpdateImputation}
              className="w-full"
            />
          ) : (
            <div className="text-app-text">{chapterLabel(invoice, budgetCategories)}</div>
          )}
        </div>
      )}
    </li>
  )
}
MaterialInvoiceMobileCardComponent.displayName = 'MaterialInvoiceMobileCard'
const MaterialInvoiceMobileCard = memo(MaterialInvoiceMobileCardComponent)

function MaterialInvoiceRowComponent({
  invoice,
  isDraft,
  budgetCategories,
  onDelete,
  onUpdateImputation,
}: MaterialInvoiceRowProps) {
  const showChapter = budgetCategories.length > 0
  return (
    <tr className="hover:bg-app-hover">
      <td className="px-4 py-2.5 text-app-text">{invoice.supplier?.name || '—'}</td>
      <td className="px-4 py-2.5 text-app-muted">
        {invoice.description}
        {invoice.invoice_reference && <span className="text-xs text-app-subtle ml-1">{invoice.invoice_reference}</span>}
      </td>
      {showChapter && (
        <td className="px-4 py-2.5 text-app-muted">
          {isDraft ? (
            <ChapterSelect
              invoice={invoice}
              budgetCategories={budgetCategories}
              onUpdateImputation={onUpdateImputation}
            />
          ) : (
            chapterLabel(invoice, budgetCategories)
          )}
        </td>
      )}
      <td className="px-4 py-2.5 text-right font-medium text-app-text">{formatRD(invoice.amount)}</td>
      {isDraft && (
        <td className="px-2 py-2.5">
          <button
            onClick={() => onDelete(invoice.id)}
            aria-label="Eliminar factura"
            className="inline-flex items-center justify-center w-8 h-8 text-app-subtle hover:text-red-500 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
    </tr>
  )
}
MaterialInvoiceRowComponent.displayName = 'MaterialInvoiceRow'
const MaterialInvoiceRow = memo(MaterialInvoiceRowComponent)

export function MaterialInvoicesSection({
  invoices,
  isDraft,
  total,
  budgetCategories = [],
  onOpenAdd,
  onDelete,
  onUpdateImputation,
}: Props) {
  const showChapter = budgetCategories.length > 0
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
        <>
          {/* Mobile cards */}
          <ul className="sm:hidden space-y-2">
            {invoices.map((invoice) => (
              <MaterialInvoiceMobileCard
                key={invoice.id}
                invoice={invoice}
                isDraft={isDraft}
                budgetCategories={budgetCategories}
                onDelete={onDelete}
                onUpdateImputation={onUpdateImputation}
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
                    {showChapter && <th className="text-left px-4 py-2.5 font-medium text-app-muted">Capítulo</th>}
                    <th className="text-right px-4 py-2.5 font-medium text-app-muted">Monto</th>
                    {isDraft && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {invoices.map((invoice) => (
                    <MaterialInvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      isDraft={isDraft}
                      budgetCategories={budgetCategories}
                      onDelete={onDelete}
                      onUpdateImputation={onUpdateImputation}
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
