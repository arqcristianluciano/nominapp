import { useEffect, useState } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export type ProjectRole =
  | 'director_general'
  | 'director_proyecto'
  | 'planificacion'
  | 'ingeniero_obra'
  | 'supervisor_especializado'
  | 'comprador'
  | 'almacenista'
  | 'contabilidad'

export interface UseProjectRolesResult {
  roles: ProjectRole[]
  loading: boolean
  isDirector: boolean
  hasAny: (...candidates: ProjectRole[]) => boolean
  canApproveExcess: boolean       // planificacion | director_proyecto
  canReleasePurchaseOrder: boolean // director_proyecto
  canApprovePayroll: boolean       // director_proyecto
  canOverrideStock: boolean        // director_proyecto
  canEditBudget: boolean           // planificacion | director_proyecto
}

const DEMO_FALLBACK: ProjectRole[] = [
  'director_proyecto',
  'planificacion',
  'ingeniero_obra',
  'comprador',
  'almacenista',
]

// En modo demo todos tienen todos los roles para no bloquear la UX local.
// En producción consulta project_members.
export function useProjectRoles(projectId: string | undefined): UseProjectRolesResult {
  const user = useAuthStore((s) => s.user)
  const [roles, setRoles] = useState<ProjectRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!projectId || !user) {
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
          .eq('project_id', projectId)
          .eq('user_id', user.id)
        if (cancelled) return
        const list = (data ?? []).map((r: { role: ProjectRole }) => r.role)
        setRoles(list)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [projectId, user])

  const isDirector = user?.isDirector === true
  const hasAny = (...candidates: ProjectRole[]) =>
    isDirector || candidates.some((c) => roles.includes(c))

  return {
    roles,
    loading,
    isDirector,
    hasAny,
    canApproveExcess: hasAny('planificacion', 'director_proyecto'),
    canReleasePurchaseOrder: hasAny('director_proyecto'),
    canApprovePayroll: hasAny('director_proyecto'),
    canOverrideStock: hasAny('director_proyecto'),
    canEditBudget: hasAny('planificacion', 'director_proyecto'),
  }
}
