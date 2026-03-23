import { useState } from 'react'
import { Trash2, Award, Pencil, Check, X } from 'lucide-react'
import type { PurchaseQuote } from '@/types/purchaseOrder'

interface NegotiationState { price: string; notes: string; editing: boolean }

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

  const fmt = (n: number) => n.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })

  const startEdit = (q: PurchaseQuote) => setNeg((p) => ({
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
    const parsed = parseFloat(state.price)
    const total = isNaN(parsed) || !state.price ? null : parsed
    await onNegotiate?.(q.id, total, state.notes || null)
    setNeg((p) => ({ ...p, [q.id]: { ...p[q.id], editing: false } }))
  }

  if (!quotes.length) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400">
        <p className="text-sm">No hay cotizaciones. Agregue al menos 3 suplidores.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {quotes.map((q) => {
        const isApproved = q.id === approvedQuoteId
        const state = neg[q.id]
        const hasNeg = !!q.negotiated_total

        return (
          <div key={q.id} className={`bg-white rounded-xl border-2 overflow-hidden flex flex-col ${
            isApproved ? 'border-green-400 shadow-sm shadow-green-100' : 'border-gray-200'
          }`}>
            <div className={`px-4 py-3 flex items-start justify-between gap-2 ${isApproved ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{q.supplier?.name}</p>
                {q.quote_number && <p className="text-xs text-gray-500">Cot. {q.quote_number}</p>}
                {q.valid_until && <p className="text-xs text-gray-400">Válida: {q.valid_until}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isApproved && (
                  <span className="flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                    <Award className="w-3 h-3" /> Aprobada
                  </span>
                )}
                {canNegotiate && !state?.editing && (
                  <button onClick={() => startEdit(q)} title="Negociar precio"
                    className="text-gray-300 hover:text-orange-500 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && onDelete && !isApproved && (
                  <button onClick={() => onDelete(q.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
              <table className="w-full text-xs mb-3 flex-1">
                <tbody className="divide-y divide-gray-50">
                  {(q.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="py-1.5 pr-2 text-gray-700">
                        <p>{it.description}</p>
                        <p className="text-gray-400">{it.quantity} {it.unit} × {fmt(it.unit_price)}</p>
                      </td>
                      <td className="py-1.5 text-right font-medium text-gray-800 whitespace-nowrap">
                        {fmt(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-gray-100 pt-2 space-y-0.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>{fmt(q.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>ITBIS ({q.tax_percent}%)</span>
                  <span>{fmt(q.subtotal * q.tax_percent / 100)}</span>
                </div>
                <div className={`flex justify-between font-semibold text-sm pt-1 ${
                  isApproved ? 'text-green-700' : hasNeg ? 'text-gray-400 line-through' : 'text-blue-700'
                }`}>
                  <span>Total cotizado</span><span>{fmt(q.total)}</span>
                </div>
                {hasNeg && !state?.editing && (
                  <div className="flex justify-between font-bold text-sm text-orange-600 bg-orange-50 -mx-1 px-1 py-0.5 rounded">
                    <span>Precio negociado</span><span>{fmt(q.negotiated_total!)}</span>
                  </div>
                )}
                {q.negotiated_notes && !state?.editing && (
                  <p className="text-[10px] text-orange-500 italic">{q.negotiated_notes}</p>
                )}
              </div>

              {q.notes && !state?.editing && (
                <p className="mt-2 text-xs text-gray-500 italic border-t border-gray-100 pt-2">{q.notes}</p>
              )}

              {state?.editing && (
                <div className="mt-3 border-t border-orange-200 pt-3 space-y-2">
                  <p className="text-xs font-medium text-orange-600">Precio negociado (total final)</p>
                  <input
                    type="number" step="any" min="0"
                    value={state.price}
                    onChange={(e) => setNeg((p) => ({ ...p, [q.id]: { ...p[q.id], price: e.target.value } }))}
                    placeholder="Ej: 195000"
                    className="w-full border border-orange-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-400"
                  />
                  <input
                    value={state.notes}
                    onChange={(e) => setNeg((p) => ({ ...p, [q.id]: { ...p[q.id], notes: e.target.value } }))}
                    placeholder="Nota de negociación (opcional)"
                    className="w-full border border-orange-200 rounded px-2 py-1.5 text-xs"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveNeg(q)}
                      className="flex-1 flex items-center justify-center gap-1 bg-orange-500 text-white rounded py-1.5 text-xs hover:bg-orange-600">
                      <Check className="w-3 h-3" /> Guardar
                    </button>
                    <button onClick={() => cancelEdit(q.id)}
                      className="flex items-center justify-center text-gray-400 hover:text-gray-600 px-2">
                      <X className="w-3.5 h-3.5" />
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
