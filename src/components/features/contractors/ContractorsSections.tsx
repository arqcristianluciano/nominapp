import { ChevronRight, HardHat, Pencil, Phone, Plus, Search } from 'lucide-react'
import { useCallback, useMemo, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Contractor } from '@/types/database'
import { useAppRoles } from '@/hooks/useAppRoles'

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  check: 'Cheque',
  transfer: 'Transferencia',
}

export function ContractorsHeader({
  total,
  active,
  onNew,
}: {
  total: number
  active: number
  onNew: () => void
}) {
  const { canWriteContractors } = useAppRoles()
  return (
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-app-text">Contratistas</h1><div className="flex items-center gap-2 mt-1"><span className="text-sm text-app-muted">{total} registrados</span>{active > 0 && <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full">{active} activos</span>}</div></div>
      {canWriteContractors && (
        <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-600/20 shrink-0"><Plus className="w-4 h-4" /> Nuevo</button>
      )}
    </div>
  )
}

export function ContractorsSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
      <input type="text" placeholder="Buscar contratista..." value={value} onChange={(event) => onChange(event.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" />
    </div>
  )
}

export function ContractorsGrid({
  contractors,
  onEdit,
}: {
  contractors: Contractor[]
  onEdit: (contractor: Contractor) => void
}) {
  const { canWriteContractors } = useAppRoles()
  const contractorsById = useMemo(
    () => new Map(contractors.map((contractor) => [contractor.id, contractor])),
    [contractors],
  )

  const handleEditClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const contractorId = event.currentTarget.dataset.contractorId
      if (!contractorId) return
      const contractor = contractorsById.get(contractorId)
      if (contractor) onEdit(contractor)
    },
    [contractorsById, onEdit],
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {contractors.map((contractor) => (
        <div key={contractor.id} className="group bg-app-surface rounded-xl border border-app-border p-4 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm transition-all">
          <div className="flex items-start gap-3">
            <Link to={`/contratistas/${contractor.id}`} className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"><HardHat className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-app-text truncate text-sm">{contractor.name}</p>
                <p className="text-xs text-app-muted mt-0.5 truncate">{contractor.specialty || 'Sin especialidad'}</p>
                {contractor.phone && <div className="flex items-center gap-1 mt-1 text-[11px] text-app-subtle"><Phone className="w-3 h-3" />{contractor.phone}</div>}
                <div className="flex items-center gap-2 mt-2"><span className="text-[11px] px-2 py-0.5 rounded-full bg-app-chip text-app-muted font-medium">{METHOD_LABEL[contractor.payment_method] || contractor.payment_method}</span><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${contractor.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-app-chip text-app-subtle'}`}>{contractor.is_active ? 'Activo' : 'Inactivo'}</span></div>
              </div>
            </Link>
            <div className="flex flex-col items-center gap-1 shrink-0">
              {canWriteContractors && (
                <button data-contractor-id={contractor.id} onClick={handleEditClick} className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
              )}
              <Link to={`/contratistas/${contractor.id}`} className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors" title="Ver detalle"><ChevronRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyContractorsState({
  hasSearch,
  onNew,
}: {
  hasSearch: boolean
  onNew: () => void
}) {
  const { canWriteContractors } = useAppRoles()
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center mx-auto mb-4"><HardHat className="w-7 h-7 text-amber-600 dark:text-amber-400" /></div>
      <p className="text-base font-semibold text-app-text mb-1">{hasSearch ? 'Sin resultados' : 'Sin contratistas aún'}</p>
      <p className="text-sm text-app-muted mb-5">{hasSearch ? 'Intenta con otro nombre o especialidad' : 'Registra contratistas para asignarlos a obras'}</p>
      {!hasSearch && canWriteContractors && <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"><Plus className="w-4 h-4" /> Nuevo contratista</button>}
    </div>
  )
}
