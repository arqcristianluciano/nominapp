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
  caps: Set<string>
  loading: boolean
  isDirector: boolean
  can: (capability: string) => boolean
  hasAny: (...candidates: ProjectRole[]) => boolean

  // Seccion 1
  canEditProject: boolean
  canEditBudget: boolean
  canEditPriceList: boolean
  canEditInsumos: boolean
  canEditIndirects: boolean

  // Seccion 2
  canCreatePayroll: boolean
  canEditPayrollDraft: boolean
  canSubmitPayroll: boolean
  canApprovePayroll: boolean
  canDistributePayments: boolean
  canDeletePayrollDraft: boolean

  // Seccion 3
  canCreateRequisition: boolean
  canLoadQuotes: boolean
  canApproveExcess: boolean
  canReleasePurchaseOrder: boolean
  canReceiveOrder: boolean

  // Seccion 4
  canInventoryWrite: boolean
  canOverrideStock: boolean

  // Seccion 5
  canWriteBitacora: boolean
  canWriteAttendance: boolean
  canWriteQuality: boolean
  canMeasureProgress: boolean
  canWriteSchedule: boolean

  // Seccion 6
  canCreateContract: boolean
  canEditContractPartidas: boolean
  canSignContract: boolean
  canCreateCorte: boolean
  canApproveCorte: boolean
  canWriteAdelantos: boolean
}

const DEMO_CAPS = new Set([
  'edit_project',
  'edit_budget',
  'edit_price_list',
  'edit_insumos',
  'write_project_indirects',
  'create_payroll',
  'edit_payroll',
  'submit_payroll',
  'approve_payroll',
  'distribute_payments',
  'delete_payroll_draft',
  'create_requisition',
  'load_quotes',
  'approve_excess',
  'release_purchase_order',
  'receive_order',
  'inventory_write',
  'override_stock',
  'write_bitacora',
  'write_attendance',
  'write_quality',
  'measure_progress',
  'write_schedule',
  'create_contract',
  'edit_contract_partidas',
  'create_corte',
  'approve_corte',
  'sign_contract',
  'write_adelantos',
  'view_cashflow',
  'write_ledger',
  'mark_paid',
  'issue_check',
  'write_loans',
  'write_contractors',
  'write_suppliers',
  'write_materials_catalog',
  'write_bank_accounts',
])

const DEMO_ROLES: ProjectRole[] = ['director_proyecto', 'planificacion', 'ingeniero_obra', 'comprador', 'almacenista']

// Carga las capabilities del usuario para el proyecto via RPC y deriva
// flags por accion. La matriz de permisos vive en BD (roles +
// role_capabilities) — cambios desde /admin/usuarios toman efecto al
// recargar el hook.
export function useProjectRoles(projectId: string | undefined): UseProjectRolesResult {
  const user = useAuthStore((s) => s.user)
  const [roles, setRoles] = useState<ProjectRole[]>([])
  const [caps, setCaps] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!projectId || !user) {
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
          supabase.from('project_members').select('role').eq('project_id', projectId).eq('user_id', user.id),
          supabase.rpc('user_project_capabilities', { p_project_id: projectId }),
        ])
        if (cancelled) return
        const memberRoles = (memberData ?? []).map((r: { role: ProjectRole }) => r.role)
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
  }, [projectId, user])

  const isDirector = user?.isDirector === true
  const can = (capability: string) => isDirector || caps.has(capability)
  const hasAny = (...candidates: ProjectRole[]) => isDirector || candidates.some((c) => roles.includes(c))

  return {
    roles,
    caps,
    loading,
    isDirector,
    can,
    hasAny,

    canEditProject: can('edit_project'),
    canEditBudget: can('edit_budget'),
    canEditPriceList: can('edit_price_list'),
    canEditInsumos: can('edit_insumos'),
    canEditIndirects: can('write_project_indirects') || can('edit_project'),

    canCreatePayroll: can('create_payroll'),
    canEditPayrollDraft: can('edit_payroll'),
    canSubmitPayroll: can('submit_payroll'),
    canApprovePayroll: can('approve_payroll'),
    canDistributePayments: can('distribute_payments'),
    canDeletePayrollDraft: can('delete_payroll_draft'),

    canCreateRequisition: can('create_requisition'),
    canLoadQuotes: can('load_quotes'),
    canApproveExcess: can('approve_excess'),
    canReleasePurchaseOrder: can('release_purchase_order'),
    canReceiveOrder: can('receive_order'),

    canInventoryWrite: can('inventory_write'),
    canOverrideStock: can('override_stock'),

    canWriteBitacora: can('write_bitacora'),
    canWriteAttendance: can('write_attendance'),
    canWriteQuality: can('write_quality'),
    canMeasureProgress: can('measure_progress'),
    canWriteSchedule: can('write_schedule'),

    canCreateContract: can('create_contract'),
    canEditContractPartidas: can('edit_contract_partidas'),
    canSignContract: can('sign_contract'),
    canCreateCorte: can('create_corte'),
    canApproveCorte: can('approve_corte'),
    canWriteAdelantos: can('write_adelantos'),
  }
}
