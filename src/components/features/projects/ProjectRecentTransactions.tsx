import { Link } from 'react-router-dom'
import type { TransactionWithRelations } from '@/services/transactionService'
import { formatRD } from '@/utils/currency'

interface Props {
  projectId: string
  transactions: TransactionWithRelations[]
}

export function ProjectRecentTransactions({ projectId, transactions }: Props) {
  if (transactions.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-lg font-medium text-app-text truncate">Últimas transacciones</h2>
        <Link to={`/proyectos/${projectId}/control`} className="text-xs text-blue-600 hover:text-blue-800 shrink-0 inline-flex items-center min-h-[44px] sm:min-h-0">Ver todas</Link>
      </div>

      {/* Desktop / tablet: tabla */}
      <div className="hidden sm:block bg-app-surface rounded-xl border border-app-border overflow-hidden">
        <table className="w-full">
          <tbody>
            {transactions.map((item) => (
              <tr key={item.id} className="border-b border-app-border last:border-0 hover:bg-app-hover">
                <td className="px-4 py-2.5 text-xs text-app-muted w-24 whitespace-nowrap">{new Date(item.date).toLocaleDateString('es-DO')}</td>
                <td className="px-4 py-2.5 text-xs text-app-text font-medium">{item.description}</td>
                <td className="px-4 py-2.5 text-xs text-app-muted">{item.supplier?.name || ''}</td>
                <td className="px-4 py-2.5 text-xs text-app-text font-medium text-right whitespace-nowrap">{formatRD(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {transactions.map((item) => (
          <div key={item.id} className="bg-app-surface rounded-xl border border-app-border p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-app-muted mb-1">
              <span className="whitespace-nowrap">{new Date(item.date).toLocaleDateString('es-DO')}</span>
              <span className="truncate text-right">{item.supplier?.name || ''}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-app-text font-medium flex-1 min-w-0 break-words">{item.description}</p>
              <p className="text-sm font-semibold whitespace-nowrap break-all text-red-600">{formatRD(item.total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
