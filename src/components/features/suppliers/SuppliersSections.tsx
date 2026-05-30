import { Pencil, Plus, Search, Truck } from 'lucide-react'
import { useCallback, useMemo, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Supplier } from '@/types/database'
import { useAppRoles } from '@/hooks/useAppRoles'

export function SuppliersHeader({ total, active, onNew }: { total: number; active: number; onNew: () => void }) {
  const { t } = useTranslation()
  const { canWriteSuppliers } = useAppRoles()
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-app-text">{t('suppliers.title')}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-app-muted">{t('suppliers.registered', { count: total })}</span>
          {active > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full">
              {t('suppliers.active', { count: active })}
            </span>
          )}
        </div>
      </div>
      {canWriteSuppliers && (
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> {t('suppliers.new')}
        </button>
      )}
    </div>
  )
}

export function SuppliersSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
      <input
        type="text"
        placeholder={t('suppliers.search_placeholder')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
      />
    </div>
  )
}

export function SuppliersTable({ suppliers, onEdit }: { suppliers: Supplier[]; onEdit: (supplier: Supplier) => void }) {
  const { t } = useTranslation()
  const { canWriteSuppliers } = useAppRoles()
  const suppliersById = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier])), [suppliers])

  const handleEditClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const supplierId = event.currentTarget.dataset.supplierId
      if (!supplierId) return
      const supplier = suppliersById.get(supplierId)
      if (supplier) onEdit(supplier)
    },
    [onEdit, suppliersById],
  )

  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-xs">
      <table className="w-full text-sm hidden sm:table">
        <thead>
          <tr className="bg-app-bg border-b border-app-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">
              {t('suppliers.table.supplier')}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden sm:table-cell">
              {t('suppliers.table.rnc')}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide hidden md:table-cell">
              {t('suppliers.table.payment_terms')}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-app-subtle uppercase tracking-wide">
              {t('suppliers.table.status')}
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border">
          {suppliers.map((supplier) => (
            <tr key={supplier.id} className="hover:bg-app-hover transition-colors group">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-app-text text-sm">{supplier.name}</span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-sm text-app-muted hidden sm:table-cell">
                {supplier.rnc || <span className="text-app-subtle">—</span>}
              </td>
              <td className="px-4 py-3.5 text-sm text-app-muted hidden md:table-cell">
                {supplier.payment_terms || <span className="text-app-subtle">—</span>}
              </td>
              <td className="px-4 py-3.5">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${supplier.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-app-chip text-app-subtle'}`}
                >
                  {supplier.is_active ? t('suppliers.status_active') : t('suppliers.status_inactive')}
                </span>
              </td>
              <td className="px-2 py-3.5">
                {canWriteSuppliers && (
                  <button
                    data-supplier-id={supplier.id}
                    onClick={handleEditClick}
                    className="p-1.5 rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-all"
                    title={t('suppliers.edit')}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sm:hidden divide-y divide-app-border">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-app-text text-sm truncate">{supplier.name}</div>
                {supplier.rnc && <div className="text-xs text-app-subtle mt-0.5">{supplier.rnc}</div>}
                {supplier.payment_terms && (
                  <div className="text-xs text-app-subtle mt-0.5">{supplier.payment_terms}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${supplier.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-app-chip text-app-subtle'}`}
              >
                {supplier.is_active ? t('suppliers.status_active') : t('suppliers.status_inactive')}
              </span>
              {canWriteSuppliers && (
                <button
                  data-supplier-id={supplier.id}
                  onClick={handleEditClick}
                  className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-app-subtle hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  title={t('suppliers.edit')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmptySuppliersState({ hasSearch, onNew }: { hasSearch: boolean; onNew: () => void }) {
  const { t } = useTranslation()
  const { canWriteSuppliers } = useAppRoles()
  return (
    <div className="bg-app-surface rounded-xl border border-app-border p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center mx-auto mb-4">
        <Truck className="w-7 h-7 text-purple-600 dark:text-purple-400" />
      </div>
      <p className="text-base font-semibold text-app-text mb-1">
        {hasSearch ? t('suppliers.empty_no_results') : t('suppliers.empty_no_suppliers')}
      </p>
      <p className="text-sm text-app-muted mb-5">
        {hasSearch ? t('suppliers.empty_try_other') : t('suppliers.empty_register')}
      </p>
      {!hasSearch && canWriteSuppliers && (
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('suppliers.new_supplier')}
        </button>
      )}
    </div>
  )
}
