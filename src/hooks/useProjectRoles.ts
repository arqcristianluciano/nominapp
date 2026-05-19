import { useEffect, useState } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export type ProjectRole =
  | 'director_general'
  | 'gerente_proyecto'
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
  canApproveExcess: boolean       // planificacion | gerente_proyecto
  canReleasePurchaseOrder: boolean // gerente_proyecto
  canApprovePayroll: boolean       // gerente_proyecto
  canOverrideStock: boolean        // gerente_proyecto
  canEditBudget: boolean           // planificacion | gerente_proyecto
}

const DEMO_FALLBACK: ProjectRole[] = [
  'gerente_proyecto',
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
    canApproveExcess: hasAny('planificacion', 'gerente_proyecto'),
    canReleasePurchaseOrder: hasAny('gerente_proyecto'),
    canApprovePayroll: hasAny('gerente_proyecto'),
    canOverrideStock: hasAny('gerente_proyecto'),
    canEditBudget: hasAny('planificacion', 'gerente_proyecto'),
  }
}
