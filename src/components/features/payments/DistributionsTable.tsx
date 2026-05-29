import { Trash2, CheckCircle } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { PaymentDistribution } from '@/types/database'

const METHOD_LABELS: Record<PaymentDistribution['payment_method'], string> = {
  transfer: 'Transferencia',
  check: 'Cheque',
  deposit: 'Depósito',
  cash: 'Efectivo',
}

interface Props {
  distributions: PaymentDistribution[]
  totalDistributed: number
  resolveSourceAccount: (bankAccountId: string) => string | undefined
  onComplete: (id: string) => void
  onDelete: (distribution: PaymentDistribution) => void
}

const th = 'px-4 py-2 text-left text-[10px] font-semibold text-app-muted uppercase'

export function DistributionsTable({
  distributions,
  totalDistributed,
  resolveSourceAccount,
  onComplete,
  onDelete,
}: Props) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className={th}>Beneficiario</th>
            <th className={th}>Banco / Cuenta</th>
            <th className={th}>Origen</th>
            <th className={th}>Método</th>
            <th className={`${th} text-right`}>Monto</th>
            <th className={`${th} text-center`}>Estado</th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {distributions.map((d) => {
            const source = d.bank_account_id ? resolveSourceAccount(d.bank_account_id) : undefined
            return (
              <tr key={d.id} className="hover:bg-app-hover">
                <td className="px-4 py-2.5 text-xs text-app-text">
                  {d.beneficiary || '—'}
                  {d.beneficiary_doc ? (
                    <span className="block text-app-subtle text-[10px]">
                      {d.beneficiary_type === 'supplier' ? 'RNC' : 'Céd.'}: {d.beneficiary_doc}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-xs text-app-muted">
                  {d.bank_name || '—'}
                  {d.bank_account ? <span className="text-app-subtle ml-1 text-[10px]">{d.bank_account}</span> : null}
                </td>
                <td className="px-4 py-2.5 text-xs text-app-muted">{source || '—'}</td>
                <td className="px-4 py-2.5 text-xs text-app-muted">
                  {METHOD_LABELS[d.payment_method] ?? d.payment_method}
                  {d.check_number ? ` #${d.check_number}` : ''}
                </td>
                <td className="px-4 py-2.5 text-xs font-semibold text-app-text text-right">{formatRD(d.amount)}</td>
                <td className="px-4 py-2.5 text-center">
                  {d.status === 'completed' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                      Completado
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                      Pendiente
                    </span>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    {d.status !== 'completed' && (
                      <button
                        onClick={() => onComplete(d.id)}
                        title="Marcar completado"
                        className="p-1 text-app-subtle hover:text-green-500"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(d)}
                      title="Eliminar pago"
                      className="p-1 text-app-subtle hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-app-bg border-t border-app-border">
            <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-app-muted">
              Total distribuido
            </td>
            <td className="px-4 py-2 text-xs font-bold text-app-text text-right">{formatRD(totalDistributed)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
