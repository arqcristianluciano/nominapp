import { useEffect, useState } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { ProjectRole } from '@/hooks/useProjectRoles'

export interface UseAppRolesResult {
  roles: ProjectRole[]
  loading: boolean
  isDirector: boolean
  hasAny: (...candidates: ProjectRole[]) => boolean

  // Seccion 7 - Finanzas
  canWriteLedger: boolean       // DG, CT  (libro diario / CxP / cheques)
  canViewFinanzas: boolean      // DG, DP, CT  (leer libro diario, CxP, flujo de caja)
  canWriteLoans: boolean        // solo DG  (prestamos a contratistas)

  // Seccion 8 - Maestros (app-wide)
  canWriteContractors: boolean        // DG, CO
  canWriteSuppliers: boolean          // DG, CO
  canWriteMaterialsCatalog: boolean   // DG, CO
  canWriteBankAccounts: boolean       // DG, CT
  canViewBankAccounts: boolean        // DG, DP, CO, CT

  // Seccion 9 - Cross-empresa (solo DG)
  canViewDirectorDashboard: boolean   // solo DG
  canViewApprovalsLog: boolean        // solo DG
  canViewReportes: boolean            // solo DG
  canViewPriceHistory: boolean        // solo DG

  // Acciones app-wide derivadas (atajos cuando la accion abre selector de proyecto)
  canCreateAnyRequisition: boolean    // DG, IO
}

// Roles que el modo demo asume para todos.
const DEMO_FALLBACK: ProjectRole[] = [
  'director_proyecto',
  'planificacion',
  'ingeniero_obra',
  'comprador',
  'almacenista',
  'contabilidad',
]

/**
 * Capacidades app-wide (no atadas a un proyecto). Inspecciona TODOS los
 * roles del usuario en project_members y devuelve flags por accion, segun
 * la matriz de permisos v2. Para acciones por proyecto, usar
 * useProjectRoles(projectId).
 */
export function useAppRoles(): UseAppRolesResult {
  const user = useAuthStore((s) => s.user)
  const [roles, setRoles] = useState<ProjectRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) {
        if (!cancelled) {
          setRoles([])
          setLoading(false)
        }
        return
      }
      if (isDemoMode) {
        if (!cancelled) {
          setRoles(DEMO_FALLBACK)
          setLoading(false)
        }
        return
      }
      try {
        const { data } = await supabase
          .from('project_members')
          .select('role')
          .eq('user_id', user.id)
        if (cancelled) return
        const list = Array.from(
          new Set((data ?? []).map((r: { role: ProjectRole }) => r.role)),
        )
        setRoles(list)
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
  const hasAny = (...candidates: ProjectRole[]) =>
    isDirector || candidates.some((c) => roles.includes(c))

  return {
    roles,
    loading,
    isDirector,
    hasAny,
    canWriteLedger: hasAny('contabilidad'),
    canViewFinanzas: hasAny('director_proyecto', 'contabilidad'),
    canWriteLoans: isDirector,
    canWriteContractors: hasAny('comprador'),
    canWriteSuppliers: hasAny('comprador'),
    canWriteMaterialsCatalog: hasAny('comprador'),
    canWriteBankAccounts: hasAny('contabilidad'),
    canViewBankAccounts: hasAny('director_proyecto', 'comprador', 'contabilidad'),
    canViewDirectorDashboard: isDirector,
    canViewApprovalsLog: isDirector,
    canViewReportes: isDirector,
    canViewPriceHistory: isDirector,
    canCreateAnyRequisition: hasAny('ingeniero_obra'),
  }
}
