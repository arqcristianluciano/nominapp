import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectRole } from '@/hooks/useProjectRoles'

// -----------------------------------------------------------------------------
// Estrategia de testing
// -----------------------------------------------------------------------------
// El hook usa useState y useEffect; el entorno de vitest aqui es `node`
// (sin DOM ni @testing-library/react). Para poder invocar useAppRoles() de
// forma sincronica desde un test plain, mockeamos React.useState para que
// devuelva los valores controlados por cada caso (roles, caps, loading) y
// React.useEffect como no-op (no necesitamos correr el effect porque la
// "fuente de verdad" del estado la inyectamos nosotros via useState).
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
    useState: <T,>(initial: T | (() => T)) => {
      const next = stateQueue.length > 0 ? (stateQueue.shift() as T) : (typeof initial === 'function' ? (initial as () => T)() : initial)
      return [next, vi.fn()] as [T, (v: T) => void]
    },
    useEffect: vi.fn(),
  }
})

// isDemoMode es controlable por test reescribiendo este flag.
let demoFlag = false
vi.mock('@/lib/supabase', () => ({
  isDemoMode: false,
  get supabase() {
    return {
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: [], error: null })) })) })),
      rpc: vi.fn(async () => ({ data: [], error: null })),
    }
  },
}))

// authStore se mockea como selector function-style: useAuthStore((s) => s.user)
let mockUser: { id: string; isDirector?: boolean } | null = null
vi.mock('@/stores/authStore', () => ({
  useAuthStore: <T,>(selector: (s: { user: typeof mockUser }) => T) => selector({ user: mockUser }),
}))

// Importar despues de mocks.
import { useAppRoles } from './useAppRoles'
import * as supabaseModule from '@/lib/supabase'

// Lista de caps en demo (debe matchear DEMO_CAPS del hook).
const EXPECTED_DEMO_CAPS = [
  'edit_project', 'edit_budget', 'create_payroll', 'edit_payroll', 'approve_payroll',
  'create_requisition', 'load_quotes', 'release_purchase_order', 'receive_order',
  'inventory_write', 'override_stock',
  'write_ledger', 'mark_paid', 'issue_check', 'write_loans', 'view_cashflow',
  'write_contractors', 'write_suppliers', 'write_materials_catalog', 'write_bank_accounts',
  'view_director_dashboard', 'view_approvals_log', 'view_reportes', 'view_price_history',
  'manage_users', 'manage_roles',
]

const EXPECTED_DEMO_ROLES: ProjectRole[] = [
  'director_proyecto', 'planificacion', 'ingeniero_obra',
  'comprador', 'almacenista', 'contabilidad',
]

/** Helper: arma el estado que useState devolvera para roles/caps/loading. */
function primeState(roles: ProjectRole[], caps: Set<string>, loading = false) {
  stateQueue.length = 0
  stateQueue.push(roles, caps, loading)
}

beforeEach(() => {
  stateQueue.length = 0
  mockUser = null
  demoFlag = false
  // Reseteamos isDemoMode en el modulo mock (siempre falso por defecto en node).
  ;(supabaseModule as unknown as { isDemoMode: boolean }).isDemoMode = demoFlag
})

