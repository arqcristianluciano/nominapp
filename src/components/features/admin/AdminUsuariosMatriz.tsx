import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { adminService, type Capability, type Role, type RoleCapability } from '@/services/adminService'
import { useToast } from '@/components/ui/Toast'

const SECTION_LABEL: Record<string, string> = {
  proyecto: '1. Proyecto y presupuesto',
  nomina: '2. Nómina',
  compras: '3. Compras',
  almacen: '4. Almacén',
  obra: '5. Obra',
  cubicaciones: '6. Cubicaciones',
  finanzas: '7. Finanzas',
  maestros: '8. Maestros',
  cross: '9. Cross-empresa',
  admin: '10. Administración',
}

export function AdminUsuariosMatriz() {
  const [roles, setRoles] = useState<Role[]>([])
  const [caps, setCaps] = useState<Capability[]>([])
  const [mappings, setMappings] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
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
      error(err instanceof Error ? err.message : 'No se pudo cargar la matriz')
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => {
    void load()
  }, [load])

  const groupedCaps = useMemo(() => {
    const groups: Record<string, Capability[]> = {}
    for (const c of caps) {
      if (!groups[c.section]) groups[c.section] = []
      groups[c.section].push(c)
    }
    return Object.entries(groups).sort((a, b) => {
      const ai = Object.keys(SECTION_LABEL).indexOf(a[0])
      const bi = Object.keys(SECTION_LABEL).indexOf(b[0])
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
      success(`${role.name}: ${has ? 'Sin' : 'Con'} ${cap.name}`)
    } catch (err) {
      console.warn('[AdminUsuariosMatriz] toggle failed', err)
      error(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return <div className="text-sm text-app-muted">Cargando matriz...</div>
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-app-muted">
        Tildea o destildea cualquier celda. Los cambios se aplican inmediatamente a la base de datos y a la UI.
      </div>
      <div className="bg-app-surface rounded-xl border border-app-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-app-surface">
            <tr className="border-b border-app-border bg-app-bg">
              <th className="text-left px-3 py-2 text-xs font-bold text-app-subtle uppercase tracking-wide sticky left-0 bg-app-bg z-10 min-w-[260px]">Acción</th>
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
                            title={disabled ? 'El Director General bypassa RLS' : checked ? 'Tildado: tiene acceso' : 'Sin acceso'}
                            className={`w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors ${
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
    </div>
  )
}
