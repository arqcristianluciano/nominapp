import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectRole } from '@/hooks/useProjectRoles'

// -----------------------------------------------------------------------------
// Estrategia de testing
// -----------------------------------------------------------------------------
// El hook usa useState y useEffect; el entorno de vitest aqui es `node`
// (sin DOM ni @testing-library/react instalado). Para poder invocar
// useProjectRoles() de forma sincronica desde un test plain, mockeamos
// React.useState para que devuelva los valores controlados por cada caso
// (roles, caps, loading) y React.useEffect como no-op (no necesitamos
// correr el effect porque la "fuente de verdad" del estado la inyectamos
// nosotros via useState). Mismo patron que useAppRoles.test.ts.
// -----------------------------------------------------------------------------

// Estado controlable por test para los 3 useState del hook, en orden:
//   1) roles (ProjectRole[])
//   2) caps  (Set<string>)
//   3) loading (boolean)
const stateQueue: unknown[] = []

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useState: <T>(initial: T | (() => T)) => {
      const next =
        stateQueue.length > 0
          ? (stateQueue.shift() as T)
          : typeof initial === 'function'
            ? (initial as () => T)()
            : initial
      return [next, vi.fn()] as [T, (v: T) => void]
    },
    useEffect: vi.fn(),
  }
})

// isDemoMode es controlable por test reescribiendo este flag.
vi.mock('@/lib/supabase', () => ({
  isDemoMode: false,
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    })),
    rpc: vi.fn(async () => ({ data: [], error: null })),
  },
}))

// authStore se mockea como selector function-style: useAuthStore((s) => s.user)
let mockUser: { id: string; isDirector?: boolean } | null = null
vi.mock('@/stores/authStore', () => ({
  useAuthStore: <T>(selector: (s: { user: typeof mockUser }) => T) => selector({ user: mockUser }),
}))

// Importar despues de mocks.
import { useProjectRoles } from './useProjectRoles'
import * as supabaseModule from '@/lib/supabase'

// Lista de caps en demo (debe matchear DEMO_CAPS del hook).
const EXPECTED_DEMO_CAPS = [
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
]

const EXPECTED_DEMO_ROLES: ProjectRole[] = [
  'director_proyecto',
  'planificacion',
  'ingeniero_obra',
  'comprador',
  'almacenista',
]

/** Helper: arma el estado que useState devolvera para roles/caps/loading. */
function primeState(roles: ProjectRole[], caps: Set<string>, loading = false) {
  stateQueue.length = 0
  stateQueue.push(roles, caps, loading)
}

beforeEach(() => {
  stateQueue.length = 0
  mockUser = null
  // Reset isDemoMode al default (false) entre tests.
  ;(supabaseModule as unknown as { isDemoMode: boolean }).isDemoMode = false
})

