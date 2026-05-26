import { ChevronRight, HardHat, Pencil, Phone, Plus, Search } from 'lucide-react'
import { useCallback, useMemo, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Contractor } from '@/types/database'
import { useAppRoles } from '@/hooks/useAppRoles'

export function ContractorsHeader({
  total,
  active,
  onNew,
}: {
  total: number
  active: number
  onNew: () => void
}) {
  const { t } = useTranslation()
  const { canWriteContractors } = useAppRoles()
  return (
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-app-text">{t('contractors.title')}</h1><div className="flex items-center gap-2 mt-1"><span className="text-sm text-app-muted">{t('contractors.registered', { count: total })}</span>{active > 0 && <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full">{t('contractors.active', { count: active })}</span>}</div></div>
      {canWriteContractors && (
        <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-600/20 shrink-0"><Plus className="w-4 h-4" /> {t('contractors.new')}</button>
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
  const { t } = useTranslation()
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
      <input type="text" placeholder={t('contractors.search_placeholder')} value={value} onChange={(event) => onChange(event.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" />
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
  const { t } = useTranslation()
  const { canWriteContractors } = useAppRoles()
  const METHOD_LABEL: Record<string, string> = {
    cash: t('contractors.payment_methods.cash'),
    check: t('contractors.payment_methods.check'),
    transfer: t('contractors.payment_methods.transfer'),
  }
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
      {contractors.map((contractor) => {
        const parent = contractor.parent_contractor_id ? contractorsById.get(contractor.parent_contractor_id) : undefined
        const isSub = !!contractor.parent_contractor_id
        return (
          <div key={contractor.id} className={`group bg-app-surface rounded-xl border border-app-border p-4 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm transition-all ${isSub ? 'md:ml-6 border-l-4 border-l-amber-400 dark:border-l-amber-600' : ''}`}>
            <div className="flex items-start gap-3">
              <Link to={`/contratistas/${contractor.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"><HardHat className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-app-text truncate text-sm">{contractor.name}</p>
                  <p className="text-xs text-app-muted mt-0.5 truncate">{contractor.specialty || t('contractors.no_specialty')}</p>
                  {isSub && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" title={t('contractors.sub_contractor')}>
                        {t('contractors.sub_contractor_of', { name: parent?.name ?? '...' })}
                      </span>
                    </div>
                  )}
                  {contractor.phone && <div className="flex items-center gap-1 mt-1 text-[11px] text-app-subtle"><Phone className="w-3 h-3" />{contractor.phone}</div>}
                  <div className="flex items-center gap-2 mt-2"><span className="text-[11px] px-2 py-0.5 rounded-full bg-app-chip text-app-muted font-medium">{METHOD_LABEL[contractor.payment_method] || contractor.payment_method}</span><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${contractor.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-app-chip text-app-subtle'}`}>{contractor.is_active ? t('contractors.status_active') : t('contractors.status_inactive')}</span></div>
                </div>
              </Link>
              <div className="flex flex-col items-center gap-1 shrink-0">
                {canWriteContractors && (
                  <button data-contractor-id={contractor.id} onClick={handleEditClick} className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all" title={t('contractors.edit')}><Pencil className="w-3.5 h-3.5" /></button>
                )}
                <Link to={`/contratistas/${contractor.id}`} className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors" title={t('contractors.view_detail')}><ChevronRight className="w-4 h-4" /></Link>
              </div>
            </div>
          </div>
        )
      })}
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
  const { t } = useTranslation()
  const { canWriteContractors } = useAppRoles()
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center mx-auto mb-4"><HardHat className="w-7 h-7 text-amber-600 dark:text-amber-400" /></div>
      <p className="text-base font-semibold text-app-text mb-1">{hasSearch ? t('contractors.empty_no_results') : t('contractors.empty_no_contractors')}</p>
      <p className="text-sm text-app-muted mb-5">{hasSearch ? t('contractors.empty_try_other') : t('contractors.empty_register')}</p>
      {!hasSearch && canWriteContractors && <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"><Plus className="w-4 h-4" /> {t('contractors.new_contractor')}</button>}
    </div>
  )
}
