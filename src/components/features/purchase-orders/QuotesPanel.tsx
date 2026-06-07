import { useState } from 'react'
import { Trash2, Award, FileDown, Pencil, Check, X } from 'lucide-react'
import type { PurchaseQuote } from '@/types/purchaseOrder'
import { formatRD } from '@/utils/currency'
import { parseDecimalInput } from '@/utils/decimalInput'
import { quoteService } from '@/services/quoteService'

interface NegotiationState {
  price: string
  notes: string
  editing: boolean
}

interface Props {
  quotes: PurchaseQuote[]
  approvedQuoteId: string | null
  canDelete?: boolean
  canNegotiate?: boolean
  onDelete?: (quoteId: string) => void
  onNegotiate?: (quoteId: string, total: number | null, notes: string | null) => Promise<void>
}

export function QuotesPanel({ quotes, approvedQuoteId, canDelete, canNegotiate, onDelete, onNegotiate }: Props) {
  const [neg, setNeg] = useState<Record<string, NegotiationState>>({})

  const startEdit = (q: PurchaseQuote) =>
    setNeg((p) => ({
      ...p,
      [q.id]: {
        price: q.negotiated_total ? String(q.negotiated_total) : '',
        notes: q.negotiated_notes || '',
        editing: true,
      },
    }))

  const cancelEdit = (id: string) => setNeg((p) => ({ ...p, [id]: { ...p[id], editing: false } }))

  const saveNeg = async (q: PurchaseQuote) => {
    const state = neg[q.id]
    const total = state.price.trim() ? parseDecimalInput(state.price) : null
    await onNegotiate?.(q.id, total, state.notes || null)
    setNeg((p) => ({ ...p, [q.id]: { ...p[q.id], editing: false } }))
  }

  if (!quotes.length) {
    return (
      <div className="border-2 border-dashed border-app-border rounded-xl p-6 sm:p-10 text-center text-app-subtle">
        <p className="text-sm">
          No hay cotizaciones. Agregue al menos 2 suplidores (o 1 con justificación al aprobar).
        </p>
      </div>
    )
  }

  return (
    // Single column on mobile (full width cards, easier to read on phones),
    // 2 cols at sm+, 2 at lg (since the right column already takes space in the
    // page-level grid). Reduced gaps on mobile to maximize content width.
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
      {quotes.map((q) => {
        const isApproved = q.id === approvedQuoteId
        const state = neg[q.id]
        const hasNeg = !!q.negotiated_total

        return (
          <div
            key={q.id}
            className={`bg-app-surface rounded-xl border-2 overflow-hidden flex flex-col ${
              isApproved ? 'border-green-400 shadow-sm shadow-green-100' : 'border-app-border'
            }`}
          >
            <div
              className={`px-3 sm:px-4 py-3 flex items-start justify-between gap-2 ${isApproved ? 'bg-green-50' : 'bg-app-bg'}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-app-text truncate">{q.supplier?.name}</p>
                {q.quote_number && <p className="text-xs text-app-muted truncate">Cot. {q.quote_number}</p>}
                {q.valid_until && <p className="text-xs text-app-subtle">Válida: {q.valid_until}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isApproved && (
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs bg-green-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                    <Award className="w-3 h-3" /> Aprobada
                  </span>
                )}
                {canNegotiate && !state?.editing && (
                  <button
                    onClick={() => startEdit(q)}
                    title="Negociar precio"
                    aria-label="Negociar precio"
                    // Touch target: min-w/h 44px on mobile per WCAG 2.5.5; smaller on sm+.
                    className="inline-flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-md text-app-subtle hover:text-orange-500 hover:bg-app-hover transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canDelete && onDelete && !isApproved && (
                  <button
                    onClick={() => onDelete(q.id)}
                    aria-label="Eliminar cotización"
                    className="inline-flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-md text-app-subtle hover:text-red-400 hover:bg-app-hover transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 sm:p-4 flex-1 flex flex-col">
              {/* table-fixed + word-break helps long descriptions wrap on narrow phones */}
              <table className="w-full text-xs mb-3 flex-1 table-fixed">
                <tbody className="divide-y divide-app-border">
                  {(q.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="py-1.5 pr-2 text-app-muted align-top break-words">
                        <p className="break-words">{it.description}</p>
                        <p className="text-app-subtle">
                          {it.quantity} {it.unit} × {formatRD(it.unit_price)}
                        </p>
                      </td>
                      <td className="py-1.5 text-right font-medium text-app-text whitespace-nowrap align-top w-24 sm:w-28">
                        {formatRD(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-app-border pt-2 space-y-0.5 text-xs">
                <div className="flex justify-between gap-2 text-app-muted">
                  <span>Subtotal</span>
                  <span className="whitespace-nowrap">{formatRD(q.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-2 text-app-muted">
                  <span>ITBIS ({q.tax_percent}%)</span>
                  <span className="whitespace-nowrap">{formatRD(q.total - q.subtotal)}</span>
                </div>
                <div
                  className={`flex justify-between gap-2 font-semibold text-sm pt-1 ${
                    isApproved ? 'text-green-700' : hasNeg ? 'text-app-subtle line-through' : 'text-blue-700'
                  }`}
                >
                  <span>Total cotizado</span>
                  <span className="whitespace-nowrap">{formatRD(q.total)}</span>
                </div>
                {hasNeg && !state?.editing && (
                  <div className="flex justify-between gap-2 font-bold text-sm text-orange-600 bg-orange-50 -mx-1 px-1 py-0.5 rounded">
                    <span>Precio negociado</span>
                    <span className="whitespace-nowrap">{formatRD(q.negotiated_total!)}</span>
                  </div>
                )}
                {q.negotiated_notes && !state?.editing && (
                  <p className="text-[10px] text-orange-500 italic break-words">{q.negotiated_notes}</p>
                )}
              </div>

              {q.notes && !state?.editing && (
                <p className="mt-2 text-xs text-app-muted italic border-t border-app-border pt-2 break-words">
                  {q.notes}
                </p>
              )}

              {/* Adjunto de cotización: botón de descarga si existe */}
              {q.attachment_path && !state?.editing && (
                <div className="mt-2 border-t border-app-border pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const url = await quoteService.getAttachmentUrl(q.attachment_path!)
                        window.open(url, '_blank', 'noopener,noreferrer')
                      } catch {
                        // silente — el usuario verá que no abrió
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Ver cotización adjunta
                  </button>
                </div>
              )}

              {state?.editing && (
                <div className="mt-3 border-t border-orange-200 pt-3 space-y-2">
                  <p className="text-xs font-medium text-orange-600">Precio negociado (total final)</p>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={state.price}
                    onChange={(e) => setNeg((p) => ({ ...p, [q.id]: { ...p[q.id], price: e.target.value } }))}
                    placeholder="Ej: 195000"
                    className="w-full border border-orange-200 rounded-md px-3 py-2.5 text-sm focus:ring-1 focus:ring-orange-400"
                  />
                  <input
                    value={state.notes}
                    onChange={(e) => setNeg((p) => ({ ...p, [q.id]: { ...p[q.id], notes: e.target.value } }))}
                    placeholder="Nota de negociación (opcional)"
                    className="w-full border border-orange-200 rounded-md px-3 py-2.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveNeg(q)}
                      className="flex-1 min-h-11 flex items-center justify-center gap-1 bg-orange-500 text-white rounded-md py-2 text-sm hover:bg-orange-600"
                    >
                      <Check className="w-4 h-4" /> Guardar
                    </button>
                    <button
                      onClick={() => cancelEdit(q.id)}
                      aria-label="Cancelar"
                      className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md text-app-subtle hover:text-app-muted hover:bg-app-hover px-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
