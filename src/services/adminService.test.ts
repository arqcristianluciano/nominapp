import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---- Mock supabase como objeto con chainables ---------------------------
//
// Cada metodo terminal (select/insert/update/delete/upsert/eq/order/single)
// retorna `chain` para encadenarse. El resultado final (`{ data, error }`)
// se modela como un thenable: al hacer `await` sobre el chain se devuelve
// `_result`, que cada test sobreescribe segun el caso.

interface ChainResult<T = unknown> {
  data: T | null
  error: { code?: string; message?: string } | null
}

interface Chain {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  then: (resolve: (value: ChainResult) => unknown) => unknown
  _result: ChainResult
}

const chain: Chain = {
  select: vi.fn(() => chain),
  insert: vi.fn(() => chain),
  update: vi.fn(() => chain),
  delete: vi.fn(() => chain),
  upsert: vi.fn(() => chain),
  eq: vi.fn(() => chain),
  order: vi.fn(() => chain),
  single: vi.fn(() => chain),
  // Thenable: permite `await chain` resolviendo `_result`.
  then: (resolve) => resolve(chain._result),
  _result: { data: null, error: null },
}

const from = vi.fn(() => chain)
const invoke = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: Parameters<typeof from>) => from(...args),
    functions: { invoke: (...args: Parameters<typeof invoke>) => invoke(...args) },
  },
}))

// Import despues del mock para que el servicio reciba el modulo mockeado.
import { adminService } from './adminService'

beforeEach(() => {
  chain.select.mockClear()
  chain.insert.mockClear()
  chain.update.mockClear()
  chain.delete.mockClear()
  chain.upsert.mockClear()
  chain.eq.mockClear()
  chain.order.mockClear()
  chain.single.mockClear()
  from.mockClear()
  invoke.mockClear()
  chain._result = { data: null, error: null }

  // Re-encadenar (vi mantiene la implementacion pero conviene asegurarlo).
  chain.select.mockImplementation(() => chain)
  chain.insert.mockImplementation(() => chain)
  chain.update.mockImplementation(() => chain)
  chain.delete.mockImplementation(() => chain)
  chain.upsert.mockImplementation(() => chain)
  chain.eq.mockImplementation(() => chain)
  chain.order.mockImplementation(() => chain)
  chain.single.mockImplementation(() => chain)
})

describe('adminService.listRoles', () => {
  it('mapea data correctamente y la retorna como Role[]', async () => {
    const fakeRoles = [
      {
        id: 'r1',
        slug: 'director',
        name: 'Director',
        description: null,
        is_system: true,
        is_director: true,
        created_at: '2026-01-01',
      },
      {
        id: 'r2',
        slug: 'comprador',
        name: 'Comprador',
        description: 'compras',
        is_system: false,
        is_director: false,
        created_at: '2026-01-02',
      },
    ]
    chain._result = { data: fakeRoles, error: null }

    const roles = await adminService.listRoles()

    expect(from).toHaveBeenCalledWith('roles')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.order).toHaveBeenCalledWith('is_system', { ascending: false })
    expect(chain.order).toHaveBeenCalledWith('name')
    expect(roles).toEqual(fakeRoles)
    expect(roles).toHaveLength(2)
  })

  it('retorna [] cuando data es null', async () => {
    chain._result = { data: null, error: null }
    const roles = await adminService.listRoles()
    expect(roles).toEqual([])
  })
})

describe('adminService.createRole', () => {
  it('envia is_system=false e is_director=false en el insert', async () => {
    const created = {
      id: 'r-new',
      slug: 'almacenista',
      name: 'Almacenista',
      description: null,
      is_system: false,
      is_director: false,
      created_at: '2026-05-21',
    }
    chain._result = { data: created, error: null }

    const result = await adminService.createRole({
      slug: 'almacenista',
      name: 'Almacenista',
    })

    expect(from).toHaveBeenCalledWith('roles')
    // createRole hace 2 inserts: el de roles + fire-and-forget al approvals log
    expect(chain.insert).toHaveBeenCalledWith({
      slug: 'almacenista',
      name: 'Almacenista',
      description: null,
      is_system: false,
      is_director: false,
    })
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.single).toHaveBeenCalledTimes(1)
    expect(result).toEqual(created)
  })
})

