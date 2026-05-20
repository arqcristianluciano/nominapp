import { useEffect, useState } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { ProjectRole } from '@/hooks/useProjectRoles'

export interface UseAppRolesResult {
  roles: ProjectRole[]
  caps: Set<string>
  loading: boolean
  isDirector: boolean
  can: (capability: string) => boolean
  hasAny: (...candidates: ProjectRole[]) => boolean

  // Seccion 7
  canWriteLedger: boolean
  canViewFinanzas: boolean
  canWriteLoans: boolean

  // Seccion 8
  canWriteContractors: boolean
  canWriteSuppliers: boolean
  canWriteMaterialsCatalog: boolean
  canWriteBankAccounts: boolean
  canViewBankAccounts: boolean

  // Seccion 9
  canViewDirectorDashboard: boolean
  canViewApprovalsLog: boolean
  canViewReportes: boolean
  canViewPriceHistory: boolean

  // Derivados
  canCreateAnyRequisition: boolean
  canCreateProject: boolean

  // Admin
  canManageUsers: boolean
  canManageRoles: boolean
}

const DEMO_CAPS = new Set([
  'edit_project','edit_budget','create_payroll','edit_payroll','approve_payroll',
  'create_requisition','load_quotes','release_purchase_order','receive_order',
  'inventory_write','override_stock',
  'write_ledger','mark_paid','issue_check','write_loans','view_cashflow',
  'write_contractors','write_suppliers','write_materials_catalog','write_bank_accounts',
  'view_director_dashboard','view_approvals_log','view_reportes','view_price_history',
  'manage_users','manage_roles',
])

const DEMO_ROLES: ProjectRole[] = [
  'director_proyecto', 'planificacion', 'ingeniero_obra',
  'comprador', 'almacenista', 'contabilidad',
]

/**
 * Capabilities app-wide. Inspecciona los roles del usuario en todos los
 * proyectos y resuelve sus capabilities efectivas. Para acciones por
 * proyecto, usar useProjectRoles(projectId).
 */
export function useAppRoles(): UseAppRolesResult {
  const user = useAuthStore((s) => s.user)
  const [roles, setRoles] = useState<ProjectRole[]>([])
  const [caps, setCaps] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) {
        if (!cancelled) {
          setRoles([])
          setCaps(new Set())
          setLoading(false)
        }
        return
      }
      if (isDemoMode) {
        if (!cancelled) {
          setRoles(DEMO_ROLES)
          setCaps(new Set(DEMO_CAPS))
          setLoading(false)
        }
        return
      }
      try {
        const [{ data: memberData }, { data: capData }] = await Promise.all([
          supabase.from('project_members').select('role').eq('user_id', user.id),
          supabase.rpc('user_app_capabilities'),
        ])
        if (cancelled) return
        const memberRoles = Array.from(
          new Set((memberData ?? []).map((r: { role: ProjectRole }) => r.role)),
        )
        const capSlugs = ((capData ?? []) as { capability_slug: string }[]).map((r) => r.capability_slug)
        setRoles(memberRoles)
        setCaps(new Set(capSlugs))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  const isDirector = user?.isDirector === true
  const can = (capability: string) => isDirector || caps.has(capability)
  const hasAny = (...candidates: ProjectRole[]) =>
    isDirector || candidates.some((c) => roles.includes(c))

  return {
    roles,
    caps,
    loading,
    isDirector,
    can,
    hasAny,
    canWriteLedger: can('write_ledger'),
    canViewFinanzas: can('write_ledger') || can('view_cashflow') || isDirector,
    canWriteLoans: can('write_loans'),
    canWriteContractors: can('write_contractors'),
    canWriteSuppliers: can('write_suppliers'),
    canWriteMaterialsCatalog: can('write_materials_catalog'),
    canWriteBankAccounts: can('write_bank_accounts'),
    canViewBankAccounts: can('write_bank_accounts') || can('mark_paid') || can('issue_check') || can('write_contractors'),
    canViewDirectorDashboard: can('view_director_dashboard'),
    canViewApprovalsLog: can('view_approvals_log'),
    canViewReportes: can('view_reportes'),
    canViewPriceHistory: can('view_price_history'),
    canCreateAnyRequisition: can('create_requisition'),
    canCreateProject: can('edit_project'),
    canManageUsers: can('manage_users'),
    canManageRoles: can('manage_roles'),
  }
}
