import { Plus, Trash2, Paperclip } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { MaterialInvoice } from '@/types/database'

interface Props {
  invoices: MaterialInvoice[]
  isDraft: boolean
  total: number
  onOpenAdd: () => void
  onDelete: (invoiceId: string) => void
}

export function MaterialInvoicesSection({ invoices, isDraft, total, onOpenAdd, onDelete }: Props) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-medium text-app-text">Materiales</h2>{isDraft && <button onClick={onOpenAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border text-sm font-medium rounded-lg hover:bg-app-hover"><Plus className="w-4 h-4" /> Agregar factura</button>}</div>
      {invoices.length === 0 ? <div className="bg-app-surface rounded-xl border border-app-border p-8 text-center text-sm text-app-subtle">No hay facturas de materiales registradas</div> : (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-app-bg border-b border-app-border"><th className="text-left px-4 py-2.5 font-medium text-app-muted">Proveedor</th><th className="text-left px-4 py-2.5 font-medium text-app-muted">Descripción</th><th className="text-right px-4 py-2.5 font-medium text-app-muted">Monto</th>{isDraft && <th className="w-10" />}</tr></thead>
            <tbody className="divide-y divide-app-border">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-app-hover">
                  <td className="px-4 py-2.5 text-app-text">{invoice.supplier?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-app-muted">{invoice.description}{invoice.invoice_reference && <span className="text-xs text-app-subtle ml-1">{invoice.invoice_reference}</span>}{invoice.attachment_path && <span className="inline-flex items-center gap-1 text-[10px] text-app-subtle ml-2" title={invoice.attachment_path}><Paperclip className="w-3 h-3" /> {invoice.attachment_path}</span>}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-app-text">{formatRD(invoice.amount)}</td>
                  {isDraft && <td className="px-2 py-2.5"><button onClick={() => onDelete(invoice.id)} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-4 py-3 flex justify-between items-center"><span className="text-sm font-medium text-amber-800 dark:text-amber-400">Total materiales</span><span className="text-sm font-semibold text-amber-800 dark:text-amber-400">{formatRD(total)}</span></div>
    </section>
  )
}
