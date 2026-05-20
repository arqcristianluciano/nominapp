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

  // Seccion 1 - Proyecto y presupuesto
  canEditProject: boolean        // DG, DP, PL  (+ CO para % indirectos)
  canEditBudget: boolean         // DG, DP, PL
  canEditPriceList: boolean      // DG, DP, PL
  canEditInsumos: boolean        // DG, DP, PL
  canEditIndirects: boolean      // DG, DP, PL, CO  (% indirectos del proyecto)

  // Seccion 2 - Nomina
  canCreatePayroll: boolean      // DG, DP, IO
  canEditPayrollDraft: boolean   // DG, DP, IO
  canSubmitPayroll: boolean      // DG, DP, IO
  canApprovePayroll: boolean     // DG, DP
  canDistributePayments: boolean // DG, DP
  canDeletePayrollDraft: boolean // DG, DP

  // Seccion 3 - Compras
  canCreateRequisition: boolean    // DG, IO
  canLoadQuotes: boolean           // DG, CO
  canApproveExcess: boolean        // DG, PL, CO
  canReleasePurchaseOrder: boolean // DG, DP
  canReceiveOrder: boolean         // DG, DP, IO, AL

  // Seccion 4 - Almacen
  canInventoryWrite: boolean // entrada+salida          // DG, DP, AL
  canOverrideStock: boolean  // forzar salida negativa  // DG, DP, AL

  // Seccion 5 - Obra
  canWriteBitacora: boolean        // DG, DP, IO
  canWriteAttendance: boolean      // DG, DP, IO
  canWriteQuality: boolean         // DG, IO
  canMeasureProgress: boolean      // DG, PL, IO
  canWriteSchedule: boolean        // DG, PL

  // Seccion 6 - Cubicaciones
  canCreateContract: boolean       // DG, DP, CO
  canEditContractPartidas: boolean // DG, DP, CO
  canSignContract: boolean         // DG, DP, CO
  canCreateCorte: boolean          // DG, DP, IO
  canApproveCorte: boolean         // DG, DP
  canWriteAdelantos: boolean       // DG, DP
}

const DEMO_FALLBACK: ProjectRole[] = [
  'director_proyecto',
  'planificacion',
  'ingeniero_obra',
  'comprador',
  'almacenista',
]

// En modo demo todos tienen todos los roles para no bloquear la UX local.
// En produccion consulta project_members.
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

    // Seccion 1
    canEditProject: hasAny('director_proyecto', 'planificacion'),
    canEditBudget: hasAny('director_proyecto', 'planificacion'),
    canEditPriceList: hasAny('director_proyecto', 'planificacion'),
    canEditInsumos: hasAny('director_proyecto', 'planificacion'),
    canEditIndirects: hasAny('director_proyecto', 'planificacion', 'comprador'),

    // Seccion 2
    canCreatePayroll: hasAny('director_proyecto', 'ingeniero_obra'),
    canEditPayrollDraft: hasAny('director_proyecto', 'ingeniero_obra'),
    canSubmitPayroll: hasAny('director_proyecto', 'ingeniero_obra'),
    canApprovePayroll: hasAny('director_proyecto'),
    canDistributePayments: hasAny('director_proyecto'),
    canDeletePayrollDraft: hasAny('director_proyecto'),

    // Seccion 3
    canCreateRequisition: hasAny('ingeniero_obra'),
    canLoadQuotes: hasAny('comprador'),
    canApproveExcess: hasAny('planificacion', 'comprador'),
    canReleasePurchaseOrder: hasAny('director_proyecto'),
    canReceiveOrder: hasAny('director_proyecto', 'ingeniero_obra', 'almacenista'),

    // Seccion 4
    canInventoryWrite: hasAny('director_proyecto', 'almacenista'),
    canOverrideStock: hasAny('director_proyecto', 'almacenista'),

    // Seccion 5
    canWriteBitacora: hasAny('director_proyecto', 'ingeniero_obra'),
    canWriteAttendance: hasAny('director_proyecto', 'ingeniero_obra'),
    canWriteQuality: hasAny('ingeniero_obra'),
    canMeasureProgress: hasAny('planificacion', 'ingeniero_obra'),
    canWriteSchedule: hasAny('planificacion'),

    // Seccion 6
    canCreateContract: hasAny('director_proyecto', 'comprador'),
    canEditContractPartidas: hasAny('director_proyecto', 'comprador'),
    canSignContract: hasAny('director_proyecto', 'comprador'),
    canCreateCorte: hasAny('director_proyecto', 'ingeniero_obra'),
    canApproveCorte: hasAny('director_proyecto'),
    canWriteAdelantos: hasAny('director_proyecto'),
  }
}
