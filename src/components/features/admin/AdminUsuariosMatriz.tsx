import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, LayoutGrid, List } from 'lucide-react'
import { adminService, type Capability, type Role, type RoleCapability } from '@/services/adminService'
import { useToast } from '@/components/ui/Toast'

const SECTION_ORDER = [
  'proyecto', 'nomina', 'compras', 'almacen', 'obra',
  'cubicaciones', 'finanzas', 'maestros', 'cross', 'admin',
] as const

export function AdminUsuariosMatriz() {
  const { t } = useTranslation()
  const SECTION_LABEL: Record<string, string> = {
    proyecto: t('admin.matriz.sections.proyecto'),
    nomina: t('admin.matriz.sections.nomina'),
    compras: t('admin.matriz.sections.compras'),
    almacen: t('admin.matriz.sections.almacen'),
    obra: t('admin.matriz.sections.obra'),
    cubicaciones: t('admin.matriz.sections.cubicaciones'),
    finanzas: t('admin.matriz.sections.finanzas'),
    maestros: t('admin.matriz.sections.maestros'),
    cross: t('admin.matriz.sections.cross'),
    admin: t('admin.matriz.sections.admin'),
  }
  const [roles, setRoles] = useState<Role[]>([])
  const [caps, setCaps] = useState<Capability[]>([])
  const [mappings, setMappings] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'matrix' | 'byRole'>('byRole')
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const { error, success } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rolesData, capsData, mappingsData] = await Promise.all([
        adminService.listRoles(),
        adminService.listCapabilities(),
        adminService.listRoleCapabilities(),
      ])
      setRoles(rolesData)
      setCaps(capsData)
      setMappings(new Set(mappingsData.map((m: RoleCapability) => `${m.role_id}:${m.capability_id}`)))
    } catch (err) {
      error(err instanceof Error ? err.message : t('admin.matriz.load_failed'))
    } finally {
      setLoading(false)
    }
  }, [error, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      // Prefer the first non-director role for the mobile view
      const initial = roles.find((r) => !r.is_director) ?? roles[0]
      setSelectedRoleId(initial.id)
    }
  }, [roles, selectedRoleId])

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  )

  const groupedCaps = useMemo(() => {
    const groups: Record<string, Capability[]> = {}
    for (const c of caps) {
      if (!groups[c.section]) groups[c.section] = []
      groups[c.section].push(c)
    }
    return Object.entries(groups).sort((a, b) => {
      const ai = SECTION_ORDER.indexOf(a[0] as typeof SECTION_ORDER[number])
      const bi = SECTION_ORDER.indexOf(b[0] as typeof SECTION_ORDER[number])
      return ai - bi
    })
  }, [caps])

  async function toggle(role: Role, cap: Capability) {
    if (role.slug === 'director_general') return // DG bypasea, no se edita
    if (savingKey) return // evitar doble-click mientras hay un toggle en curso
    const key = `${role.id}:${cap.id}`
    const has = mappings.has(key)
    setSavingKey(key)
    try {
      if (has) {
        await adminService.revokeCapability(role.id, cap.id)
        const next = new Set(mappings); next.delete(key); setMappings(next)
      } else {
        await adminService.grantCapability(role.id, cap.id)
        const next = new Set(mappings); next.add(key); setMappings(next)
      }
      success(`${role.name}: ${has ? t('admin.matriz.without') : t('admin.matriz.with')} ${cap.name}`)
    } catch (err) {
      console.warn('[AdminUsuariosMatriz] toggle failed', err)
      error(err instanceof Error ? err.message : t('admin.matriz.save_failed'))
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return <div className="text-sm text-app-muted">{t('admin.matriz.loading')}</div>
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-app-muted">
        {t('admin.matriz.instruction')}
      </div>

      {/* Mobile view selector */}
      <div className="md:hidden flex items-center gap-2">
        <div className="inline-flex rounded-xl border border-app-border bg-app-surface p-1">
          <button
            type="button"
            onClick={() => setMobileView('byRole')}
            className={`flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-semibold rounded-lg ${
              mobileView === 'byRole' ? 'bg-blue-600 text-white' : 'text-app-muted'
            }`}
          >
            <List className="w-4 h-4" /> {t('admin.matriz.by_role')}
          </button>
          <button
            type="button"
            onClick={() => setMobileView('matrix')}
            className={`flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-semibold rounded-lg ${
              mobileView === 'matrix' ? 'bg-blue-600 text-white' : 'text-app-muted'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> {t('admin.matriz.matrix')}
          </button>
        </div>
      </div>

      {/* Matrix view (desktop always; mobile only when matrix selected) */}
      <div className={`bg-app-surface rounded-xl border border-app-border overflow-x-auto ${mobileView === 'byRole' ? 'hidden md:block' : ''}`}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-app-surface">
            <tr className="border-b border-app-border bg-app-bg">
              <th className="text-left px-3 py-2 text-xs font-bold text-app-subtle uppercase tracking-wide sticky left-0 bg-app-bg z-10 min-w-[260px]">{t('admin.matriz.action')}</th>
              {roles.map((r) => (
                <th key={r.id} className="px-2 py-2 text-center text-xs font-bold text-app-subtle uppercase tracking-wide min-w-[80px]" title={r.description ?? r.name}>
                  {r.is_director ? <span className="text-amber-600">{r.name}</span> : r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedCaps.map(([section, sectionCaps]) => (
              <Fragment key={section}>
                <tr className="bg-blue-50/40 dark:bg-blue-950/30">
                  <td colSpan={roles.length + 1} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                    {SECTION_LABEL[section] ?? section}
                  </td>
                </tr>
                {sectionCaps.map((c) => (
                  <tr key={c.id} className="border-t border-app-border hover:bg-app-hover">
                    <td className="px-3 py-2 sticky left-0 bg-app-surface group-hover:bg-app-hover">
                      <div className="font-medium text-app-text">{c.name}</div>
                      <div className="text-[10px] uppercase tracking-wide text-app-subtle">{c.slug} · {c.scope}</div>
                    </td>
                    {roles.map((r) => {
                      const key = `${r.id}:${c.id}`
                      const checked = r.is_director || mappings.has(key)
                      const isSaving = savingKey === key
                      const disabled = r.is_director
                      return (
                        <td key={r.id} className="px-2 py-2 text-center">
                          <button
                            onClick={() => toggle(r, c)}
                            disabled={disabled || isSaving}
                            title={disabled ? t('admin.matriz.director_bypass_tooltip') : checked ? t('admin.matriz.checked_tooltip') : t('admin.matriz.unchecked_tooltip')}
                            aria-label={`${r.name} - ${c.name}: ${checked ? t('admin.matriz.aria_access_yes') : t('admin.matriz.aria_access_no')}`}
                            className={`relative w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors before:absolute before:inset-0 before:-m-2 before:content-[''] ${
                              checked
                                ? (disabled ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50' : 'bg-emerald-500 text-white hover:bg-emerald-600')
                                : 'bg-app-chip text-app-subtle hover:bg-app-border'
                            } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : checked ? <Check className="w-4 h-4" /> : null}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile alt view: por rol (single role -> all caps) */}
      <div className={`md:hidden ${mobileView === 'matrix' ? 'hidden' : 'block'}`}>
        <label className="text-xs font-medium text-app-muted mb-1 block">{t('admin.matriz.role_label')}</label>
        <select
          value={selectedRoleId ?? ''}
          onChange={(e) => setSelectedRoleId(e.target.value || null)}
          className="w-full min-h-[44px] px-3 py-2 text-sm border border-app-border rounded-xl bg-app-bg text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}{r.is_director ? t('admin.matriz.bypass_suffix') : ''}
            </option>
          ))}
        </select>

        {selectedRole && (
          <div className="mt-3 bg-app-surface rounded-xl border border-app-border overflow-hidden">
            {selectedRole.is_director && (
              <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                {t('admin.matriz.director_bypass')}
              </div>
            )}
            {groupedCaps.map(([section, sectionCaps]) => (
              <div key={section} className="border-b border-app-border last:border-b-0">
                <div className="px-3 py-1.5 bg-blue-50/40 dark:bg-blue-950/30 text-[11px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                  {SECTION_LABEL[section] ?? section}
                </div>
                <ul className="divide-y divide-app-border">
                  {sectionCaps.map((c) => {
                    const key = `${selectedRole.id}:${c.id}`
                    const checked = selectedRole.is_director || mappings.has(key)
                    const isSaving = savingKey === key
                    const disabled = selectedRole.is_director
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-app-text text-sm">{c.name}</div>
                          <div className="text-[10px] uppercase tracking-wide text-app-subtle">{c.slug} · {c.scope}</div>
                        </div>
                        <button
                          onClick={() => toggle(selectedRole, c)}
                          disabled={disabled || isSaving}
                          aria-label={`${c.name}: ${checked ? t('admin.matriz.aria_tap_remove') : t('admin.matriz.aria_tap_grant')}`}
                          title={disabled ? t('admin.matriz.director_bypass_tooltip') : checked ? t('admin.matriz.checked_tooltip') : t('admin.matriz.unchecked_tooltip')}
                          className={`shrink-0 w-11 h-11 rounded-lg inline-flex items-center justify-center transition-colors ${
                            checked
                              ? (disabled ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50' : 'bg-emerald-500 text-white hover:bg-emerald-600')
                              : 'bg-app-chip text-app-subtle hover:bg-app-border'
                          } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : checked ? <Check className="w-5 h-5" /> : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
