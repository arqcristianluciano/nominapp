import { supabase } from '@/lib/supabase'
import type { ProjectRole } from '@/hooks/useProjectRoles'

export interface Role {
  id: string
  slug: string
  name: string
  description: string | null
  is_system: boolean
  is_director: boolean
  created_at: string
}

export interface Capability {
  id: string
  slug: string
  name: string
  description: string | null
  section: string
  scope: 'project' | 'app'
  sort_order: number
}

export interface RoleCapability {
  role_id: string
  capability_id: string
}

export interface AdminUser {
  id: string
  display_name: string
  is_director: boolean
  first_name: string | null
  last_name: string | null
  cedula: string | null
  passport: string | null
  phone: string | null
  job_title: string | null
  hire_date: string | null
  is_active: boolean
  salary: number | null
  payment_terms: string | null
  bank_account_id: string | null
  email?: string | null
  project_memberships?: { project_id: string; role: ProjectRole }[]
}

export const adminService = {
  // -- Roles --------------------------------------------------------------
  async listRoles(): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name')
    if (error) throw error
    return (data ?? []) as Role[]
  },

  async createRole(input: { slug: string; name: string; description?: string }): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .insert({
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        is_system: false,
        is_director: false,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as Role
  },

  async updateRole(id: string, updates: Pick<Role, 'name' | 'description'>): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as Role
  },

  async deleteRole(id: string): Promise<void> {
    const { error } = await supabase.from('roles').delete().eq('id', id)
    if (error) throw error
  },

  // -- Capabilities --------------------------------------------------------
  async listCapabilities(): Promise<Capability[]> {
    const { data, error } = await supabase
      .from('capabilities')
      .select('*')
      .order('sort_order')
    if (error) throw error
    return (data ?? []) as Capability[]
  },

  // -- Role <-> Capability mappings ---------------------------------------
  async listRoleCapabilities(): Promise<RoleCapability[]> {
    const { data, error } = await supabase.from('role_capabilities').select('*')
    if (error) throw error
    return (data ?? []) as RoleCapability[]
  },

  async grantCapability(roleId: string, capabilityId: string): Promise<void> {
    const { error } = await supabase
      .from('role_capabilities')
      .insert({ role_id: roleId, capability_id: capabilityId })
    if (error && error.code !== '23505') throw error // ignorar duplicate
  },

  async revokeCapability(roleId: string, capabilityId: string): Promise<void> {
    const { error } = await supabase
      .from('role_capabilities')
      .delete()
      .eq('role_id', roleId)
      .eq('capability_id', capabilityId)
    if (error) throw error
  },

  // -- Usuarios -----------------------------------------------------------
  async listUsers(): Promise<AdminUser[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, project_memberships:project_members(project_id, role)')
      .order('is_active', { ascending: false })
      .order('display_name')
    if (error) throw error
    return (data ?? []) as AdminUser[]
  },

  async updateUserProfile(id: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    // No mandar campos derivados / relacionados
    const { project_memberships, email, ...patch } = updates as AdminUser & Record<string, unknown>
    void project_memberships
    void email
    const { data, error } = await supabase
      .from('user_profiles')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as AdminUser
  },

  async assignProjectRole(userId: string, projectId: string, role: ProjectRole): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .upsert({ user_id: userId, project_id: projectId, role })
    if (error) throw error
  },

  async removeProjectRole(userId: string, projectId: string, role: ProjectRole): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('role', role)
    if (error) throw error
  },

  /**
   * Crea un nuevo usuario via Edge Function admin-create-user (requiere
   * service_role en el server). Si la function no esta disponible
   * todavia, el llamador recibe el error y muestra un toast.
   */
  async createUser(input: {
    email: string
    password: string
    display_name: string
    first_name?: string
    last_name?: string
    cedula?: string
    passport?: string
    phone?: string
    job_title?: string
    hire_date?: string
    salary?: number
    payment_terms?: string
  }): Promise<{ id: string; email: string }> {
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: input })
    if (error) throw error
    return data as { id: string; email: string }
  },
}