describe('useAppRoles', () => {
  /* eslint-disable react-hooks/rules-of-hooks */
  it('1. demo mode retorna DEMO_CAPS y DEMO_ROLES (con isDemoMode + user activo)', () => {
    // Simulamos que el effect ya corrio y poblo state con DEMO_ROLES + DEMO_CAPS.
    mockUser = { id: 'demo-user' }
    ;(supabaseModule as unknown as { isDemoMode: boolean }).isDemoMode = true
    primeState(EXPECTED_DEMO_ROLES, new Set(EXPECTED_DEMO_CAPS), false)

    const result = useAppRoles()

    expect(result.roles).toEqual(EXPECTED_DEMO_ROLES)
    // Validamos que TODAS las caps esperadas estan presentes.
    for (const cap of EXPECTED_DEMO_CAPS) {
      expect(result.caps.has(cap)).toBe(true)
    }
    // Sanity: el tamano coincide.
    expect(result.caps.size).toBe(EXPECTED_DEMO_CAPS.length)
  })

  it('2. isDirector=true: can("anything")=true y todos los flags derivados true', () => {
    mockUser = { id: 'director-user', isDirector: true }
    // Director no necesita caps: el getter `can` corta por isDirector primero.
    primeState([], new Set(), false)

    const result = useAppRoles()

    expect(result.isDirector).toBe(true)
    expect(result.can('anything')).toBe(true)
    expect(result.can('totally_made_up_capability_xyz')).toBe(true)
    // hasAny tambien debe ser true sin importar roles.
    expect(result.hasAny('contabilidad')).toBe(true)

    // Todos los flags derivados true.
    expect(result.canWriteLedger).toBe(true)
    expect(result.canViewFinanzas).toBe(true)
    expect(result.canWriteLoans).toBe(true)
    expect(result.canWriteContractors).toBe(true)
    expect(result.canWriteSuppliers).toBe(true)
    expect(result.canWriteMaterialsCatalog).toBe(true)
    expect(result.canWriteBankAccounts).toBe(true)
    expect(result.canViewBankAccounts).toBe(true)
    expect(result.canViewDirectorDashboard).toBe(true)
    expect(result.canViewApprovalsLog).toBe(true)
    expect(result.canViewReportes).toBe(true)
    expect(result.canViewPriceHistory).toBe(true)
    expect(result.canCreateAnyRequisition).toBe(true)
    expect(result.canCreateProject).toBe(true)
    expect(result.canManageUsers).toBe(true)
    expect(result.canManageRoles).toBe(true)
  })

  it('3. usuario sin roles ni caps: todos los flags en false, canManageUsers=false', () => {
    mockUser = { id: 'plain-user', isDirector: false }
    primeState([], new Set(), false)

    const result = useAppRoles()

    expect(result.isDirector).toBe(false)
    expect(result.canManageUsers).toBe(false)
    expect(result.canManageRoles).toBe(false)
    expect(result.canWriteLedger).toBe(false)
    expect(result.canViewFinanzas).toBe(false)
    expect(result.canWriteLoans).toBe(false)
    expect(result.canWriteContractors).toBe(false)
    expect(result.canWriteSuppliers).toBe(false)
    expect(result.canWriteMaterialsCatalog).toBe(false)
    expect(result.canWriteBankAccounts).toBe(false)
    expect(result.canViewBankAccounts).toBe(false)
    expect(result.canViewDirectorDashboard).toBe(false)
    expect(result.canViewApprovalsLog).toBe(false)
    expect(result.canViewReportes).toBe(false)
    expect(result.canViewPriceHistory).toBe(false)
    expect(result.canCreateAnyRequisition).toBe(false)
    expect(result.canCreateProject).toBe(false)
    expect(result.can('whatever')).toBe(false)
    expect(result.hasAny('contabilidad')).toBe(false)
  })

  it('4. usuario con cap "write_ledger": canWriteLedger=true', () => {
    mockUser = { id: 'ledger-user', isDirector: false }
    primeState([], new Set(['write_ledger']), false)

    const result = useAppRoles()

    expect(result.canWriteLedger).toBe(true)
    // Y por composicion, canViewFinanzas tambien (write_ledger es uno de los OR).
    expect(result.canViewFinanzas).toBe(true)
    // Pero caps NO relacionadas siguen false.
    expect(result.canWriteLoans).toBe(false)
    expect(result.canManageUsers).toBe(false)
  })

  it('5. canViewFinanzas=true si tiene write_ledger OR view_cashflow OR isDirector', () => {
    // (a) solo write_ledger
    mockUser = { id: 'u-a', isDirector: false }
    primeState([], new Set(['write_ledger']), false)
    expect(useAppRoles().canViewFinanzas).toBe(true)

    // (b) solo view_cashflow
    mockUser = { id: 'u-b', isDirector: false }
    primeState([], new Set(['view_cashflow']), false)
    expect(useAppRoles().canViewFinanzas).toBe(true)

    // (c) ninguno de los dos, no director → false
    mockUser = { id: 'u-c', isDirector: false }
    primeState([], new Set(['mark_paid']), false)
    expect(useAppRoles().canViewFinanzas).toBe(false)

    // (d) isDirector aunque caps vacias → true
    mockUser = { id: 'u-d', isDirector: true }
    primeState([], new Set(), false)
    expect(useAppRoles().canViewFinanzas).toBe(true)
  })

  it('6. canViewBankAccounts=true si tiene write_bank_accounts OR mark_paid OR issue_check OR write_contractors', () => {
    const trueCases = ['write_bank_accounts', 'mark_paid', 'issue_check', 'write_contractors']
    for (const cap of trueCases) {
      mockUser = { id: `bank-${cap}`, isDirector: false }
      primeState([], new Set([cap]), false)
      const result = useAppRoles()
      expect(result.canViewBankAccounts, `cap=${cap} debe activar canViewBankAccounts`).toBe(true)
    }

    // Caso negativo: una cap ajena no la activa.
    mockUser = { id: 'bank-neg', isDirector: false }
    primeState([], new Set(['view_cashflow']), false)
    expect(useAppRoles().canViewBankAccounts).toBe(false)
  })
})
