import { Plus } from 'lucide-react'
import type { PurchaseQuote } from '@/types/purchaseOrder'
import { QuotesPanel } from './QuotesPanel'

interface Props {
  quotes: PurchaseQuote[]
  approvedQuoteId: string | null
  canEdit: boolean
  canNegotiate: boolean
  missingQuotes: number
  onOpenAdd: () => void
  onDelete: (quoteId: string) => void
  onNegotiate: (quoteId: string, total: number | null, notes: string | null) => Promise<void>
}

export function PurchaseOrderQuotesSection({
  quotes,
  approvedQuoteId,
  canEdit,
  canNegotiate,
  missingQuotes,
  onOpenAdd,
  onDelete,
  onNegotiate,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-app-text">Cotizaciones <span className="text-app-subtle font-normal text-sm">({quotes.length})</span></h2>
          {canEdit && missingQuotes > 0 && <p className="text-xs text-amber-600 mt-0.5">Faltan {missingQuotes} cotización{missingQuotes !== 1 ? 'es' : ''} para enviar a aprobación</p>}
          {canNegotiate && quotes.length > 0 && <p className="text-xs text-app-subtle mt-0.5">Haz clic en <span className="font-medium">✏</span> en cada tarjeta para registrar un precio negociado</p>}
        </div>
        {canEdit && <button onClick={onOpenAdd} className="flex items-center gap-2 text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg"><Plus className="w-3.5 h-3.5" /> Agregar cotización</button>}
      </div>
      <QuotesPanel quotes={quotes} approvedQuoteId={approvedQuoteId} canDelete={canEdit} canNegotiate={canNegotiate} onDelete={onDelete} onNegotiate={onNegotiate} />
    </div>
  )
}
