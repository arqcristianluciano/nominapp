import { useState } from 'react'
import { CheckCircle, XCircle, RotateCcw, ShieldCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { SignatureCanvas } from './SignatureCanvas'
import { approvalCode } from '@/utils/approvalCode'
import type { PurchaseQuote } from '@/types/purchaseOrder'

type Tab = 'approve' | 'return' | 'reject'

interface Props {
  open: boolean
  onClose: () => void
  quotes: PurchaseQuote[]
  onApprove: (quoteId: string, approvedBy: string, signature: string) => Promise<void>
  onReturn: (notes: string) => Promise<void>
  onReject: (reason: string) => Promise<void>
}

export function ApprovalModal({ open, onClose, quotes, onApprove, onReturn, onReject }: Props) {
  const [tab, setTab] = useState<Tab>('approve')
  const [selectedQuoteId, setSelectedQuoteId] = useState(quotes[0]?.id || '')
  const [code, setCode] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [returnNotes, setReturnNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setCode(''); setApprovedBy(''); setSignature(null)
    setReturnNotes(''); setRejectReason(''); setError(null); setTab('approve')
    setSelectedQuoteId(quotes[0]?.id || '')
  }

  const handleClose = () => { reset(); onClose() }

  const withLoading = async (fn: () => Promise<void>) => {
    setError(null); setLoading(true)
    try { await fn(); reset() } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const handleApprove = () => withLoading(async () => {
    if (!selectedQuoteId) throw new Error('Seleccione una cotización')
    if (!approvalCode.validate(code)) throw new Error('Código de aprobación incorrecto')
    if (!approvedBy.trim()) throw new Error('Ingrese su nombre')
    if (!signature) throw new Error('Se requiere la firma digital')
    await onApprove(selectedQuoteId, approvedBy.trim(), signature)
  })

  const handleReturn = () => withLoading(async () => {
    if (!returnNotes.trim()) throw new Error('Indique qué debe corregirse')
    await onReturn(returnNotes.trim())
  })

  const handleReject = () => withLoading(async () => {
    if (!rejectReason.trim()) throw new Error('Ingrese el motivo del rechazo')
    await onReject(rejectReason.trim())
  })

  const fmt = (n: number) => n.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: 'approve', label: 'Aprobar',  color: 'border-green-600 text-green-600' },
    { key: 'return',  label: 'Devolver', color: 'border-orange-500 text-orange-500' },
    { key: 'reject',  label: 'Rechazar', color: 'border-red-600 text-red-600' },
  ]

  return (
    <Modal open={open} onClose={handleClose} title="Revisión de solicitud de compra" width="max-w-xl">
      <div className="space-y-4">
        <div className="flex border-b border-gray-200">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(null) }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key ? t.color : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'approve' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Seleccione la cotización a aprobar
              </label>
              <div className="space-y-2">
                {quotes.map((q) => {
                  const effectiveTotal = q.negotiated_total ?? q.total
                  return (
                    <label key={q.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedQuoteId === q.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="quote" value={q.id}
                        checked={selectedQuoteId === q.id}
                        onChange={() => setSelectedQuoteId(q.id)}
                        className="text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{q.supplier?.name}</p>
                        {q.quote_number && <p className="text-xs text-gray-400">Cot. {q.quote_number}</p>}
                        {q.negotiated_total && (
                          <p className="text-xs text-orange-600 font-medium">Precio negociado</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {q.negotiated_total ? (
                          <>
                            <p className="text-xs text-gray-400 line-through">{fmt(q.total)}</p>
                            <p className="text-sm font-semibold text-green-700">{fmt(q.negotiated_total)}</p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-blue-700">{fmt(effectiveTotal)}</p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código de aprobación personal</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} type="password"
                placeholder="Su código personal"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <p className="text-[10px] text-gray-400 mt-1">En modo demo el código es: 1234</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Aprobado por</label>
              <input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Su nombre completo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Firma digital</label>
              <SignatureCanvas onChange={setSignature} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={handleApprove} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Aprobando…' : 'Confirmar aprobación'}
            </button>
          </div>
        )}

        {tab === 'return' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
              La solicitud volverá a la encargada de compras con sus comentarios. 
              Ella podrá ajustar cotizaciones y reenviar para aprobación.
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                ¿Qué debe corregirse o conseguirse?
              </label>
              <textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} rows={4}
                placeholder="Ej: Conseguir cotización de Ferretería Nacional también. El precio de Ochoa parece muy alto comparado con el mercado…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={handleReturn} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              <RotateCcw className="w-4 h-4" />
              {loading ? 'Devolviendo…' : 'Devolver para revisión'}
            </button>
          </div>
        )}

        {tab === 'reject' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              El rechazo es definitivo. Si solo necesita ajustes, use "Devolver" en su lugar.
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Motivo del rechazo</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                placeholder="Explique el motivo…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={handleReject} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              <XCircle className="w-4 h-4" />
              {loading ? 'Rechazando…' : 'Rechazar definitivamente'}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-400 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Toda acción queda registrada con fecha, hora y responsable
        </p>
      </div>
    </Modal>
  )
}
