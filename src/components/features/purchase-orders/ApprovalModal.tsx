import { useState } from 'react'
import { CheckCircle, XCircle, RotateCcw, ShieldCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { SignatureCanvas } from './SignatureCanvas'
import { approvalCode } from '@/utils/approvalCode'
import { isDemoMode } from '@/lib/supabase'
import type { PurchaseQuote } from '@/types/purchaseOrder'
import { getErrorMessage } from '@/utils/errors'
import { formatRD } from '@/utils/currency'

type Tab = 'approve' | 'return' | 'reject'

interface Props {
  open: boolean
  onClose: () => void
  quotes: PurchaseQuote[]
  onApprove: (
    quoteId: string,
    approvedBy: string,
    signature: string,
    singleQuoteJustification?: string | null,
  ) => Promise<void>
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
  const [singleQuoteJustification, setSingleQuoteJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSingleQuote = quotes.length === 1

  const reset = () => {
    setCode('')
    setApprovedBy('')
    setSignature(null)
    setReturnNotes('')
    setRejectReason('')
    setSingleQuoteJustification('')
    setError(null)
    setTab('approve')
    setSelectedQuoteId(quotes[0]?.id || '')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const withLoading = async (fn: () => Promise<void>) => {
    setError(null)
    setLoading(true)
    try {
      await fn()
      reset()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = () =>
    withLoading(async () => {
      if (!selectedQuoteId) throw new Error('Seleccione una cotización')
      if (!approvalCode.validate(code)) throw new Error('Código de aprobación incorrecto')
      if (!approvedBy.trim()) throw new Error('Ingrese su nombre')
      if (!signature) throw new Error('Se requiere la firma digital')
      if (isSingleQuote && !singleQuoteJustification.trim()) {
        throw new Error('Justificación obligatoria para aprobar con 1 sola cotización')
      }
      await onApprove(
        selectedQuoteId,
        approvedBy.trim(),
        signature,
        isSingleQuote ? singleQuoteJustification.trim() : null,
      )
    })

  const handleReturn = () =>
    withLoading(async () => {
      if (!returnNotes.trim()) throw new Error('Indique qué debe corregirse')
      await onReturn(returnNotes.trim())
    })

  const handleReject = () =>
    withLoading(async () => {
      if (!rejectReason.trim()) throw new Error('Ingrese el motivo del rechazo')
      await onReject(rejectReason.trim())
    })

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: 'approve', label: 'Aprobar', color: 'border-green-600 text-green-600' },
    { key: 'return', label: 'Devolver', color: 'border-orange-500 text-orange-500' },
    { key: 'reject', label: 'Rechazar', color: 'border-red-600 text-red-600' },
  ]

  return (
    <Modal open={open} onClose={handleClose} title="Revisión de solicitud de compra" width="max-w-xl">
      {/* On phones the modal body lives inside the overlay's vertical scroll
          container, so the inner column doesn't need its own max-height — but
          we keep generous touch targets and avoid horizontal overflow. */}
      <div className="space-y-4">
        {/* Tabs become horizontally scrollable on tiny screens so they never
            wrap or overflow the modal. */}
        <div className="flex border-b border-app-border -mx-1 px-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key)
                setError(null)
              }}
              className={`px-3 sm:px-4 py-2.5 min-h-11 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t.key ? t.color : 'border-transparent text-app-muted hover:text-app-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'approve' && (
          <div className="space-y-4">
            {isSingleQuote && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">Aprobación con 1 sola cotización</p>
                <p>
                  Para liberar esta OC se requiere justificación escrita obligatoria (urgencia, exclusividad de
                  proveedor, etc.) además de la firma del Director.
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-app-muted mb-2">
                Seleccione la cotización a aprobar
              </label>
              <div className="space-y-2">
                {quotes.map((q) => {
                  const effectiveTotal = q.negotiated_total ?? q.total
                  return (
                    <label
                      key={q.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors min-h-11 ${
                        selectedQuoteId === q.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/40'
                          : 'border-app-border hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="quote"
                        value={q.id}
                        checked={selectedQuoteId === q.id}
                        onChange={() => setSelectedQuoteId(q.id)}
                        className="text-green-600 w-4 h-4 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-app-text truncate">{q.supplier?.name}</p>
                        {q.quote_number && <p className="text-xs text-app-subtle truncate">Cot. {q.quote_number}</p>}
                        {q.negotiated_total && <p className="text-xs text-orange-600 font-medium">Precio negociado</p>}
                      </div>
                      <div className="text-right shrink-0">
                        {q.negotiated_total ? (
                          <>
                            <p className="text-xs text-app-subtle line-through whitespace-nowrap">
                              {formatRD(q.total)}
                            </p>
                            <p className="text-sm font-semibold text-green-700 whitespace-nowrap">
                              {formatRD(q.negotiated_total)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                            {formatRD(effectiveTotal)}
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">Código de aprobación personal</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                type="password"
                inputMode="numeric"
                placeholder="Su código personal"
                className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm min-h-11"
              />
              {isDemoMode && <p className="text-[10px] text-app-subtle mt-1">En modo demo el código es: 1234</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">Aprobado por</label>
              <input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Su nombre completo"
                className="w-full border border-app-border rounded-lg px-3 py-2.5 text-sm min-h-11"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">Firma digital</label>
              <SignatureCanvas onChange={setSignature} />
            </div>

            {isSingleQuote && (
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">
                  Justificación obligatoria (1 sola cotización) *
                </label>
                <textarea
                  value={singleQuoteJustification}
                  onChange={(e) => setSingleQuoteJustification(e.target.value)}
                  rows={3}
                  placeholder="Ej: Proveedor exclusivo del material XYZ; urgencia por vaciado del próximo lunes…"
                  className="w-full border border-app-border rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleApprove}
              disabled={loading}
              className="w-full min-h-12 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Aprobando…' : 'Confirmar aprobación'}
            </button>
          </div>
        )}

        {tab === 'return' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
              La solicitud volverá a la encargada de compras con sus comentarios. Ella podrá ajustar cotizaciones y
              reenviar para aprobación.
            </div>
            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">
                ¿Qué debe corregirse o conseguirse?
              </label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={4}
                placeholder="Ej: Conseguir cotización de Ferretería Nacional también. El precio de Ochoa parece muy alto comparado con el mercado…"
                className="w-full border border-app-border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleReturn}
              disabled={loading}
              className="w-full min-h-12 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
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
              <label className="block text-xs font-medium text-app-muted mb-1">Motivo del rechazo</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Explique el motivo…"
                className="w-full border border-app-border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleReject}
              disabled={loading}
              className="w-full min-h-12 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {loading ? 'Rechazando…' : 'Rechazar definitivamente'}
            </button>
          </div>
        )}

        <p className="text-xs text-app-subtle flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Toda acción queda registrada con fecha, hora y responsable
        </p>
      </div>
    </Modal>
  )
}