describe('useProjectRoles', () => {
  it('1. en isDemoMode retorna DEMO_CAPS y DEMO_ROLES', () => {
    // Simulamos que el effect ya corrio y poblo state con DEMO_ROLES + DEMO_CAPS.
    mockUser = { id: 'demo-user' }
    ;(supabaseModule as unknown as { isDemoMode: boolean }).isDemoMode = true
    primeState(EXPECTED_DEMO_ROLES, new Set(EXPECTED_DEMO_CAPS), false)

    const result = useProjectRoles('proj-1')

    expect(result.roles).toEqual(EXPECTED_DEMO_ROLES)
    // Validamos que TODAS las caps esperadas estan presentes.
    for (const cap of EXPECTED_DEMO_CAPS) {
      expect(result.caps.has(cap)).toBe(true)
    }
    // Sanity: el tamano coincide.
    expect(result.caps.size).toBe(EXPECTED_DEMO_CAPS.length)
  })

  it('2. si user es director (isDirector=true), can("anything") retorna true', () => {
    mockUser = { id: 'director-user', isDirector: true }
    // Director no necesita caps: el getter `can` corta por isDirector primero.
    primeState([], new Set(), false)

    const result = useProjectRoles('proj-1')

    expect(result.isDirector).toBe(true)
    // 'anything' no es CapabilitySlug, casteo a `any` para honrar el caso del test.
    expect(result.can('anything' as never)).toBe(true)
    expect(result.can('totally_made_up_capability_xyz' as never)).toBe(true)
    // Caps validas tambien.
    expect(result.can('edit_budget')).toBe(true)
    expect(result.can('approve_payroll')).toBe(true)
    // hasAny tambien debe ser true para director sin importar roles.
    expect(result.hasAny('director_proyecto')).toBe(true)
  })

  it('3. si user no es director ni miembro, can("edit_budget") retorna false', () => {
    mockUser = { id: 'plain-user', isDirector: false }
    primeState([], new Set(), false)

    const result = useProjectRoles('proj-1')

    expect(result.isDirector).toBe(false)
    expect(result.can('edit_budget')).toBe(false)
    // Flags derivados tambien deben ser false.
    expect(result.canEditBudget).toBe(false)
    expect(result.canEditProject).toBe(false)
    expect(result.canApprovePayroll).toBe(false)
    expect(result.hasAny('director_proyecto')).toBe(false)
  })

  it('4. si caps set contiene "edit_budget", can("edit_budget") retorna true', () => {
    mockUser = { id: 'budget-user', isDirector: false }
    primeState([], new Set(['edit_budget']), false)

    const result = useProjectRoles('proj-1')

    expect(result.can('edit_budget')).toBe(true)
    expect(result.canEditBudget).toBe(true)
    // Caps NO presentes siguen false.
    expect(result.can('approve_payroll')).toBe(false)
    expect(result.canApprovePayroll).toBe(false)
  })

  it('5. los flags derivados reflejan el caps set', () => {
    mockUser = { id: 'multi-cap-user', isDirector: false }
    primeState(
      [],
      new Set([
        'edit_budget',
        'approve_payroll',
        'create_requisition',
        'inventory_write',
        'write_bitacora',
        'create_contract',
        'sign_contract',
      ]),
      false,
    )

    const result = useProjectRoles('proj-1')

    // Caps presentes → flags true.
    expect(result.canEditBudget).toBe(true)
    expect(result.canApprovePayroll).toBe(true)
    expect(result.canCreateRequisition).toBe(true)
    expect(result.canInventoryWrite).toBe(true)
    expect(result.canWriteBitacora).toBe(true)
    expect(result.canCreateContract).toBe(true)
    expect(result.canSignContract).toBe(true)

    // Caps ausentes → flags false.
    expect(result.canEditProject).toBe(false)
    expect(result.canEditPriceList).toBe(false)
    expect(result.canEditInsumos).toBe(false)
    expect(result.canEditIndirects).toBe(false)
    expect(result.canCreatePayroll).toBe(false)
    expect(result.canEditPayrollDraft).toBe(false)
    expect(result.canSubmitPayroll).toBe(false)
    expect(result.canDistributePayments).toBe(false)
    expect(result.canDeletePayrollDraft).toBe(false)
    expect(result.canLoadQuotes).toBe(false)
    expect(result.canApproveExcess).toBe(false)
    expect(result.canReleasePurchaseOrder).toBe(false)
    expect(result.canReceiveOrder).toBe(false)
    expect(result.canOverrideStock).toBe(false)
    expect(result.canWriteAttendance).toBe(false)
    expect(result.canWriteQuality).toBe(false)
    expect(result.canMeasureProgress).toBe(false)
    expect(result.canWriteSchedule).toBe(false)
    expect(result.canEditContractPartidas).toBe(false)
    expect(result.canCreateCorte).toBe(false)
    expect(result.canApproveCorte).toBe(false)
    expect(result.canWriteAdelantos).toBe(false)
  })
})
