import { ChevronRight, Layers, Trash2 } from 'lucide-react'
import { formatRD } from '@/utils/currency'
import type { ContractSummary } from '@/services/cubicationService'

export function ContractsTable({
  loading,
  contracts,
  projectId,
  onOpen,
  onDelete,
  onCreateFirst,
}: {
  loading: boolean
  contracts: ContractSummary[]
  projectId: string
  onOpen: (contractId: string) => void
  onDelete: (contractId: string) => void
  onCreateFirst: () => void
}) {
  if (loading) return <div className="text-sm text-app-muted">Cargando contratos...</div>
  if (contracts.length === 0) {
    return <div className="bg-app-surface rounded-xl border border-app-border p-10 text-center"><Layers className="w-10 h-10 text-app-subtle mx-auto mb-3" /><p className="text-app-muted">No hay contratos registrados</p><button onClick={onCreateFirst} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">Crear el primero</button></div>
  }

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-app-bg border-b border-app-border"><th className="px-4 py-2.5 text-left text-[10px] font-semibold text-app-muted uppercase">Contratista</th><th className="px-4 py-2.5 text-center text-[10px] font-semibold text-app-muted uppercase hidden sm:table-cell">Partidas</th><th className="px-4 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase">Acordado</th><th className="px-4 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">Acumulado</th><th className="px-4 py-2.5 text-right text-[10px] font-semibold text-app-muted uppercase hidden md:table-cell">Pendiente</th><th className="px-4 py-2.5 text-center text-[10px] font-semibold text-app-muted uppercase">% Avance</th><th className="px-4 py-2.5 text-center text-[10px] font-semibold text-app-muted uppercase hidden lg:table-cell">Retención</th><th className="w-16" /></tr></thead>
        <tbody className="divide-y divide-app-border">
          {contracts.map((contract) => (
            <tr key={contract.id} onClick={() => onOpen(contract.id)} className="hover:bg-app-hover cursor-pointer">
              <td className="px-4 py-3"><p className="font-medium text-app-text text-xs">{contract.contractor?.name || '—'}</p><p className="text-[10px] text-app-muted">{contract.contractor?.specialty}</p></td>
              <td className="px-4 py-3 text-center hidden sm:table-cell"><span className="text-xs text-app-muted bg-app-chip px-2 py-0.5 rounded-full">{contract.partidas_count}</span></td>
              <td className="px-4 py-3 text-right text-xs text-app-text font-medium">{formatRD(contract.acordado)}</td>
              <td className="px-4 py-3 text-right text-xs text-blue-700 hidden md:table-cell">{formatRD(contract.acumulado)}</td>
              <td className={`px-4 py-3 text-right text-xs font-semibold hidden md:table-cell ${contract.pendiente >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatRD(contract.pendiente)}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-2 justify-center"><div className="w-14 h-1.5 bg-app-chip rounded-full overflow-hidden"><div className={`h-full rounded-full ${contract.completion_percent > 90 ? 'bg-red-500' : contract.completion_percent > 60 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${contract.completion_percent}%` }} /></div><span className="text-[10px] text-app-muted w-8">{contract.completion_percent.toFixed(0)}%</span></div></td>
              <td className="px-4 py-3 text-center text-xs text-app-muted hidden lg:table-cell">{formatRD(contract.retenido)}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-1 justify-end"><button onClick={(e) => { e.stopPropagation(); onDelete(contract.id) }} className="p-1 text-app-subtle hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button><ChevronRight className="w-4 h-4 text-app-subtle" /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