describe('adminService.deleteRole', () => {
  it('borra por id y llama delete + eq("id", id)', async () => {
    chain._result = { data: null, error: null }

    await adminService.deleteRole('role-123')

    expect(from).toHaveBeenCalledWith('roles')
    expect(chain.delete).toHaveBeenCalledTimes(1)
    expect(chain.eq).toHaveBeenCalledWith('id', 'role-123')
  })

  it('lanza si el delete devuelve error', async () => {
    chain._result = {
      data: null,
      error: { code: '500', message: 'boom' },
    }
    await expect(adminService.deleteRole('role-x')).rejects.toMatchObject({
      message: 'boom',
    })
  })
})

describe('adminService.grantCapability', () => {
  it('ignora silenciosamente el error 23505 (duplicate key)', async () => {
    chain._result = {
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    }
    await expect(adminService.grantCapability('role-1', 'cap-1')).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('role_capabilities')
    expect(chain.insert).toHaveBeenCalledWith({
      role_id: 'role-1',
      capability_id: 'cap-1',
    })
  })

  it('lanza cuando el error NO es 23505', async () => {
    chain._result = {
      data: null,
      error: { code: '42501', message: 'permission denied' },
    }
    await expect(adminService.grantCapability('role-1', 'cap-1')).rejects.toMatchObject({ code: '42501' })
  })
})

describe('adminService.assignProjectRole', () => {
  it('hace upsert con { user_id, project_id, role: ProjectRole }', async () => {
    chain._result = { data: null, error: null }

    await adminService.assignProjectRole('u-1', 'p-1', 'comprador')

    expect(from).toHaveBeenCalledWith('project_members')
    expect(chain.upsert).toHaveBeenCalledTimes(1)
    expect(chain.upsert).toHaveBeenCalledWith({
      user_id: 'u-1',
      project_id: 'p-1',
      role: 'comprador',
    })
  })
})

describe('adminService.removeProjectRole', () => {
  it('borra por triple clave (user_id, project_id, role)', async () => {
    chain._result = { data: null, error: null }

    await adminService.removeProjectRole('u-9', 'p-9', 'almacenista')

    expect(from).toHaveBeenCalledWith('project_members')
    expect(chain.delete).toHaveBeenCalledTimes(1)
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u-9')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'p-9')
    expect(chain.eq).toHaveBeenCalledWith('role', 'almacenista')
    expect(chain.eq).toHaveBeenCalledTimes(3)
  })
})

describe('adminService.createUser', () => {
  it('invoca la edge function admin-create-user con el body completo', async () => {
    const body = {
      email: 'nuevo@nominapp.dev',
      password: 's3cret!',
      display_name: 'Nuevo Usuario',
      first_name: 'Nuevo',
      last_name: 'Usuario',
      cedula: '001-1234567-8',
      passport: undefined as unknown as string,
      phone: '+18095551234',
      job_title: 'Comprador',
      hire_date: '2026-05-21',
      salary: 45000,
      payment_terms: 'quincenal',
    }
    invoke.mockResolvedValueOnce({
      data: { id: 'user-new', email: body.email },
      error: null,
    })

    const result = await adminService.createUser(body)

    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('admin-create-user', { body })
    expect(result).toEqual({ id: 'user-new', email: body.email })
  })

  it('lanza el error que devuelve la edge function', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'service_role missing' },
    })

    await expect(
      adminService.createUser({
        email: 'a@b.com',
        password: 'x',
        display_name: 'A',
      }),
    ).rejects.toMatchObject({ message: 'service_role missing' })
  })
})
