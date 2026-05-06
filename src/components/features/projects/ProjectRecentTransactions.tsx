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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-app-text">Últimas transacciones</h2>
        <Link to={`/proyectos/${projectId}/control`} className="text-xs text-blue-600 hover:text-blue-800">Ver todas</Link>
      </div>
      <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
        <table className="w-full">
          <tbody>
            {transactions.map((item) => (
              <tr key={item.id} className="border-b border-app-border last:border-0 hover:bg-app-hover">
                <td className="px-4 py-2.5 text-xs text-app-muted w-24">{new Date(item.date).toLocaleDateString('es-DO')}</td>
                <td className="px-4 py-2.5 text-xs text-app-text font-medium">{item.description}</td>
                <td className="px-4 py-2.5 text-xs text-app-muted">{item.supplier?.name || ''}</td>
                <td className="px-4 py-2.5 text-xs text-app-text font-medium text-right">{formatRD(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
