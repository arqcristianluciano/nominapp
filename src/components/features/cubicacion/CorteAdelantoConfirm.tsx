import { AlertTriangle, Link2, Minus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { formatRD } from '@/utils/currency'
import type { ContractCorte, AdjustmentContract } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  corte: ContractCorte & { contract: AdjustmentContract | null }
  adelantoTotal: number
  linking: boolean
  onLink: (deductAdelantos: boolean) => void
}

export function CorteAdelantoConfirm({ open, onClose, corte, adelantoTotal, linking, onLink }: Props) {
  const contractorName = (corte.contract as any)?.contractor?.name ?? '—'
  const partidaDesc = (corte.partida as any)?.description ?? '—'
  const neto = corte.amount - corte.retention_amount

  return (
    <Modal open={open} onClose={onClose} title={`Vincular corte #${corte.cut_number}`}>
      <div className="space-y-4">
        <div className="bg-app-bg border border-app-border rounded-lg p-3 text-sm space-y-1">
          <p className="font-medium text-app-text">{contractorName}</p>
          <p className="text-xs text-app-muted">{partidaDesc}</p>
          <p className="text-xs text-app-muted">
            Monto: <span className="font-semibold text-app-text">{formatRD(corte.amount)}</span>
            {corte.retention_amount > 0 && (
              <> · Retención: <span className="text-amber-600">{formatRD(corte.retention_amount)}</span>
              · Neto: <span className="font-semibold text-green-700">{formatRD(neto)}</span></>
            )}
          </p>
        </div>

        <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">Este contrato tiene adelantos pendientes</p>
            <p className="text-xs mt-0.5">
              Total adelantos: <strong>{formatRD(adelantoTotal)}</strong>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onLink(true)}
            disabled={linking}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Minus className="w-4 h-4" />
            {linking ? 'Vinculando...' : `Vincular y descontar ${formatRD(adelantoTotal)} de adelantos`}
          </button>
          <button
            onClick={() => onLink(false)}
            disabled={linking}
            className="w-full flex items-center justify-center gap-2 border border-app-border hover:bg-app-hover text-app-text py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            Vincular sin descontar adelantos
          </button>
        </div>
      </div>
    </Modal>
  )
}
